import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ReferenceEventCard } from '../components/ReferenceEventCard';
import { useEvents } from '../context/EventsContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { calculateDistanceKm } from '../utils/distance';
import {
  RootStackParamList,
  HyperlocalEvent,
  EventFormatFilter,
  DateFilterOption,
} from '../types';
import {
  determineEventAttendanceMode,
  isEventFreeNormalized,
  matchesDateOption,
  matchesMultiTokenSearch,
  calculatePersonalizedEventScore,
} from '../services/liveEventService';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');
const CARD_INTERVAL = 400; // card height + margin

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SEARCH_CATEGORIES = [
  'All',
  'Art Gallery',
  'Music',
  'Hackathons',
  'Workshops',
  'Meetups',
  'Parties',
];

const RADIUS_OPTIONS = ['All', '2 km', '5 km', '10 km', '25 km'] as const;

const FORMAT_OPTIONS: { id: EventFormatFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All Formats', icon: 'layers-outline' },
  { id: 'in_person', label: 'In-Person', icon: 'location-outline' },
  { id: 'online', label: 'Online', icon: 'videocam-outline' },
];

const DATE_OPTIONS: DateFilterOption[] = [
  'All Dates',
  'Today',
  'Tomorrow',
  'This Weekend',
  'This Week',
];

export const DiscoverScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { allEvents, isSaved, toggleSave, refreshEvents, refreshError } = useEvents();
  const { userCoordinates, locationName, discoveryAreas, selectedAreaId, setDiscoveryArea } = useLocation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedRadius, setSelectedRadius] = useState<string>('All');
  const [selectedFormat, setSelectedFormat] = useState<EventFormatFilter>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterOption>('All Dates');
  const [isFreeOnly, setIsFreeOnly] = useState<boolean>(false);
  const [isAreaModalVisible, setIsAreaModalVisible] = useState<boolean>(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Compute dynamic distances and format/price enrichment
  const eventsWithDistance = useMemo(() => {
    return allEvents.map((event) => {
      const dist = calculateDistanceKm(userCoordinates, event.coordinates);
      const attendanceMode = determineEventAttendanceMode(
        event.attendanceMode,
        event.isOnline,
        event.venue,
        event.address
      );
      const isOnline = attendanceMode === 'online';
      const isFree = isEventFreeNormalized(event.isFree, event.price);

      return {
        ...event,
        distanceKm: dist,
        attendanceMode,
        isOnline,
        isFree,
      };
    });
  }, [allEvents, userCoordinates]);

  // Combined Multi-Criteria Filtering
  const filteredEvents = useMemo(() => {
    return eventsWithDistance.filter((event) => {
      // 1. Category tag filter
      if (selectedTag !== 'All') {
        const tagLower = selectedTag.toLowerCase();
        const matchesTag =
          event.category.toLowerCase().includes(tagLower) ||
          event.title.toLowerCase().includes(tagLower) ||
          event.venue.toLowerCase().includes(tagLower) ||
          event.tagline.toLowerCase().includes(tagLower) ||
          (event.tags && event.tags.some((t) => t.toLowerCase().includes(tagLower)));
        if (!matchesTag) return false;
      }

      // 2. Tokenized Multi-Keyword Search (title, tagline, venue, category, organizer, description, tags)
      if (searchQuery.trim().length > 0) {
        if (!matchesMultiTokenSearch(event, searchQuery)) return false;
      }

      // 3. Free Only Filter
      if (isFreeOnly) {
        if (!event.isFree) return false;
      }

      // 4. Attendance Format Filter (All / In-Person / Online)
      // Unknown formats are preserved only in 'all' and omitted from specific online/in_person filters
      if (selectedFormat === 'online') {
        const isOnlineMatch = event.attendanceMode === 'online' || event.attendanceMode === 'hybrid';
        if (!isOnlineMatch) return false;
      } else if (selectedFormat === 'in_person') {
        const isInPersonMatch = event.attendanceMode === 'in_person' || event.attendanceMode === 'hybrid';
        if (!isInPersonMatch) return false;
      }

      // 5. Distance Radius Filter (Skipped for pure online events)
      if (selectedRadius !== 'All' && event.attendanceMode !== 'online') {
        const radiusKm = parseInt(selectedRadius.replace(' km', ''), 10);
        if (!isNaN(radiusKm) && event.distanceKm !== undefined) {
          if (event.distanceKm > radiusKm) return false;
        }
      }

      // 6. Dynamic Calendar Date Filter
      if (selectedDateFilter !== 'All Dates') {
        const matchesDate = matchesDateOption(event.date, selectedDateFilter);
        if (!matchesDate) return false;
      }

      return true;
    });
  }, [
    eventsWithDistance,
    selectedTag,
    searchQuery,
    isFreeOnly,
    selectedFormat,
    selectedRadius,
    selectedDateFilter,
  ]);

  // Deterministic Personalized Ranking & Relevance Explanations
  const scoredEvents = useMemo(() => {
    const rawInterests = user?.interests || [];

    return filteredEvents
      .map((event) => {
        const { score, matchExplanation } = calculatePersonalizedEventScore(event, rawInterests);
        return {
          event,
          score,
          matchExplanation,
        };
      })
      .sort((a, b) => {
        // Primary: Personalized Score descending
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // Secondary: Proximity distance ascending
        const aDist = a.event.distanceKm ?? 999;
        const bDist = b.event.distanceKm ?? 999;
        if (aDist !== bDist) {
          return aDist - bDist;
        }
        // Tertiary: Date ascending
        const aDate = a.event.date || '';
        const bDate = b.event.date || '';
        if (aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }
        // Stable deterministic tie-breaker: ID ascending
        return a.event.id.localeCompare(b.event.id);
      });
  }, [filteredEvents, user?.interests]);

  // Compute dynamic ambient background glow based on active visible card
  const activeGlowColor = useMemo(() => {
    const activeItem = scoredEvents[activeCardIndex] || scoredEvents[0];
    if (activeItem && activeItem.event.gradientColors && activeItem.event.gradientColors[0]) {
      return activeItem.event.gradientColors[0];
    }
    return colors.orangeSunset;
  }, [scoredEvents, activeCardIndex]);

  // Active filter descriptions for contextual empty states
  const activeFilterDescriptions = useMemo(() => {
    const parts: string[] = [];
    if (searchQuery.trim()) parts.push(`"${searchQuery.trim()}"`);
    if (selectedTag !== 'All') parts.push(selectedTag);
    if (selectedFormat === 'online') parts.push('Online');
    if (selectedFormat === 'in_person') parts.push('In-Person');
    if (isFreeOnly) parts.push('Free Only');
    if (selectedRadius !== 'All') parts.push(`within ${selectedRadius}`);
    if (selectedDateFilter !== 'All Dates') parts.push(selectedDateFilter);
    return parts;
  }, [
    searchQuery,
    selectedTag,
    selectedFormat,
    isFreeOnly,
    selectedRadius,
    selectedDateFilter,
  ]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(scoredEvents.length - 1, Math.floor((offsetY + 120) / CARD_INTERVAL))
    );
    if (index !== activeCardIndex) {
      setActiveCardIndex(index);
    }
  };

  const handleCardPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleTagPress = (tag: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedTag(tag);
    setActiveCardIndex(0);
  };

  const handleResetAllFilters = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSearchQuery('');
    setSelectedTag('All');
    setSelectedFormat('all');
    setSelectedRadius('All');
    setSelectedDateFilter('All Dates');
    setIsFreeOnly(false);
    setActiveCardIndex(0);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    try {
      await refreshEvents(userCoordinates);
    } catch (e) {
      console.warn('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEvents, userCoordinates]);

  return (
    <View style={styles.screenWrapper}>
      {/* Dynamic Ambient Background Glow that shifts as user scrolls */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={[
            `${activeGlowColor}35`,
            'rgba(7, 8, 11, 0.65)',
            '#07080B',
          ]}
          locations={[0, 0.35, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.radialAuraCircle,
            { backgroundColor: `${activeGlowColor}20` },
          ]}
        />
      </View>

      {/* Main Safe Area Header with Location Picker */}
      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerDateLabel}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
            </Text>
            <View style={styles.titleWithAreaRow}>
              <Text style={styles.headerMainTitle}>Events</Text>
              {/* Preferred Discovery Area Pill (FR-01, FR-02) */}
              <TouchableOpacity
                style={styles.areaPickerPill}
                onPress={() => setIsAreaModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="location" size={12} color={colors.orangePrimary} />
                <Text style={styles.areaPickerText} numberOfLines={1}>
                  {locationName}
                </Text>
                <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* User Avatar & Messages Inbox */}
          <View style={styles.topRightProfileContainer}>
            <View style={styles.topRightActionsRow}>
              <TouchableOpacity
                style={styles.messagesIconButton}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('Conversations');
                }}
              >
                <Ionicons name="chatbubbles-outline" size={19} color={colors.textPrimary} />
                <View style={styles.messagesBadgeDot} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarButton}
                activeOpacity={0.8}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                  navigation.navigate('Profile');
                }}
              >
                <Image
                  source={{
                    uri:
                      user?.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                  }}
                  style={styles.avatarImage}
                />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Compact Search Bar (FR-03, F05) */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hackathons, workshops, organizers..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Network Error / Offline Feedback Banner (Graceful degradation) */}
        {refreshError ? (
          <View style={styles.networkStatusBanner}>
            <Ionicons name="cloud-offline-outline" size={12} color={colors.amberLight} />
            <Text style={styles.networkStatusText} numberOfLines={1}>
              {refreshError} · Showing cached events
            </Text>
          </View>
        ) : null}

        {/* Category Filter Chips */}
        <View style={styles.categoryChipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContent}
          >
            {SEARCH_CATEGORIES.map((cat) => {
              const isSelected = selectedTag === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => handleTagPress(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Secondary Filter Controls: Distance Radius, Free Only & Date (FR-03, F03, F06) */}
        <View style={styles.secondaryFiltersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryFiltersContent}
          >
            {/* City Pulse 3D Mode Launcher */}
            <TouchableOpacity
              style={styles.cityPulseChip}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                navigation.navigate('CityPulse');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="cube" size={13} color={colors.orangePrimary} />
              <Text style={styles.cityPulseChipText}>City Pulse</Text>
            </TouchableOpacity>

            {/* Buddy Match & Circles Launcher */}
            <TouchableOpacity
              style={styles.buddyMatchChip}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                navigation.navigate('BuddyMatchRadar');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="radio" size={13} color={colors.amberPrimary} />
              <Text style={styles.buddyMatchChipText}>Buddy Radar</Text>
            </TouchableOpacity>

            {/* Free Only Toggle (Functional Free / Normalized Price Filter) */}
            <TouchableOpacity
              style={[styles.filterChip, isFreeOnly && styles.filterChipActive]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsFreeOnly((prev) => !prev);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFreeOnly ? 'checkmark-circle' : 'ticket-outline'}
                size={12}
                color={isFreeOnly ? colors.orangePrimary : colors.textSecondary}
              />
              <Text style={[styles.filterChipText, isFreeOnly && styles.filterChipTextActive]}>
                Free Only
              </Text>
            </TouchableOpacity>

            {/* Attendance Format Filter (In-Person / Online) */}
            {FORMAT_OPTIONS.filter((f) => f.id !== 'all').map((f) => {
              const isSelected = selectedFormat === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedFormat(isSelected ? 'all' : f.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={f.icon}
                    size={11}
                    color={isSelected ? colors.orangePrimary : colors.textMuted}
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Radius Options (FR-03) */}
            {RADIUS_OPTIONS.map((r) => {
              const isSelected = selectedRadius === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedRadius(r);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="radio-outline"
                    size={11}
                    color={isSelected ? colors.orangePrimary : colors.textMuted}
                  />
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {r === 'All' ? 'Any Radius' : r}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Dynamic Calendar Date Filters */}
            {DATE_OPTIONS.filter((d) => d !== 'All Dates').map((d) => {
              const isSelected = selectedDateFilter === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedDateFilter(isSelected ? 'All Dates' : d);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Events Feed ScrollView with Pull-to-Refresh */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.orangePrimary}
            colors={[colors.orangePrimary]}
          />
        }
      >
        {scoredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={30} color={colors.orangePrimary} />
            </View>
            <Text style={styles.emptyTitle}>No matching events found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilterDescriptions.length > 0
                ? `No events matched your current combination of ${activeFilterDescriptions.join(
                    ' · '
                  )} in ${locationName}.`
                : `No events are currently scheduled in ${locationName}.`}
            </Text>
            <TouchableOpacity
              style={styles.resetSearchBtn}
              onPress={handleResetAllFilters}
            >
              <Text style={styles.resetSearchText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          scoredEvents.map(({ event, matchExplanation }) => (
            <ReferenceEventCard
              key={event.id}
              event={event}
              isSaved={isSaved(event.id)}
              userInterests={user?.interests || []}
              matchExplanation={matchExplanation}
              onPress={() => handleCardPress(event.id)}
              onBookmarkPress={() => toggleSave(event.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Preferred Discovery Area Selection Modal (FR-01, FR-02) */}
      <Modal
        visible={isAreaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Ionicons name="navigate-circle" size={20} color={colors.orangePrimary} />
                <Text style={styles.modalTitle}>Choose Discovery Hub</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAreaModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Nearby feed and radius calculations will center on this selected district.
            </Text>

            <View style={styles.areaList}>
              {discoveryAreas.map((area) => {
                const isSelected = selectedAreaId === area.id;
                return (
                  <TouchableOpacity
                    key={area.id}
                    style={[styles.areaOption, isSelected && styles.areaOptionActive]}
                    onPress={async () => {
                      await setDiscoveryArea(area.id);
                      setIsAreaModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.areaInfo}>
                      <Text style={[styles.areaName, isSelected && styles.areaNameActive]}>
                        {area.name}
                      </Text>
                      <Text style={styles.areaTag}>{area.tag}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.areaOption, selectedAreaId === 'gps' && styles.areaOptionActive]}
                onPress={async () => {
                  await setDiscoveryArea('gps');
                  setIsAreaModalVisible(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.areaInfo}>
                  <Text style={[styles.areaName, selectedAreaId === 'gps' && styles.areaNameActive]}>
                    Live Device GPS
                  </Text>
                  <Text style={styles.areaTag}>Automatic device coordinates</Text>
                </View>
                {selectedAreaId === 'gps' && (
                  <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  ambientGlowContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  radialAuraCircle: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    width: width * 0.95,
    height: 360,
    borderRadius: (width * 0.95) / 2,
    opacity: 0.6,
  },
  safeHeaderWrapper: {
    zIndex: 10,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 2,
  },
  headerTitleGroup: {
    justifyContent: 'center',
  },
  headerDateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerMainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  topRightProfileContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  topRightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messagesIconButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  messagesBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orangePrimary,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  headerBrandBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: borderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginBottom: 2,
  },
  headerBrandText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  avatarButton: {
    position: 'relative',
    padding: 2,
    marginTop: 2,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: colors.surfaceElevated,
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 28, 38, 0.85)',
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 2,
  },
  categoryChipsWrapper: {
    marginVertical: spacing.xs + 2,
  },
  categoryChipsContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs + 2,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(25, 28, 38, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: colors.orangePrimary,
    borderColor: colors.orangePrimary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: '#07080B',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xs,
    paddingBottom: 100, // Bottom padding so last card clears tab bar
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  resetSearchBtn: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  resetSearchText: {
    fontSize: 13,
    color: '#07080B',
    fontWeight: '700',
  },
  titleWithAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  areaPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    maxWidth: 160,
  },
  areaPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  secondaryFiltersWrapper: {
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  secondaryFiltersContent: {
    paddingHorizontal: spacing.lg,
    gap: 6,
  },
  cityPulseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  cityPulseChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  buddyMatchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  buddyMatchChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amberLight,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(25, 28, 38, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: colors.orangePrimary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  areaList: {
    gap: spacing.xs + 2,
  },
  areaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  areaOptionActive: {
    borderColor: colors.orangePrimary,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  areaInfo: {
    flex: 1,
  },
  areaName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  areaNameActive: {
    color: colors.orangePrimary,
  },
  areaTag: {
    fontSize: 11,
    color: colors.textMuted,
  },
  networkStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  networkStatusText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: colors.amberLight,
  },
});

import React, { useState, useMemo } from 'react';
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
import { RootStackParamList, HyperlocalEvent } from '../types';
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
const DATE_OPTIONS = ['All Dates', 'Today', 'This Weekend', 'Upcoming'] as const;

export const DiscoverScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { allEvents, isSaved, toggleSave } = useEvents();
  const { userCoordinates, locationName, discoveryAreas, selectedAreaId, setDiscoveryArea } = useLocation();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedRadius, setSelectedRadius] = useState<string>('All');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('All Dates');
  const [isFreeOnly, setIsFreeOnly] = useState<boolean>(false);
  const [isAreaModalVisible, setIsAreaModalVisible] = useState<boolean>(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Compute dynamic distances from current active discovery area / coordinates
  const eventsWithDistance = useMemo(() => {
    return allEvents.map((event) => {
      const dist = calculateDistanceKm(userCoordinates, event.coordinates);
      return {
        ...event,
        distanceKm: dist,
      };
    });
  }, [allEvents, userCoordinates]);

  // Predictable combined filtering & deterministic ranking (FR-03, FR-04, FR-05)
  const filteredEvents = useMemo(() => {
    return eventsWithDistance
      .filter((event) => {
        // 1. Category tag filter
        let matchesTag = true;
        if (selectedTag !== 'All') {
          const tagLower = selectedTag.toLowerCase();
          matchesTag =
            event.category.toLowerCase().includes(tagLower) ||
            event.title.toLowerCase().includes(tagLower) ||
            event.venue.toLowerCase().includes(tagLower) ||
            event.tagline.toLowerCase().includes(tagLower);
        }

        // 2. Search query check (title, tagline, venue, category, organizer, description)
        let matchesSearch = true;
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase().trim();
          matchesSearch =
            event.title.toLowerCase().includes(q) ||
            event.tagline.toLowerCase().includes(q) ||
            event.category.toLowerCase().includes(q) ||
            event.venue.toLowerCase().includes(q) ||
            event.organizer.name.toLowerCase().includes(q) ||
            event.description.toLowerCase().includes(q);
        }

        // 3. Free only filter
        let matchesFree = true;
        if (isFreeOnly) {
          matchesFree = event.isFree === true;
        }

        // 4. Distance radius filter
        let matchesRadius = true;
        if (selectedRadius !== 'All') {
          const radiusKm = parseInt(selectedRadius.replace(' km', ''), 10);
          if (!isNaN(radiusKm) && event.distanceKm !== undefined) {
            matchesRadius = event.distanceKm <= radiusKm;
          }
        }

        // 5. Date filter
        let matchesDate = true;
        if (selectedDateFilter === 'Today') {
          matchesDate = event.date === '2026-12-21' || event.displayDate.includes('21');
        } else if (selectedDateFilter === 'This Weekend') {
          matchesDate = event.displayDate.includes('SAT') || event.displayDate.includes('SUN');
        } else if (selectedDateFilter === 'Upcoming') {
          matchesDate = event.isUpcoming !== false;
        }

        return matchesTag && matchesSearch && matchesFree && matchesRadius && matchesDate;
      })
      .sort((a, b) => {
        // Deterministic ranking: explicit interest overlap score + proximity
        const userInterests = (user?.interests || []).map((i) => i.toLowerCase());
        const aInterestMatch = userInterests.some((i) =>
          a.category.toLowerCase().includes(i) ||
          a.title.toLowerCase().includes(i) ||
          a.tagline.toLowerCase().includes(i)
        );
        const bInterestMatch = userInterests.some((i) =>
          b.category.toLowerCase().includes(i) ||
          b.title.toLowerCase().includes(i) ||
          b.tagline.toLowerCase().includes(i)
        );

        if (aInterestMatch && !bInterestMatch) return -1;
        if (!aInterestMatch && bInterestMatch) return 1;

        // Secondary sort: closer distance
        return (a.distanceKm || 0) - (b.distanceKm || 0);
      });
  }, [
    eventsWithDistance,
    selectedTag,
    searchQuery,
    isFreeOnly,
    selectedRadius,
    selectedDateFilter,
    user?.interests,
  ]);

  // Compute dynamic ambient background glow based on active visible card
  const activeGlowColor = useMemo(() => {
    const activeEvent = filteredEvents[activeCardIndex] || filteredEvents[0];
    if (activeEvent && activeEvent.gradientColors && activeEvent.gradientColors[0]) {
      return activeEvent.gradientColors[0];
    }
    return colors.orangeSunset;
  }, [filteredEvents, activeCardIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(filteredEvents.length - 1, Math.floor((offsetY + 120) / CARD_INTERVAL))
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
            <Text style={styles.headerDateLabel}>MONDAY, DEC 21</Text>
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
                  {locationName.replace('Indiranagar ', '').replace('Koramangala ', '')}
                </Text>
                <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* User Avatar with Social Buddy Designed Brand Text */}
          <View style={styles.topRightProfileContainer}>
            <View style={styles.headerBrandBadge}>
              <Text style={styles.headerBrandText}>Social Buddy</Text>
            </View>
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
            {/* Free Only Toggle */}
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

            {/* Date Filters */}
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

      {/* Events Feed ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={30} color={colors.orangePrimary} />
            </View>
            <Text style={styles.emptyTitle}>No matching events found</Text>
            <Text style={styles.emptySubtitle}>
              No events matched your current combination of keywords, radius, and date filters.
            </Text>
            <TouchableOpacity
              style={styles.resetSearchBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedTag('All');
                setSelectedRadius('All');
                setSelectedDateFilter('All Dates');
                setIsFreeOnly(false);
              }}
            >
              <Text style={styles.resetSearchText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEvents.map((event: HyperlocalEvent) => (
            <ReferenceEventCard
              key={event.id}
              event={event}
              isSaved={isSaved(event.id)}
              userInterests={user?.interests || []}
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
});

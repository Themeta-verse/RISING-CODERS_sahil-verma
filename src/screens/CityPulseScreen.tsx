import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEvents } from '../context/EventsContext';
import { useLocation } from '../context/LocationContext';
import {
  EventCategory,
  HyperlocalEvent,
  ProjectedSpatialMarker,
  Coordinates,
} from '../types';
import { calculateDistanceKm } from '../utils/distance';
import { detectLocationMismatch } from '../utils/projection';
import { CityPulse3DCanvas } from '../components/CityPulse3DCanvas';
import { CityPulsePreviewCard } from '../components/CityPulsePreviewCard';
import { fetchLiveHyperlocalEvents, subscribeToLiveEvents } from '../services/liveEventService';
import { DEFAULT_USER_COORDINATES } from '../data/mockEvents';
import { colors, spacing, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES: EventCategory[] = [
  'All',
  'Music',
  'Workshops',
  'Meetups',
  'Parties',
  'Comedy',
  'Sports',
  'College',
];

const RADIUS_OPTIONS = [5, 10, 20, 35] as const;

interface CityPulseScreenProps {
  navigation?: any;
  route?: { params?: { focusEventId?: string } };
  onBack?: () => void;
  onEventPress?: (eventId: string) => void;
  initialEventId?: string;
}

export const CityPulseScreen: React.FC<CityPulseScreenProps> = ({
  navigation,
  route,
  onBack,
  onEventPress,
  initialEventId,
}) => {
  const insets = useSafeAreaInsets();
  const { allEvents } = useEvents();
  const {
    userCoordinates,
    locationName,
    selectedAreaId,
    locationProvenance,
    discoveryAreas,
    setDiscoveryArea,
  } = useLocation();

  // Active filters and viewport settings
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('All');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(20);
  const effectiveInitialEventId = initialEventId || route?.params?.focusEventId;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    effectiveInitialEventId ?? null
  );
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [isAreaModalVisible, setIsAreaModalVisible] = useState<boolean>(false);
  const [isRadiusModalVisible, setIsRadiusModalVisible] = useState<boolean>(false);

  const handleBack = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    if (onBack) {
      onBack();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  }, [onBack, navigation]);

  const handleEventPress = useCallback(
    (eventId: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
      if (onEventPress) {
        onEventPress(eventId);
      } else if (navigation?.navigate) {
        navigation.navigate('EventDetail', { eventId });
      }
    },
    [onEventPress, navigation]
  );

  // Live Supabase state
  const [liveEvents, setLiveEvents] = useState<HyperlocalEvent[]>(allEvents);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Active projection center coordinate
  // When using discovery area, center is the area's coordinates; otherwise user GPS.
  // If user's GPS is far (> 50 km) from demo data, default to Indiranagar Arts Hub so events are visible.
  const centerCoordinates: Coordinates = useMemo(() => {
    if (selectedAreaId === 'gps') {
      const hasLocalNearby = allEvents.some(
        (ev) => calculateDistanceKm(userCoordinates, ev.coordinates) <= 50
      );
      if (!hasLocalNearby) {
        return DEFAULT_USER_COORDINATES;
      }
      return userCoordinates;
    }
    const currentArea = discoveryAreas.find((a) => a.id === selectedAreaId);
    return currentArea ? currentArea.coordinates : DEFAULT_USER_COORDINATES;
  }, [selectedAreaId, discoveryAreas, userCoordinates, allEvents]);

  // Center display name
  const centerDisplayName = useMemo(() => {
    if (selectedAreaId === 'gps') {
      const hasLocalNearby = allEvents.some(
        (ev) => calculateDistanceKm(userCoordinates, ev.coordinates) <= 50
      );
      if (!hasLocalNearby) {
        return 'Indiranagar Arts Hub';
      }
      return locationName || 'Current Location';
    }
    const currentArea = discoveryAreas.find((a) => a.id === selectedAreaId);
    return currentArea ? currentArea.name : locationName;
  }, [selectedAreaId, discoveryAreas, locationName, allEvents, userCoordinates]);

  // Check for physical location mismatch (> 50 km)
  const mismatchInfo = useMemo(() => {
    return detectLocationMismatch(
      userCoordinates,
      centerCoordinates,
      locationName,
      centerDisplayName,
      50
    );
  }, [userCoordinates, centerCoordinates, locationName, centerDisplayName]);

  // True physical GPS is active ONLY when selectedArea is 'gps' AND user is actually within local range
  const isPhysicalGpsActive = useMemo(() => {
    return selectedAreaId === 'gps' && !mismatchInfo.isMismatch && locationProvenance === 'gps';
  }, [selectedAreaId, mismatchInfo.isMismatch, locationProvenance]);

  // Fetch live Supabase events on center/radius/category change
  useEffect(() => {
    let isCancelled = false;

    fetchLiveHyperlocalEvents(
      centerCoordinates.latitude,
      centerCoordinates.longitude,
      selectedRadiusKm,
      selectedCategory
    ).then(({ events: fetchedEvents, isLive, error }) => {
      if (!isCancelled) {
        setLiveEvents(fetchedEvents);
        setIsLiveConnected(isLive);
        setLiveError(error || null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [centerCoordinates, selectedRadiusKm, selectedCategory]);

  // Subscribe to real-time event updates
  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents(() => {
      fetchLiveHyperlocalEvents(
        centerCoordinates.latitude,
        centerCoordinates.longitude,
        selectedRadiusKm,
        selectedCategory
      ).then(({ events: fetchedEvents, isLive }) => {
        setLiveEvents(fetchedEvents);
        setIsLiveConnected(isLive);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [centerCoordinates, selectedRadiusKm, selectedCategory]);

  // Combined source: live Supabase events if available, otherwise context events
  const sourceEvents = useMemo(() => {
    if (liveEvents && liveEvents.length > 0) {
      return liveEvents;
    }
    return allEvents;
  }, [liveEvents, allEvents]);

  // Filter events by category and active radius
  const filteredEvents = useMemo(() => {
    return sourceEvents.filter((ev) => {
      // 1. Category filter
      if (selectedCategory !== 'All' && ev.category !== selectedCategory) {
        return false;
      }

      // 2. Proximity radius constraint
      const dist = calculateDistanceKm(centerCoordinates, ev.coordinates);
      if (dist > selectedRadiusKm) {
        return false;
      }

      return true;
    });
  }, [sourceEvents, selectedCategory, centerCoordinates, selectedRadiusKm]);

  // Currently selected event object for the preview card
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return sourceEvents.find((e) => e.id === selectedEventId) ?? null;
  }, [sourceEvents, selectedEventId]);

  // Selected event dynamic distance
  const selectedEventDistance = useMemo(() => {
    if (!selectedEvent) return 0;
    return calculateDistanceKm(centerCoordinates, selectedEvent.coordinates);
  }, [selectedEvent, centerCoordinates]);

  // Marker selection callback
  const handleSelectMarker = useCallback(
    (marker: ProjectedSpatialMarker) => {
      setSelectedEventId(marker.eventId);
    },
    []
  );

  // Dismiss preview card
  const handleDismissPreview = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  // Category selection with haptics
  const handleSelectCategory = (cat: EventCategory) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedCategory(cat);
  };

  // Switch discovery area
  const handleSelectArea = async (areaId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setIsAreaModalVisible(false);
    await setDiscoveryArea(areaId);
    setSelectedEventId(null);
  };

  // Switch radius
  const handleSelectRadius = (km: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedRadiusKm(km);
    setIsRadiusModalVisible(false);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* 1. Main 3D City Visualization Canvas (WebGL on Web, 2.5D on Mobile) */}
      <CityPulse3DCanvas
        events={filteredEvents}
        centerCoordinates={centerCoordinates}
        centerLocationName={centerDisplayName}
        selectedEventId={selectedEventId}
        onSelectMarker={handleSelectMarker}
        viewportWidth={SCREEN_WIDTH}
        viewportHeight={SCREEN_HEIGHT}
        userCoordinates={userCoordinates}
        isUserDistant={mismatchInfo.isMismatch}
        recenterTrigger={recenterTrigger}
      />

      {/* 2. Compact Top HUD & Controls Overlay */}
      <View
        style={[
          styles.topHudContainer,
          { paddingTop: Math.max(insets.top, 38) + 6 },
        ]}
        pointerEvents="box-none"
      >
        {/* Navigation & Area Bar */}
        <View style={styles.hudTopBar}>
          {/* Back or Hub Icon */}
          <TouchableOpacity
            style={styles.hudIconButton}
            onPress={handleBack}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={onBack || navigation?.canGoBack?.() ? 'arrow-back' : 'cube-outline'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Area Selector Button */}
          <TouchableOpacity
            style={styles.areaSelectorPill}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsAreaModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.provenanceDot,
                isPhysicalGpsActive
                  ? styles.provenanceDotGps
                  : styles.provenanceDotHub,
              ]}
            />
            <Text style={styles.areaSelectorText} numberOfLines={1}>
              {centerDisplayName}
            </Text>
            <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Radius Filter Button */}
          <TouchableOpacity
            style={styles.radiusPill}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setIsRadiusModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="scan" size={12} color={colors.orangePrimary} />
            <Text style={styles.radiusPillText}>{selectedRadiusKm} km</Text>
          </TouchableOpacity>

          {/* Recenter Canvas Button */}
          <TouchableOpacity
            style={styles.hudIconButton}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setRecenterTrigger((prev) => prev + 1);
            }}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Recenter map"
          >
            <Ionicons name="locate" size={18} color={colors.orangePrimary} />
          </TouchableOpacity>

          {/* Live Data Provenance Indicator */}
          <View style={styles.liveIndicatorBadge}>
            <View style={[styles.liveIndicatorDot, isLiveConnected ? styles.dotGreen : styles.dotAmber]} />
            <Text style={styles.liveIndicatorText}>
              {isLiveConnected ? 'LIVE' : 'DEMO'}
            </Text>
          </View>
        </View>

        {/* Location Mismatch / Simulated Hub Banner */}
        {mismatchInfo.isMismatch && (
          <View style={styles.mismatchBanner}>
            <Ionicons name="information-circle" size={14} color={colors.amberLight} />
            <Text style={styles.mismatchBannerText} numberOfLines={2}>
              {mismatchInfo.disclaimer}
            </Text>
          </View>
        )}

        {/* Horizontal Category Filter Pills */}
        <View style={styles.categoryScrollWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    isSelected && styles.categoryPillActive,
                  ]}
                  onPress={() => handleSelectCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 3. Empty State (Honest Feedback When 0 Matches) */}
      {filteredEvents.length === 0 && (
        <View style={styles.emptyStateContainer} pointerEvents="box-none">
          <View style={styles.emptyStateCard}>
            <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No events in this view</Text>
            <Text style={styles.emptyStateSub}>
              No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} events
              found within {selectedRadiusKm} km of {centerDisplayName}.
            </Text>
            <TouchableOpacity
              style={styles.resetFilterButton}
              onPress={() => {
                setSelectedCategory('All');
                setSelectedRadiusKm(35);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetFilterText}>Reset Filters (35 km)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 4. Floating Preview Card */}
      <CityPulsePreviewCard
        event={selectedEvent}
        distanceKm={selectedEventDistance}
        isVisible={Boolean(selectedEvent)}
        onClose={handleDismissPreview}
        onViewDetails={handleEventPress}
      />

      {/* 5. Area Selector Modal */}
      <Modal
        visible={isAreaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAreaModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsAreaModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Exploration Hub</Text>
              <TouchableOpacity
                onPress={() => setIsAreaModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* GPS Option */}
            <TouchableOpacity
              style={[
                styles.areaItem,
                selectedAreaId === 'gps' && styles.areaItemActive,
              ]}
              onPress={() => handleSelectArea('gps')}
              activeOpacity={0.8}
            >
              <View style={styles.areaItemIcon}>
                <Ionicons name="navigate" size={18} color={colors.orangePrimary} />
              </View>
              <View style={styles.areaItemTextCol}>
                <Text style={styles.areaItemName}>Current GPS Location</Text>
                <Text style={styles.areaItemTag}>
                  {mismatchInfo.userLocationName} • Device coordinates
                </Text>
              </View>
              {selectedAreaId === 'gps' && (
                <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Bangalore Discovery Hubs */}
            {discoveryAreas.map((area) => {
              const isSelected = selectedAreaId === area.id;
              return (
                <TouchableOpacity
                  key={area.id}
                  style={[styles.areaItem, isSelected && styles.areaItemActive]}
                  onPress={() => handleSelectArea(area.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.areaItemIcon}>
                    <Ionicons name="business" size={18} color={colors.amberPrimary} />
                  </View>
                  <View style={styles.areaItemTextCol}>
                    <Text style={styles.areaItemName}>{area.name}</Text>
                    <Text style={styles.areaItemTag}>{area.tag}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 6. Radius Selector Modal */}
      <Modal
        visible={isRadiusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRadiusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRadiusModalVisible(false)}
        >
          <View style={styles.modalContentSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Discovery Scan Radius</Text>
              <TouchableOpacity
                onPress={() => setIsRadiusModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {RADIUS_OPTIONS.map((km) => {
              const isSelected = selectedRadiusKm === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[styles.areaItem, isSelected && styles.areaItemActive]}
                  onPress={() => handleSelectRadius(km)}
                  activeOpacity={0.8}
                >
                  <View style={styles.areaItemTextCol}>
                    <Text style={styles.areaItemName}>{km} Kilometers</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#07080B',
  },
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8000,
  },
  hudTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  hudIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaSelectorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    gap: 6,
  },
  provenanceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  provenanceDotGps: {
    backgroundColor: colors.success,
  },
  provenanceDotHub: {
    backgroundColor: colors.orangePrimary,
  },
  areaSelectorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  radiusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.orangePrimary,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(19, 21, 31, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: colors.success,
  },
  dotAmber: {
    backgroundColor: colors.amberPrimary,
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  mismatchBannerText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: colors.amberLight,
    lineHeight: 14,
  },
  categoryScrollWrapper: {
    marginTop: spacing.xs + 2,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: 6,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(19, 21, 31, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryPillActive: {
    backgroundColor: colors.orangePrimary,
    borderColor: colors.orangePrimary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#07080B',
    fontWeight: '800',
  },
  emptyStateContainer: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 7000,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(19, 21, 31, 0.95)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    alignItems: 'center',
    maxWidth: 300,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: spacing.md,
  },
  resetFilterButton: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: colors.orangePrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orangePrimary,
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
    maxWidth: 360,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.borderOrange,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  modalContentSmall: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: colors.borderOrange,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  areaItemActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  areaItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaItemTextCol: {
    flex: 1,
  },
  areaItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  areaItemTag: {
    fontSize: 10,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
});


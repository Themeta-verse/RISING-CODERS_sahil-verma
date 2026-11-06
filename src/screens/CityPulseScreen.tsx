import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  Image,
  Platform,
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
  LiveConnectionStatus,
} from '../types';
import { calculateDistanceKm, formatDistance } from '../utils/distance';
import { detectLocationMismatch } from '../utils/projection';
import { CityPulse3DCanvas } from '../components/CityPulse3DCanvas';
import { CityPulsePreviewCard } from '../components/CityPulsePreviewCard';
import { isSupabaseConfigured } from '../services/supabase';
import { fetchLiveHyperlocalEvents, subscribeToLiveEvents } from '../services/liveEventService';
import { DEFAULT_USER_COORDINATES } from '../data/mockEvents';
import { colors, spacing, borderRadius } from '../theme';
import { getSafeTop } from '../utils/safeDimensions';

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

const RADIUS_OPTIONS = [10, 20, 35, 50] as const;

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

  // Active filters and view settings
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('All');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number>(20);
  const effectiveInitialEventId = initialEventId || route?.params?.focusEventId;
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    effectiveInitialEventId ?? null
  );
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isAreaModalVisible, setIsAreaModalVisible] = useState<boolean>(false);
  const [isRadiusModalVisible, setIsRadiusModalVisible] = useState<boolean>(false);

  const handleZoomIn = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setZoomLevel((prev) => Math.min(2.5, Math.round((prev + 0.25) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setZoomLevel((prev) => Math.max(0.5, Math.round((prev - 0.25) * 100) / 100));
  }, []);

  const handleResetZoom = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setZoomLevel(1.0);
    setRecenterTrigger((prev) => prev + 1);
  }, []);

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
  const [liveStatus, setLiveStatus] = useState<LiveConnectionStatus>(
    isSupabaseConfigured ? 'CONNECTING' : 'DEMO'
  );
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Active projection center coordinate
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
        return 'Bandra & BKC Culture Hub';
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

    if (isSupabaseConfigured) {
      setLiveStatus('CONNECTING');
    }

    fetchLiveHyperlocalEvents(
      centerCoordinates.latitude,
      centerCoordinates.longitude,
      selectedRadiusKm,
      selectedCategory
    ).then((result) => {
      if (!isCancelled) {
        setLiveEvents(result.events);
        setLiveStatus(result.status);
        setIsLiveConnected(result.isLive);
        setLiveError(result.error || null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [centerCoordinates, selectedRadiusKm, selectedCategory]);

  // Subscribe to real-time event updates (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const unsubscribe = subscribeToLiveEvents({
      onInsert: (newEvent) => {
        const dist = calculateDistanceKm(centerCoordinates, newEvent.coordinates);
        if (dist <= selectedRadiusKm) {
          if (selectedCategory === 'All' || newEvent.category === selectedCategory) {
            newEvent.distanceKm = dist;
            setLiveEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id)) {
                return prev.map((e) => (e.id === newEvent.id ? newEvent : e));
              }
              return [newEvent, ...prev];
            });
          }
        }
      },
      onUpdate: (updatedEvent) => {
        const dist = calculateDistanceKm(centerCoordinates, updatedEvent.coordinates);
        const inRadius = dist <= selectedRadiusKm;
        const inCategory = selectedCategory === 'All' || updatedEvent.category === selectedCategory;

        setLiveEvents((prev) => {
          const exists = prev.some((e) => e.id === updatedEvent.id);
          if (inRadius && inCategory) {
            updatedEvent.distanceKm = dist;
            if (exists) {
              return prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
            }
            return [updatedEvent, ...prev];
          } else {
            return prev.filter((e) => e.id !== updatedEvent.id);
          }
        });
      },
      onDelete: (deletedEventId) => {
        setLiveEvents((prev) => prev.filter((e) => e.id !== deletedEventId));
        setSelectedEventId((prev) => (prev === deletedEventId ? null : prev));
      },
      onStatusChange: (status) => {
        if (status === 'SUBSCRIBED') {
          setLiveStatus('LIVE');
          setIsLiveConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLiveStatus('OFFLINE');
          setIsLiveConnected(false);
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [centerCoordinates, selectedRadiusKm, selectedCategory]);

  // Combined source: live Supabase events if connected, otherwise fallback events
  const sourceEvents = useMemo(() => {
    if (isSupabaseConfigured && isLiveConnected) {
      return liveEvents;
    }
    if (liveEvents && liveEvents.length > 0) {
      return liveEvents;
    }
    return allEvents;
  }, [isLiveConnected, liveEvents, allEvents]);

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

  // Count distribution across all categories in current radius
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    sourceEvents.forEach((ev) => {
      const dist = calculateDistanceKm(centerCoordinates, ev.coordinates);
      if (dist <= selectedRadiusKm) {
        counts.All = (counts.All || 0) + 1;
        counts[ev.category] = (counts[ev.category] || 0) + 1;
      }
    });
    return counts;
  }, [sourceEvents, centerCoordinates, selectedRadiusKm]);

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

  // Recenter / Focus map
  const handleRecenter = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedEventId(null);
    setRecenterTrigger((prev) => prev + 1);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* 1. MAP VIEW (3D Web / 2.5D Mobile) */}
      {viewMode === 'map' && (
        <View style={styles.canvasContainer}>
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
            zoomLevel={zoomLevel}
          />

          {/* Floating Zoom & Perspective Controls on 3D Map */}
          <View style={[styles.floatingZoomCluster, { top: getSafeTop(insets.top) + 130 }]} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.floatingZoomBtn}
              onPress={handleZoomIn}
              activeOpacity={0.8}
              accessibilityLabel="Zoom In"
            >
              <Ionicons name="add" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.floatingZoomBadge}>
              <Text style={styles.floatingZoomBadgeText}>
                {Math.round(zoomLevel * 100)}%
              </Text>
            </View>

            <TouchableOpacity
              style={styles.floatingZoomBtn}
              onPress={handleZoomOut}
              activeOpacity={0.8}
              accessibilityLabel="Zoom Out"
            >
              <Ionicons name="remove" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.floatingZoomBtn, styles.floatingRecenterBtn]}
              onPress={handleResetZoom}
              activeOpacity={0.8}
              accessibilityLabel="Reset View"
            >
              <Ionicons name="locate" size={15} color={colors.orangePrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. TOP HUD CONTROLS (Mobile-First, Elegant Spacing) */}
      <View
        style={[
          styles.topHudContainer,
          { paddingTop: getSafeTop(insets.top) + 8 },
        ]}
        pointerEvents="box-none"
      >
        {/* ROW 1: Back, Hub Selector, View Mode Toggle */}
        <View style={styles.hudRowOne}>
          <TouchableOpacity
            style={styles.hudSquareBtn}
            onPress={handleBack}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Go back"
          >
            <Ionicons
              name={onBack || navigation?.canGoBack?.() ? 'arrow-back' : 'chevron-back'}
              size={19}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          {/* Area Selector Pill */}
          <TouchableOpacity
            style={styles.areaPill}
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
                isPhysicalGpsActive ? styles.dotGps : styles.dotHub,
              ]}
            />
            <Text style={styles.areaPillText} numberOfLines={1}>
              {centerDisplayName}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Mode Toggle (Map / List) */}
          <View style={styles.modeToggleGroup}>
            <TouchableOpacity
              style={[
                styles.modeToggleTab,
                viewMode === 'map' && styles.modeToggleTabActive,
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setViewMode('map');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="map"
                size={13}
                color={viewMode === 'map' ? colors.orangePrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  viewMode === 'map' && styles.modeToggleLabelActive,
                ]}
              >
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeToggleTab,
                viewMode === 'list' && styles.modeToggleTabActive,
              ]}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setViewMode('list');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="list"
                size={13}
                color={viewMode === 'list' ? colors.orangePrimary : colors.textMuted}
              />
              <Text
                style={[
                  styles.modeToggleLabel,
                  viewMode === 'list' && styles.modeToggleLabelActive,
                ]}
              >
                List
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ROW 2: Live Connection Badge, Quick Radius Selector, Recenter */}
        <View style={styles.hudRowTwo}>
          {/* Live Data Provenance Badge */}
          <View style={styles.liveBadge}>
            <View
              style={[
                styles.liveDot,
                liveStatus === 'LIVE'
                  ? styles.dotGreen
                  : liveStatus === 'CONNECTING'
                  ? styles.dotCyan
                  : liveStatus === 'OFFLINE'
                  ? styles.dotRed
                  : styles.dotAmber,
              ]}
            />
            <Text style={styles.liveBadgeText}>
              {liveStatus === 'LIVE' ? 'LIVE' : liveStatus}
            </Text>
            <Text style={styles.liveCountText}>
              · {filteredEvents.length} {filteredEvents.length === 1 ? 'EVENT' : 'EVENTS'}
            </Text>
          </View>

          {/* Quick Radius Chips */}
          <View style={styles.radiusGroup}>
            {RADIUS_OPTIONS.map((km) => {
              const isSelected = selectedRadiusKm === km;
              return (
                <TouchableOpacity
                  key={km}
                  style={[
                    styles.radiusChip,
                    isSelected && styles.radiusChipActive,
                  ]}
                  onPress={() => handleSelectRadius(km)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      isSelected && styles.radiusChipTextActive,
                    ]}
                  >
                    {km}km
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recenter / Focus Button */}
          {viewMode === 'map' && (
            <TouchableOpacity
              style={styles.hudSquareBtnSmall}
              onPress={handleRecenter}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Fit all events"
            >
              <Ionicons name="scan-outline" size={16} color={colors.orangePrimary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Location Mismatch Disclaimer */}
        {mismatchInfo.isMismatch && (
          <View style={styles.mismatchBanner}>
            <Ionicons name="information-circle" size={13} color={colors.amberLight} />
            <Text style={styles.mismatchText} numberOfLines={1}>
              {mismatchInfo.disclaimer}
            </Text>
          </View>
        )}

        {/* ROW 3: Horizontal Category Filter Chips with Live Counts */}
        <View style={styles.categoryRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    isSelected && styles.catChipActive,
                  ]}
                  onPress={() => handleSelectCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      isSelected && styles.catChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      isSelected && styles.countBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        isSelected && styles.countBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* 3. LIST VIEW (Alternative Full-Height Discovery Feed) */}
      {viewMode === 'list' && (
        <ScrollView
          style={[
            styles.listContainer,
            { paddingTop: Math.max(insets.top, 16) + 155 },
          ]}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 40 },
          ]}
        >
          {filteredEvents.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyCard}>
                <Ionicons name="compass-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No events in this range</Text>
                <Text style={styles.emptySub}>
                  No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} events found
                  within {selectedRadiusKm} km of {centerDisplayName}.
                </Text>
                <View style={styles.emptyActionsRow}>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setSelectedRadiusKm(50)}
                  >
                    <Text style={styles.emptyBtnText}>Expand to 50 km</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emptyBtn, styles.emptyBtnOutline]}
                    onPress={() => setSelectedCategory('All')}
                  >
                    <Text style={styles.emptyBtnTextOutline}>All Categories</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            filteredEvents.map((ev, idx) => {
              const dist = calculateDistanceKm(centerCoordinates, ev.coordinates);
              return (
                <TouchableOpacity
                  key={`${ev.id}-${idx}`}
                  style={styles.feedCard}
                  onPress={() => handleEventPress(ev.id)}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: ev.imageUrl }} style={styles.feedCardImage} />
                  <View style={styles.feedCardOverlay} />

                  <View style={styles.feedCardHeader}>
                    <View style={styles.feedBadgeGroup}>
                      <View style={styles.feedCategoryBadge}>
                        <Text style={styles.feedCategoryText}>{ev.category}</Text>
                      </View>
                      <View style={styles.feedDistBadge}>
                        <Ionicons name="navigate" size={10} color={colors.orangePrimary} />
                        <Text style={styles.feedDistText}>{formatDistance(dist)}</Text>
                      </View>
                      {ev.isSeedDemoData && (
                        <View style={styles.feedDemoBadge}>
                          <Text style={styles.feedDemoText}>DEMO</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.feedPriceTag}>
                      <Text style={styles.feedPriceText}>{ev.price}</Text>
                    </View>
                  </View>

                  <View style={styles.feedCardBody}>
                    <Text style={styles.feedTitle} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    <Text style={styles.feedTagline} numberOfLines={1}>
                      {ev.tagline}
                    </Text>

                    <View style={styles.feedMetaRow}>
                      <View style={styles.feedMetaItem}>
                        <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                        <Text style={styles.feedMetaText} numberOfLines={1}>
                          {ev.venue}
                        </Text>
                      </View>
                      <View style={styles.feedMetaItem}>
                        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.feedMetaText} numberOfLines={1}>
                          {ev.displayDate || ev.date} • {ev.time}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.feedFooter}>
                      <TouchableOpacity
                        style={styles.feedMapBtn}
                        onPress={() => {
                          setSelectedEventId(ev.id);
                          setViewMode('map');
                        }}
                      >
                        <Ionicons name="map-outline" size={13} color={colors.orangePrimary} />
                        <Text style={styles.feedMapBtnText}>Show on 3D Map</Text>
                      </TouchableOpacity>

                      <View style={styles.feedAttendeeCount}>
                        <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                        <Text style={styles.feedAttendeeText}>{ev.attendeeCount} attending</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 4. MAP MODE: BOTTOM DISCOVERY TRAY (Carousel when unselected) */}
      {viewMode === 'map' && !selectedEvent && filteredEvents.length > 0 && (
        <View
          style={[
            styles.bottomTrayWrapper,
            { bottom: Math.max(insets.bottom, 14) + 8 },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.bottomTrayHeader}>
            <View style={styles.trayHeaderLeft}>
              <Text style={styles.trayTitle}>Events in Mumbai</Text>
              <Text style={styles.traySubtitle}>
                {filteredEvents.length} within {selectedRadiusKm}km
              </Text>
            </View>
            <TouchableOpacity
              style={styles.trayListLink}
              onPress={() => setViewMode('list')}
            >
              <Text style={styles.trayListLinkText}>View Feed</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.orangePrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trayCarouselContent}
          >
            {filteredEvents.map((ev, idx) => {
              const dist = calculateDistanceKm(centerCoordinates, ev.coordinates);
              return (
                <TouchableOpacity
                  key={`${ev.id}-${idx}`}
                  style={styles.miniCard}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    setSelectedEventId(ev.id);
                  }}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: ev.imageUrl }} style={styles.miniCardImage} />
                  <View style={styles.miniCardGradient} />

                  <View style={styles.miniCardTopBadges}>
                    <View style={styles.miniCategoryBadge}>
                      <Text style={styles.miniCategoryText}>{ev.category}</Text>
                    </View>
                    {ev.isSeedDemoData && (
                      <View style={styles.miniDemoBadge}>
                        <Text style={styles.miniDemoText}>DEMO</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.miniCardBody}>
                    <Text style={styles.miniTitle} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    <View style={styles.miniVenueRow}>
                      <Ionicons name="location" size={10} color={colors.textSecondary} />
                      <Text style={styles.miniVenueText} numberOfLines={1}>
                        {ev.venue} · {formatDistance(dist)}
                      </Text>
                    </View>
                    <View style={styles.miniFooterRow}>
                      <Text style={styles.miniTimeText}>{ev.time}</Text>
                      <Text style={styles.miniPriceText}>{ev.price}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* 5. MAP MODE: EMPTY STATE */}
      {viewMode === 'map' && filteredEvents.length === 0 && (
        <View style={styles.mapEmptyOverlay} pointerEvents="box-none">
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No events in this radius</Text>
            <Text style={styles.emptySub}>
              No {selectedCategory !== 'All' ? selectedCategory.toLowerCase() : ''} events found within{' '}
              {selectedRadiusKm} km of {centerDisplayName}.
            </Text>
            <View style={styles.emptyActionsRow}>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setSelectedRadiusKm(50)}
              >
                <Text style={styles.emptyBtnText}>Expand to 50 km</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyBtn, styles.emptyBtnOutline]}
                onPress={() => setSelectedCategory('All')}
              >
                <Text style={styles.emptyBtnTextOutline}>All Categories</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 6. FULL FLOATING PREVIEW CARD (When an event is selected) */}
      <CityPulsePreviewCard
        event={selectedEvent}
        distanceKm={selectedEventDistance}
        isVisible={Boolean(selectedEvent)}
        onClose={handleDismissPreview}
        onViewDetails={handleEventPress}
      />

      {/* 7. AREA SELECTOR MODAL */}
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

            {/* Maharashtra Discovery Hubs */}
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

      {/* 8. RADIUS SELECTOR MODAL */}
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
    backgroundColor: '#0B101D',
  },
  canvasContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Top HUD Bar Container
  topHudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 14,
  },
  hudRowOne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  hudSquareBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  hudSquareBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 22, 36, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingZoomCluster: {
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(12, 16, 26, 0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 4,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99,
  },
  floatingZoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingZoomBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  floatingZoomBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  floatingRecenterBtn: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 2,
  },
  areaPill: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  provenanceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGps: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  dotHub: {
    backgroundColor: colors.orangePrimary,
  },
  areaPillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeToggleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  modeToggleTabActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  modeToggleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modeToggleLabelActive: {
    color: colors.orangePrimary,
  },

  // HUD Row 2
  hudRowTwo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 22, 36, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowRadius: 5,
    shadowOpacity: 0.9,
  },
  dotCyan: {
    backgroundColor: '#06B6D4',
  },
  dotRed: {
    backgroundColor: '#EF4444',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.6,
  },
  liveCountText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  radiusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 22, 36, 0.92)',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  radiusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  radiusChipActive: {
    backgroundColor: colors.orangePrimary,
  },
  radiusChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  radiusChipTextActive: {
    color: '#07080B',
    fontWeight: '900',
  },

  // Mismatch Banner
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 8,
  },
  mismatchText: {
    flex: 1,
    fontSize: 10.5,
    color: colors.amberLight,
    fontWeight: '600',
  },

  // Category Row
  categoryRow: {
    marginBottom: 4,
  },
  categoryScroll: {
    gap: 6,
    paddingRight: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 22, 36, 0.94)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  catChipActive: {
    backgroundColor: colors.orangePrimary,
    borderColor: colors.orangePrimary,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  catChipTextActive: {
    color: '#07080B',
    fontWeight: '900',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(7, 8, 11, 0.25)',
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
  },
  countBadgeTextActive: {
    color: '#07080B',
  },

  // List View Styles
  listContainer: {
    flex: 1,
    backgroundColor: '#0B101D',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  feedCard: {
    backgroundColor: '#121727',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  feedCardImage: {
    width: '100%',
    height: 160,
  },
  feedCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(11, 16, 29, 0.25)',
  },
  feedCardHeader: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedCategoryBadge: {
    backgroundColor: 'rgba(11, 16, 29, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  feedCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.orangePrimary,
    textTransform: 'uppercase',
  },
  feedDistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(11, 16, 29, 0.88)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feedDistText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  feedDemoBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  feedDemoText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.amberLight,
  },
  feedPriceTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  feedPriceText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#07080B',
  },
  feedCardBody: {
    padding: 14,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 21,
    marginBottom: 4,
  },
  feedTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  feedMetaRow: {
    gap: 5,
    marginBottom: 12,
  },
  feedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  feedMetaText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  feedMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  feedMapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  feedAttendeeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedAttendeeText: {
    fontSize: 11,
    color: colors.textMuted,
  },

  // Map Mode Bottom Discovery Tray
  bottomTrayWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 900,
  },
  bottomTrayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  trayHeaderLeft: {},
  trayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  traySubtitle: {
    fontSize: 11,
    color: colors.textMuted,
  },
  trayListLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 22, 36, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trayListLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  trayCarouselContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  miniCard: {
    width: 190,
    backgroundColor: 'rgba(18, 23, 39, 0.96)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  miniCardImage: {
    width: '100%',
    height: 75,
  },
  miniCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: 'rgba(11, 16, 29, 0.2)',
  },
  miniCardTopBadges: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniCategoryBadge: {
    backgroundColor: 'rgba(11, 16, 29, 0.9)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniCategoryText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: colors.orangePrimary,
    textTransform: 'uppercase',
  },
  miniDemoBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniDemoText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: colors.amberLight,
  },
  miniCardBody: {
    padding: 8,
  },
  miniTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    lineHeight: 15,
    marginBottom: 4,
  },
  miniVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  miniVenueText: {
    fontSize: 9.5,
    color: colors.textMuted,
    flex: 1,
  },
  miniFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  miniTimeText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  miniPriceText: {
    fontSize: 9.5,
    color: '#10B981',
    fontWeight: '800',
  },

  // Empty States
  emptyStateContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  mapEmptyOverlay: {
    position: 'absolute',
    top: '35%',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 900,
  },
  emptyCard: {
    backgroundColor: 'rgba(16, 22, 36, 0.96)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 8,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyBtn: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#07080B',
  },
  emptyBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  emptyBtnTextOutline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121727',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '75%',
  },
  modalContentSmall: {
    backgroundColor: '#121727',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  areaItemActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  areaItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  areaItemTextCol: {
    flex: 1,
  },
  areaItemName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  areaItemTag: {
    fontSize: 11,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 6,
  },
});

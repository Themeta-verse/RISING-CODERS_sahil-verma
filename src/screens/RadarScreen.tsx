import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { calculateDistanceKm, formatDistance } from '../utils/distance';
import { RootStackParamList } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const RadarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { allEvents, isSaved, toggleSave } = useEvents();
  const { user } = useAuth();
  const { userCoordinates, locationName } = useLocation();
  const [radarRangeKm, setRadarRangeKm] = useState<number>(10);

  // Radar Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0.25,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [pulseAnim, pulseOpacity]);

  // Robust distance mapping: if user's real GPS is far (> 50 km) from demo city,
  // use the event's curated realistic distance so the radar is NEVER empty!
  const radarEvents = allEvents
    .map((e) => {
      const liveDist = calculateDistanceKm(userCoordinates, e.coordinates);
      const effectiveDist = liveDist > 50 ? (e.distanceKm ?? 2.5) : liveDist;
      return {
        ...e,
        distanceKm: effectiveDist,
      };
    })
    .filter((e) => e.distanceKm <= radarRangeKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const handleRangeChange = (km: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setRadarRangeKm(km);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Ambient Gradient Background Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(255, 107, 0, 0.2)',
            'rgba(7, 8, 11, 0.65)',
            '#07080B',
          ]}
          locations={[0, 0.35, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.radialAuraCircle} />
      </View>

      {/* Safe Header matching DiscoverScreen top offset */}
      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>HYPERLOCAL SCAN</Text>
            <Text style={styles.headerTitle}>Nearby Events</Text>
          </View>
          <View style={styles.headerRightGroup}>
            <View style={styles.livePulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.livePulseText}>LIVE</Text>
            </View>
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
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Radar Pulse Visual */}
        <View style={styles.radarVisualContainer}>
          <View style={styles.radarRingsWrapper}>
            <Animated.View
              style={[
                styles.radarRingOuter,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <View style={styles.radarRingOuterStatic}>
              <View style={styles.radarRingMiddle}>
                <View style={styles.radarRingInner}>
                  <Ionicons name="radio" size={32} color={colors.orangePrimary} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.radarInfoBadge}>
            <Text style={styles.radarInfoText}>
              {radarEvents.length} events detected within {radarRangeKm} km
            </Text>
          </View>
        </View>

        {/* Range Selector Pills */}
        <View style={styles.rangeSelectorRow}>
          {[3, 5, 10, 20, 35].map((km) => (
            <TouchableOpacity
              key={km}
              style={[styles.rangePill, radarRangeKm === km && styles.rangePillActive]}
              onPress={() => handleRangeChange(km)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.rangePillText,
                  radarRangeKm === km && styles.rangePillTextActive,
                ]}
              >
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Events List in Order of Proximity */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Closest to You</Text>
          {radarEvents.length === 0 ? (
            <View style={styles.emptyRadar}>
              <Ionicons
                name="radio-outline"
                size={28}
                color={colors.textMuted}
                style={styles.emptyRadarIcon}
              />
              <Text style={styles.emptyRadarTitle}>
                No events in {radarRangeKm} km radius
              </Text>
              <Text style={styles.emptyRadarSub}>
                Tap 20 km or 35 km above to expand your proximity scan.
              </Text>
            </View>
          ) : (
            radarEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventRow}
                onPress={() =>
                  navigation.navigate('EventDetail', { eventId: event.id })
                }
                activeOpacity={0.85}
              >
                {/* Event Thumbnail */}
                <Image
                  source={{ uri: event.imageUrl }}
                  style={styles.eventImage}
                />

                <View style={styles.eventInfo}>
                  <Text style={styles.eventCategory}>
                    {event.category.toUpperCase()} • {event.venue}
                  </Text>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <View style={styles.distanceBadgeRow}>
                    <Ionicons
                      name="location"
                      size={12}
                      color={colors.orangePrimary}
                    />
                    <Text style={styles.distanceText}>
                      {formatDistance(event.distanceKm)} away
                    </Text>
                  </View>
                </View>

                {/* Bookmark Button */}
                <TouchableOpacity
                  style={styles.bookmarkBtn}
                  onPress={() => toggleSave(event.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isSaved(event.id) ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={
                      isSaved(event.id) ? colors.orangePrimary : colors.textMuted
                    }
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
    height: 340,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    opacity: 0.6,
  },
  safeHeaderWrapper: {
    zIndex: 10,
    paddingBottom: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    marginTop: 2,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  livePulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  livePulseText: {
    ...typography.micro,
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  radarVisualContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  radarRingsWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRingOuter: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  radarRingOuterStatic: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.03)',
  },
  radarRingMiddle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.06)',
  },
  radarRingInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  radarInfoBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  radarInfoText: {
    fontSize: 12,
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  rangeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  rangePill: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(25, 28, 38, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rangePillActive: {
    backgroundColor: colors.orangePrimary,
    borderColor: colors.orangePrimary,
  },
  rangePillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: '#07080B',
    fontWeight: '800',
  },
  listSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(19, 21, 31, 0.85)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  eventImage: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  eventInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  eventCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.orangePrimary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bookmarkBtn: {
    padding: spacing.xs,
  },
  emptyRadar: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginVertical: spacing.sm,
  },
  emptyRadarIcon: {
    marginBottom: spacing.xs,
  },
  emptyRadarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyRadarSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

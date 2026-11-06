import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HyperlocalEvent } from '../types';
import { colors, spacing, borderRadius } from '../theme';
import { getCategoryTheme } from '../theme/colors';
import { getResponsiveCardDimensions } from '../utils/safeDimensions';

interface ReferenceEventCardProps {
  event: HyperlocalEvent;
  isSaved?: boolean;
  userInterests?: string[];
  matchExplanation?: string;
  onPress: () => void;
  onBookmarkPress: () => void;
}

export const ReferenceEventCard: React.FC<ReferenceEventCardProps> = ({
  event,
  isSaved = false,
  userInterests = [],
  matchExplanation,
  onPress,
  onBookmarkPress,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { cardWidth, cardHeight } = getResponsiveCardDimensions(windowWidth, windowHeight);
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      speed: 25,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      speed: 20,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  const handleBookmark = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onBookmarkPress();
  };

  // Deterministic, truthful match explanation (FR-05, FR-06, F25)
  const matchInfo = React.useMemo(() => {
    if (matchExplanation) {
      return { reason: matchExplanation, icon: 'compass' as const };
    }

    const isOnline = event.attendanceMode === 'online' || event.isOnline;
    const distStr = isOnline
      ? 'Virtual'
      : event.distanceKm !== undefined
      ? `${event.distanceKm} km away`
      : 'Nearby';

    // 1. Direct interest match
    const matchedInterest = userInterests.find((interest) => {
      const lower = interest.toLowerCase();
      return (
        event.category.toLowerCase().includes(lower) ||
        event.title.toLowerCase().includes(lower) ||
        event.tagline.toLowerCase().includes(lower) ||
        event.description.toLowerCase().includes(lower) ||
        (event.tags && event.tags.some((t) => t.toLowerCase().includes(lower)))
      );
    });

    if (matchedInterest) {
      return {
        reason: `${matchedInterest} Match · ${distStr}`,
        icon: 'heart' as const,
      };
    }

    // 2. Free event
    if (event.isFree) {
      return {
        reason: `Free Community Event · ${distStr}`,
        icon: 'ticket' as const,
      };
    }

    // 3. Proximity
    if (event.distanceKm !== undefined && event.distanceKm <= 3) {
      return {
        reason: `Nearby in Area · ${distStr}`,
        icon: 'navigate' as const,
      };
    }

    return {
      reason: `${event.category} · ${distStr}`,
      icon: 'compass' as const,
    };
  }, [event, userInterests, matchExplanation]);

  const catTheme = getCategoryTheme(event.category);
  const primaryAccent = (event.gradientColors && event.gradientColors[0]) || catTheme.primary;
  const secondaryAccent = (event.gradientColors && event.gradientColors[1]) || catTheme.secondary;
  const gradientColors = (event.gradientColors && event.gradientColors.length >= 2)
    ? [event.gradientColors[0], event.gradientColors[1]]
    : [catTheme.gradient[0], catTheme.gradient[1]];

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          width: cardWidth,
          height: cardHeight,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[
          styles.touchableCard,
          {
            borderColor: `${primaryAccent}55`,
            borderWidth: 1.5,
          },
        ]}
      >
        {/* Event Photo / Art */}
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Dynamic Multi-Stop Gradient matching category theme */}
        <LinearGradient
          colors={[
            `${gradientColors[0]}C8`, // ~78% vivid category primary at top
            `${gradientColors[1]}80`, // ~50% dynamic secondary accent
            'rgba(7, 8, 11, 0.95)',   // Deep obsidian bottom for high text contrast
          ]}
          locations={[0, 0.40, 0.92]}
          style={styles.gradientOverlay}
        />

        {/* Top Header of Card */}
        <View style={styles.topRow}>
          {/* Overlapping Attendee Avatar Circles (Left) */}
          <View style={styles.avatarStack}>
            {event.buddiesAttending.length > 0 ? (
              event.buddiesAttending.slice(0, 2).map((buddy, index) => (
                <Image
                  key={buddy.id}
                  source={{ uri: buddy.avatarUrl }}
                  style={[
                    styles.stackedAvatar,
                    { marginLeft: index === 0 ? 0 : -10 },
                  ]}
                />
              ))
            ) : event.organizer && event.organizer.avatarUrl ? (
              <Image
                source={{ uri: event.organizer.avatarUrl }}
                style={styles.stackedAvatar}
              />
            ) : (
              <View style={styles.soloBadge}>
                <Ionicons name="person" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Right Section: Bookmark & Crisp White Date Badge */}
          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.bookmarkButton, isSaved && styles.bookmarkButtonActive]}
              onPress={handleBookmark}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? colors.orangePrimary : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* White Squircle Date Badge (Exact from Reference Image) */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateDayText}>{event.dayNumber || '21'}</Text>
              <Text style={styles.dateMonthText}>{event.monthShort || 'DEC'}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Content of Card */}
        <View style={styles.bottomContent}>
          {/* Transparent Match Reason Badge (FR-05, FR-06) */}
          <View style={styles.matchBadgeRow}>
            <View style={styles.matchBadge}>
              <Ionicons name={matchInfo.icon} size={11} color={colors.orangePrimary} />
              <Text style={styles.matchBadgeText}>{matchInfo.reason}</Text>
            </View>
            {event.attendanceMode === 'online' && (
              <View style={styles.onlineBadge}>
                <Ionicons name="videocam" size={10} color="#60A5FA" />
                <Text style={styles.onlineBadgeText}>ONLINE</Text>
              </View>
            )}
            {event.attendanceMode === 'in_person' && (
              <View style={styles.inPersonBadge}>
                <Ionicons name="location" size={10} color="#34D399" />
                <Text style={styles.inPersonBadgeText}>IN-PERSON</Text>
              </View>
            )}
            {event.isFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>

          {/* Category Pill with Adaptive Theme Icon & Accent */}
          <View style={[styles.categoryBadgeRow, { marginBottom: 4 }]}>
            <View
              style={[
                styles.categoryThemePill,
                {
                  backgroundColor: catTheme.badgeBg,
                  borderColor: catTheme.badgeBorder,
                },
              ]}
            >
              <Ionicons name={catTheme.icon as any} size={11} color={catTheme.primary} />
              <Text style={[styles.categoryThemeText, { color: catTheme.primary }]}>
                {catTheme.tag}
              </Text>
            </View>
            <Text style={styles.categoryVenueText} numberOfLines={1}>
              {event.venue || event.category}
            </Text>
          </View>

          {/* Huge Bold Title */}
          <Text style={styles.titleText} numberOfLines={2}>
            {event.title}
          </Text>

          {/* Social Proof Subtitle: "Voted 1,456 Participants" */}
          <Text style={styles.votedText}>
            {`Voted ${(event.votedCount || event.attendeeCount).toLocaleString()} Participants`}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  touchableCard: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    zIndex: 2,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: colors.surfaceElevated,
  },
  soloBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 8, 11, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkButtonActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: colors.orangePrimary,
  },
  dateBadge: {
    width: 46,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  dateDayText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#07080B',
    lineHeight: 18,
    letterSpacing: -0.5,
  },
  dateMonthText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#07080B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md + 2,
    zIndex: 2,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryThemePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  categoryThemeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryVenueText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 26,
    marginBottom: 4,
  },
  votedText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  matchBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(7, 8, 11, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.orangePrimary,
    letterSpacing: 0.2,
  },
  freeBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.45)',
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.45)',
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  inPersonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  inPersonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
});

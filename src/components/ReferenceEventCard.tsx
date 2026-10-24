import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HyperlocalEvent } from '../types';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

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
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

    const distStr = event.distanceKm !== undefined ? `${event.distanceKm} km away` : 'Nearby';

    // 1. Direct interest match
    const matchedInterest = userInterests.find((interest) => {
      const lower = interest.toLowerCase();
      return (
        event.category.toLowerCase().includes(lower) ||
        event.title.toLowerCase().includes(lower) ||
        event.tagline.toLowerCase().includes(lower) ||
        event.description.toLowerCase().includes(lower)
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

  const gradientColors = event.gradientColors || colors.gradients.sunset;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.touchableCard}
      >
        {/* Event Photo / Art */}
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Dynamic Multi-Stop Gradient matching reference */}
        <LinearGradient
          colors={[
            `${gradientColors[0]}BB`, // ~75% opacity top
            `${gradientColors[1]}88`, // ~55% mid
            'rgba(7, 8, 11, 0.94)',   // Deep obsidian bottom
          ]}
          locations={[0, 0.42, 0.94]}
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
            {event.isFree && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>

          {/* Category Label (e.g. "Art Gallery" as in reference) */}
          <Text style={styles.categoryLabel}>
            {event.venue || event.category}
          </Text>

          {/* Huge Bold Title (e.g. "Cevin Sephora") */}
          <Text style={styles.titleText} numberOfLines={2}>
            {event.title}
          </Text>

          {/* Social Proof Subtitle: "Voted 1,456 Participants'" */}
          <Text style={styles.votedText}>
            Voted {event.votedCount?.toLocaleString() || event.attendeeCount.toLocaleString()} Participants'
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: 380,
    marginBottom: spacing.xl,
    alignSelf: 'center',
  },
  touchableCard: {
    flex: 1,
    borderRadius: borderRadius.card, // 28
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
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
    padding: spacing.lg,
    zIndex: 2,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: colors.surfaceElevated,
  },
  soloBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(7, 8, 11, 0.6)',
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
    width: 52,
    height: 54,
    borderRadius: borderRadius.md + 2,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#07080B',
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  dateMonthText: {
    fontSize: 10,
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
    padding: spacing.lg + 2,
    zIndex: 2,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 27,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 6,
  },
  votedText: {
    fontSize: 13,
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
});

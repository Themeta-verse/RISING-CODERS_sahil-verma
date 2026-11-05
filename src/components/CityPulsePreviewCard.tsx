import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HyperlocalEvent } from '../types';
import { formatDistance } from '../utils/distance';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - spacing.lg * 2, 420);

interface CityPulsePreviewCardProps {
  event: HyperlocalEvent | null;
  distanceKm: number;
  isVisible: boolean;
  onClose: () => void;
  onViewDetails?: (eventId: string) => void;
}

export const CityPulsePreviewCard: React.FC<CityPulsePreviewCardProps> = ({
  event,
  distanceKm,
  isVisible,
  onClose,
  onViewDetails,
}) => {
  const insets = useSafeAreaInsets();
  const [displayEvent, setDisplayEvent] = useState<HyperlocalEvent | null>(event);
  const translateY = useRef(new Animated.Value(150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (event) {
      setDisplayEvent(event);
    }
  }, [event]);

  useEffect(() => {
    if (isVisible && displayEvent) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 140,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, displayEvent, translateY, opacity]);

  if (!displayEvent) {
    return null;
  }

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
  };

  const handleViewDetails = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    if (onViewDetails && displayEvent) {
      onViewDetails(displayEvent.id);
    }
  };

  // Safe capacity & attendance calculations
  const remainingSpots =
    displayEvent.capacity !== undefined && displayEvent.registeredCount !== undefined
      ? Math.max(0, displayEvent.capacity - displayEvent.registeredCount)
      : undefined;

  const bottomOffset = Math.max(insets.bottom, 16) + 12;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          bottom: bottomOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      <View style={styles.cardContainer}>
        {/* Top Header Row with Dismiss Action */}
        <View style={styles.topRow}>
          <View style={styles.metaBadgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{displayEvent.category.toUpperCase()}</Text>
            </View>

            <View style={styles.distanceBadge}>
              <Ionicons name="navigate" size={10} color={colors.orangePrimary} />
              <Text style={styles.distanceText}>{formatDistance(distanceKm)}</Text>
            </View>

            {displayEvent.isSeedDemoData && (
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>DEMO</Text>
              </View>
            )}

            {displayEvent.price && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{displayEvent.price}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Middle Main Content Row */}
        <View style={styles.contentRow}>
          {/* Thumbnail */}
          {displayEvent.imageUrl ? (
            <Image
              source={{ uri: displayEvent.imageUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.fallbackThumbnail]}>
              <Ionicons name="sparkles" size={24} color={colors.orangePrimary} />
            </View>
          )}

          {/* Details */}
          <View style={styles.infoCol}>
            <Text style={styles.title} numberOfLines={2}>
              {displayEvent.title}
            </Text>

            <View style={styles.venueRow}>
              <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
              <Text style={styles.venueText} numberOfLines={1}>
                {displayEvent.venue}
              </Text>
            </View>

            <View style={styles.scheduleRow}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={styles.scheduleText} numberOfLines={1}>
                {displayEvent.displayDate || displayEvent.date} • {displayEvent.time}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer with Attendance and CTA */}
        <View style={styles.footerRow}>
          <View style={styles.attendanceInfo}>
            {remainingSpots !== undefined ? (
              <Text style={styles.attendanceText}>
                <Text style={styles.spotsHighlight}>{remainingSpots}</Text> spots left
              </Text>
            ) : displayEvent.attendeeCount > 0 ? (
              <Text style={styles.attendanceText}>
                <Text style={styles.spotsHighlight}>{displayEvent.attendeeCount}</Text> interested
              </Text>
            ) : (
              <Text style={styles.attendanceText}>Registration open</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.exploreButton}
            onPress={handleViewDetails}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreButtonText}>Explore Event</Text>
            <Ionicons name="arrow-forward" size={14} color="#07080B" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10000,
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(19, 21, 31, 0.96)',
    borderRadius: borderRadius.card,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: borderRadius.pill,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 0, 0.35)',
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: borderRadius.pill,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  demoBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  demoBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.amberLight,
    letterSpacing: 0.4,
  },
  priceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priceText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  fallbackThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 19,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  venueText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  spotsHighlight: {
    fontWeight: '800',
    color: colors.orangePrimary,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  exploreButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#07080B',
    letterSpacing: 0.2,
  },
});


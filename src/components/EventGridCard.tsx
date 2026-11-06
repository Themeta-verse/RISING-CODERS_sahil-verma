import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { HyperlocalEvent } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { formatDistance } from '../utils/distance';

interface EventGridCardProps {
  event: HyperlocalEvent;
  isSaved?: boolean;
  onPress?: () => void;
  onBookmarkPress?: () => void;
  variant?: 'portrait' | 'horizontal';
}

export const EventGridCard: React.FC<EventGridCardProps> = ({
  event,
  isSaved = false,
  onPress,
  onBookmarkPress,
  variant = 'portrait',
}) => {
  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        style={styles.horizontalContainer}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Image source={{ uri: event.imageUrl }} style={styles.horizontalThumb} />
        <View style={styles.horizontalBody}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryText}>{event.category}</Text>
            {event.distanceKm !== undefined && (
              <Text style={styles.distanceText}>• {formatDistance(event.distanceKm)}</Text>
            )}
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.venueText} numberOfLines={1}>
            {event.displayDate} • {event.venue}
          </Text>
        </View>

        <View style={styles.horizontalRight}>
          <Text style={styles.priceText}>{event.price}</Text>
          <TouchableOpacity
            style={[styles.smallBookmark, isSaved && styles.smallBookmarkActive]}
            onPress={onBookmarkPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={isSaved ? colors.amberPrimary : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.portraitContainer}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: event.imageUrl }} style={styles.portraitImage} />
        <LinearGradient
          colors={['transparent', 'rgba(9, 11, 14, 0.85)']}
          style={styles.imageGradient}
        />

        {/* Top Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>
          <TouchableOpacity
            style={[styles.smallBookmark, isSaved && styles.smallBookmarkActive]}
            onPress={onBookmarkPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={13}
              color={isSaved ? colors.amberPrimary : colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Distance on Image */}
        {event.distanceKm !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate-outline" size={10} color={colors.amberPrimary} />
            <Text style={styles.distanceBadgeText}>{formatDistance(event.distanceKm)}</Text>
          </View>
        )}
      </View>

      <View style={styles.detailsBody}>
        <Text style={styles.dateLabel}>{event.displayDate}</Text>
        <Text style={styles.titleText} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.venueFooter} numberOfLines={1}>
            {event.venue}
          </Text>
          <Text style={styles.priceHighlight}>{event.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Portrait Card Styles (Trending / Upcoming Grid)
  portraitContainer: {
    width: 175,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgeRow: {
    position: 'absolute',
    top: spacing.xs + 2,
    left: spacing.xs + 2,
    right: spacing.xs + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  categoryBadge: {
    backgroundColor: 'rgba(9, 11, 14, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  categoryBadgeText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontSize: 9,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(9, 11, 14, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    gap: 3,
  },
  distanceBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  detailsBody: {
    padding: spacing.sm,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.amberLight,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  titleText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  venueFooter: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
    marginRight: 4,
  },
  priceHighlight: {
    ...typography.caption,
    color: colors.amberPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  smallBookmark: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(9, 11, 14, 0.75)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBookmarkActive: {
    borderColor: colors.amberPrimary,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },

  // Horizontal Card Styles (Compact List in Upcoming)
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  horizontalThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
  },
  horizontalBody: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  categoryText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontSize: 10,
  },
  distanceText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  venueText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  horizontalRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
    paddingVertical: 2,
  },
  priceText: {
    ...typography.caption,
    color: colors.amberPrimary,
    fontWeight: '700',
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventCircle } from '../types';
import { colors, spacing, borderRadius } from '../theme';

interface EventCircleCardProps {
  circle: EventCircle;
  isJoining?: boolean;
  onPress: (circle: EventCircle) => void;
  onJoinToggle: (circle: EventCircle) => void;
}

export const EventCircleCard: React.FC<EventCircleCardProps> = ({
  circle,
  isJoining = false,
  onPress,
  onJoinToggle,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(circle)}
      activeOpacity={0.85}
    >
      {circle.coverImageUrl ? (
        <Image source={{ uri: circle.coverImageUrl }} style={styles.coverImage} />
      ) : (
        <View style={styles.coverFallback}>
          <Ionicons name="people" size={24} color={colors.amberPrimary} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <View style={styles.badgeRow}>
              {circle.isOfficial && (
                <View style={styles.officialBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={colors.orangePrimary} />
                  <Text style={styles.officialBadgeText}>Official Circle</Text>
                </View>
              )}
              <View style={styles.memberBadge}>
                <Ionicons name="person" size={10} color={colors.textMuted} />
                <Text style={styles.memberBadgeText}>{circle.memberCount} members</Text>
              </View>
            </View>

            <Text style={styles.circleName} numberOfLines={1}>
              {circle.name}
            </Text>
          </View>

          {/* Join / Leave Toggle */}
          <TouchableOpacity
            style={[styles.joinBtn, circle.isJoined && styles.joinBtnActive]}
            onPress={() => onJoinToggle(circle)}
            disabled={isJoining}
            activeOpacity={0.8}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={circle.isJoined ? colors.textMuted : colors.orangePrimary} />
            ) : circle.isJoined ? (
              <>
                <Ionicons name="checkmark" size={12} color="#10B981" />
                <Text style={styles.joinBtnActiveText}>Joined</Text>
              </>
            ) : (
              <>
                <Ionicons name="add" size={12} color={colors.orangePrimary} />
                <Text style={styles.joinBtnText}>Join</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {circle.tagline ? (
          <Text style={styles.taglineText} numberOfLines={2}>
            {circle.tagline}
          </Text>
        ) : null}

        {circle.meetingPoint ? (
          <View style={styles.meetingPointRow}>
            <Ionicons name="location-outline" size={12} color={colors.amberPrimary} />
            <Text style={styles.meetingPointText} numberOfLines={1}>
              {circle.meetingPoint}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1218',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  coverImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#1E2330',
  },
  coverFallback: {
    width: '100%',
    height: 70,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleBlock: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  memberBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  circleName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    gap: 3,
  },
  joinBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orangePrimary,
  },
  joinBtnActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  taglineText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  meetingPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  meetingPointText: {
    fontSize: 11,
    color: colors.amberLight,
    flex: 1,
  },
});

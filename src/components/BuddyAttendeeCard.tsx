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
import { BuddyProfile, ConnectionStatus, InterestMatchResult } from '../types';
import { calculateInterestMatch } from '../services/buddyMatchService';
import { colors, spacing, borderRadius, typography } from '../theme';

interface BuddyAttendeeCardProps {
  attendee: BuddyProfile;
  userInterests?: string[];
  eventCategory?: string;
  connectionStatus: ConnectionStatus;
  isProcessing?: boolean;
  onConnectPress: (attendee: BuddyProfile) => void;
  onCancelPress?: (attendee: BuddyProfile) => void;
  onAcceptPress?: (attendee: BuddyProfile) => void;
  onDeclinePress?: (attendee: BuddyProfile) => void;
  onChatPress?: (attendee: BuddyProfile) => void;
  requestNote?: string;
  compact?: boolean;
}

export const BuddyAttendeeCard: React.FC<BuddyAttendeeCardProps> = ({
  attendee,
  userInterests,
  eventCategory,
  connectionStatus,
  isProcessing = false,
  onConnectPress,
  onCancelPress,
  onAcceptPress,
  onDeclinePress,
  onChatPress,
  requestNote,
  compact = false,
}) => {
  const matchResult: InterestMatchResult = calculateInterestMatch(
    userInterests,
    attendee.interests,
    eventCategory
  );

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <Image source={{ uri: attendee.avatarUrl }} style={styles.avatar} />

        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{attendee.name}</Text>
            {attendee.isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>Host</Text>
              </View>
            )}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {attendee.attendanceStatus === 'confirmed'
                ? 'Confirmed Attendee'
                : attendee.attendanceStatus === 'attended'
                ? 'Attended'
                : 'Interested'}
            </Text>
          </View>
        </View>

        {/* Connection Action Button */}
        <View style={styles.actionBlock}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.orangePrimary} />
          ) : connectionStatus === 'connected' || connectionStatus === 'accepted' ? (
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => onChatPress && onChatPress(attendee)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles" size={13} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          ) : connectionStatus === 'pending_outgoing' ? (
            <View style={styles.pendingActionCol}>
              <TouchableOpacity
                style={styles.sentBtn}
                onPress={() => onCancelPress && onCancelPress(attendee)}
                activeOpacity={0.7}
              >
                <Ionicons name="time" size={12} color={colors.amberPrimary} style={{ marginRight: 4 }} />
                <Text style={styles.sentBtnText}>Request Sent</Text>
              </TouchableOpacity>
              <Text style={styles.waitingExplanationText}>Waiting for them to accept</Text>
            </View>
          ) : connectionStatus === 'pending_incoming' ? (
            <View style={styles.pendingActionCol}>
              <View style={styles.incomingRow}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => onAcceptPress && onAcceptPress(attendee)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={14} color="#07080B" style={{ marginRight: 3 }} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => onDeclinePress && onDeclinePress(attendee)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.incomingExplanationText}>Sent you a request</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => onConnectPress(attendee)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={13} color={colors.orangePrimary} />
              <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Introductory Note from Connection Request (if present) */}
      {requestNote ? (
        <View style={styles.requestNoteBubble}>
          <Ionicons name="chatbox-ellipses-outline" size={12} color={colors.amberPrimary} style={{ marginRight: 5 }} />
          <Text style={styles.requestNoteText} numberOfLines={2}>
            "{requestNote}"
          </Text>
        </View>
      ) : null}

      {/* Match Reason Banner */}
      <View
        style={[
          styles.matchBanner,
          matchResult.sharedCount > 0 && styles.matchBannerHighlighted,
        ]}
      >
        <Ionicons
          name={matchResult.sharedCount > 0 ? 'sparkles' : 'radio-outline'}
          size={12}
          color={matchResult.sharedCount > 0 ? colors.amberPrimary : colors.textMuted}
        />
        <Text
          style={[
            styles.matchReasonText,
            matchResult.sharedCount > 0 && styles.matchReasonHighlightedText,
          ]}
        >
          {matchResult.matchReason}
        </Text>
      </View>

      {/* Short Bio (if provided) */}
      {!compact && attendee.bio ? (
        <Text style={styles.bioText} numberOfLines={2}>
          {attendee.bio}
        </Text>
      ) : null}

      {/* Interest Pills */}
      {attendee.interests && attendee.interests.length > 0 && (
        <View style={styles.interestsRow}>
          {attendee.interests.slice(0, 4).map((interest, idx) => {
            const isShared = (userInterests || []).some(
              (ui) => ui.trim().toLowerCase() === interest.trim().toLowerCase()
            );
            return (
              <View
                key={`${attendee.id}-int-${idx}`}
                style={[styles.interestChip, isShared && styles.sharedInterestChip]}
              >
                {isShared && (
                  <Ionicons name="checkmark" size={10} color={colors.amberPrimary} style={{ marginRight: 3 }} />
                )}
                <Text
                  style={[
                    styles.interestChipText,
                    isShared && styles.sharedInterestChipText,
                  ]}
                >
                  {interest}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1218',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardCompact: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E2330',
  },
  nameBlock: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hostBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginLeft: 6,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionBlock: {
    marginLeft: spacing.xs,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  connectBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orangePrimary,
    marginLeft: 4,
  },
  sentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  sentBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingActionCol: {
    alignItems: 'flex-end',
  },
  waitingExplanationText: {
    fontSize: 10,
    color: colors.amberLight,
    fontWeight: '600',
    marginTop: 3,
  },
  incomingExplanationText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  acceptBtn: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: 8,
    height: 30,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#07080B',
  },
  declineBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestNoteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 4,
  },
  requestNoteText: {
    ...typography.caption,
    color: colors.amberLight,
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
  },
  matchBannerHighlighted: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  matchReasonText: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 6,
  },
  matchReasonHighlightedText: {
    color: colors.amberLight,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
    marginBottom: 6,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  interestChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedInterestChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
  },
  interestChipText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sharedInterestChipText: {
    color: colors.amberLight,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList, EventCircle, BuddyProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchEventCircles,
  joinEventCircle,
  leaveEventCircle,
  fetchEventBuddyAttendees,
} from '../services/buddyMatchService';
import { colors, spacing, borderRadius } from '../theme';

type EventCircleDetailRouteProp = RouteProp<RootStackParamList, 'EventCircleDetail'>;
type EventCircleDetailNavProp = NativeStackNavigationProp<RootStackParamList, 'EventCircleDetail'>;

export const EventCircleDetailScreen: React.FC = () => {
  const route = useRoute<EventCircleDetailRouteProp>();
  const navigation = useNavigation<EventCircleDetailNavProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { circleId, eventId } = route.params;

  const [circle, setCircle] = useState<EventCircle | null>(null);
  const [members, setMembers] = useState<BuddyProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTogglingMembership, setIsTogglingMembership] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const loadCircleData = async () => {
      setIsLoading(true);
      try {
        const circles = await fetchEventCircles(eventId, undefined, user?.id);
        const currentCircle = circles.find((c) => c.id === circleId) || circles[0];

        if (isMounted && currentCircle) {
          setCircle(currentCircle);
        }

        // Load members/attendees
        if (eventId) {
          const attendeeList = await fetchEventBuddyAttendees(eventId, user?.id);
          if (isMounted) {
            setMembers(attendeeList);
          }
        }
      } catch (err) {
        console.warn('Error loading circle details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCircleData();

    return () => {
      isMounted = false;
    };
  }, [circleId, eventId, user?.id]);

  const handleToggleMembership = async () => {
    if (!circle || !user) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsTogglingMembership(true);

    if (circle.isJoined) {
      const res = await leaveEventCircle(circle.id, user.id);
      if (res.success) {
        setCircle({
          ...circle,
          isJoined: false,
          memberCount: Math.max(1, circle.memberCount - 1),
        });
      } else {
        Alert.alert('Notice', res.error || 'Could not leave circle');
      }
    } else {
      const res = await joinEventCircle(circle.id, user.id);
      if (res.success) {
        setCircle({
          ...circle,
          isJoined: true,
          memberCount: circle.memberCount + 1,
        });
        Alert.alert('Welcome to the Circle! 🎉', `You joined "${circle.name}".`);
      } else {
        Alert.alert('Notice', res.error || 'Could not join circle');
      }
    }

    setIsTogglingMembership(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.orangePrimary} />
        <Text style={styles.loadingText}>Loading Circle...</Text>
      </View>
    );
  }

  if (!circle) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Circle not found</Text>
        <TouchableOpacity style={styles.backBtnFallback} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.navBackBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {circle.name}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover Photo */}
        {circle.coverImageUrl ? (
          <Image source={{ uri: circle.coverImageUrl }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverFallback}>
            <Ionicons name="people" size={40} color={colors.amberPrimary} />
          </View>
        )}

        <View style={styles.mainBlock}>
          {/* Metadata badges */}
          <View style={styles.badgeRow}>
            {circle.isOfficial && (
              <View style={styles.officialBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.orangePrimary} />
                <Text style={styles.officialBadgeText}>Verified Community Circle</Text>
              </View>
            )}
            <View style={styles.memberBadge}>
              <Ionicons name="people" size={11} color={colors.textMuted} />
              <Text style={styles.memberBadgeText}>{circle.memberCount} members</Text>
            </View>
          </View>

          <Text style={styles.title}>{circle.name}</Text>
          {circle.tagline ? <Text style={styles.tagline}>{circle.tagline}</Text> : null}

          {/* Join / Leave Main Action Button */}
          <TouchableOpacity
            style={[styles.actionBtn, circle.isJoined && styles.actionBtnJoined]}
            onPress={handleToggleMembership}
            disabled={isTogglingMembership}
            activeOpacity={0.85}
          >
            {isTogglingMembership ? (
              <ActivityIndicator color={circle.isJoined ? colors.textPrimary : '#07080B'} />
            ) : circle.isJoined ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.actionBtnJoinedText}>Member of Circle (Leave)</Text>
              </>
            ) : (
              <>
                <Ionicons name="person-add" size={18} color="#07080B" />
                <Text style={styles.actionBtnText}>Join This Circle</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Description Section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>About This Community</Text>
            <Text style={styles.bodyText}>{circle.description}</Text>
          </View>

          {/* Meeting Point Card */}
          {circle.meetingPoint ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="location" size={16} color={colors.orangePrimary} />
                <Text style={styles.sectionHeading}>Meeting Point & Pre-Event Spot</Text>
              </View>
              <Text style={styles.bodyText}>{circle.meetingPoint}</Text>
            </View>
          ) : null}

          {/* Rules & Community Vibe */}
          {circle.rulesAndVibe ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="sparkles" size={16} color={colors.amberPrimary} />
                <Text style={styles.sectionHeading}>Circle Vibe & Guidelines</Text>
              </View>
              <Text style={styles.bodyText}>{circle.rulesAndVibe}</Text>
            </View>
          ) : null}

          {/* Active Members Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-circle-outline" size={18} color={colors.amberLight} />
              <Text style={styles.sectionHeading}>Active Attendees in Circle ({members.length})</Text>
            </View>

            {members.length === 0 ? (
              <Text style={styles.emptyMembersText}>Be the first to connect in this circle!</Text>
            ) : (
              <View style={styles.membersList}>
                {members.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      {member.bio ? (
                        <Text style={styles.memberBio} numberOfLines={1}>
                          {member.bio}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.memberChip}>
                      <Text style={styles.memberChipText}>Active</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07080B',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#07080B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  backBtnFallback: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
  },
  backBtnFallbackText: {
    color: '#07080B',
    fontWeight: '600',
  },
  navHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  navBackBtn: {
    padding: 6,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1E2330',
  },
  coverFallback: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBlock: {
    padding: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 28,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangePrimary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    gap: 8,
    marginBottom: spacing.md,
  },
  actionBtnJoined: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#07080B',
  },
  actionBtnJoinedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  sectionCard: {
    backgroundColor: '#0F1218',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  emptyMembersText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  membersList: {
    marginTop: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2330',
  },
  memberInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  memberBio: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  memberChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
  },
  memberChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.amberLight,
  },
});

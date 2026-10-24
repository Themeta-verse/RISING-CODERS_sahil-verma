import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { ReferenceEventCard } from '../components/ReferenceEventCard';
import { RootStackParamList } from '../types';
import { colors, spacing, borderRadius } from '../theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MyEventsTab = 'saved' | 'upcoming' | 'attended';

export const SavedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { allEvents, savedIds, isSaved, toggleSave, rsvpIds, attendedIds } = useEvents();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<MyEventsTab>('saved');

  const savedEvents = allEvents.filter((event) => savedIds.includes(event.id));
  const upcomingEvents = allEvents.filter(
    (event) => rsvpIds.includes(event.id) && !attendedIds.includes(event.id)
  );
  const attendedEvents = allEvents.filter((event) => attendedIds.includes(event.id));

  const currentList =
    activeTab === 'saved'
      ? savedEvents
      : activeTab === 'upcoming'
      ? upcomingEvents
      : attendedEvents;

  const handleCardPress = (eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleExplore = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    // @ts-ignore
    navigation.navigate('Discover');
  };

  const handleTabSwitch = (tab: MyEventsTab) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setActiveTab(tab);
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

      {/* Safe Header */}
      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>YOUR CALENDAR & PASSES</Text>
            <Text style={styles.headerTitle}>My Events</Text>
          </View>
          <View style={styles.headerRightGroup}>
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

        {/* In-Place Segmented Control: Saved, Upcoming, Attended */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'saved' && styles.segmentBtnActive]}
            onPress={() => handleTabSwitch('saved')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'saved' ? 'bookmark' : 'bookmark-outline'}
              size={14}
              color={activeTab === 'saved' ? '#07080B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'saved' && styles.segmentBtnTextActive,
              ]}
            >
              Saved ({savedEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'upcoming' && styles.segmentBtnActive]}
            onPress={() => handleTabSwitch('upcoming')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'upcoming' ? 'ticket' : 'ticket-outline'}
              size={14}
              color={activeTab === 'upcoming' ? '#07080B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'upcoming' && styles.segmentBtnTextActive,
              ]}
            >
              Upcoming ({upcomingEvents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'attended' && styles.segmentBtnActive]}
            onPress={() => handleTabSwitch('attended')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'attended' ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={14}
              color={activeTab === 'attended' ? '#07080B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'attended' && styles.segmentBtnTextActive,
              ]}
            >
              Attended ({attendedEvents.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={
                  activeTab === 'saved'
                    ? 'bookmark-outline'
                    : activeTab === 'upcoming'
                    ? 'ticket-outline'
                    : 'calendar-outline'
                }
                size={34}
                color={colors.orangePrimary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'saved'
                ? 'No saved events yet'
                : activeTab === 'upcoming'
                ? 'No upcoming registrations'
                : 'No attended events yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'saved'
                ? 'Tap the bookmark button on any event card from the main feed to save it here for quick access.'
                : activeTab === 'upcoming'
                ? 'When you register for an event, your reserved seat and pass will be securely tracked here.'
                : 'Events you check into or complete will be listed here separately from your upcoming registrations.'}
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={handleExplore}
              activeOpacity={0.85}
            >
              <Ionicons name="compass-outline" size={17} color="#07080B" />
              <Text style={styles.exploreBtnText}>Explore Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          currentList.map((event) => (
            <View key={event.id} style={styles.cardWrapper}>
              {activeTab === 'upcoming' && (
                <View style={styles.upcomingBadgeRow}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.orangePrimary} />
                  <Text style={styles.upcomingBadgeText}>SEAT RESERVED • TAP FOR PASS</Text>
                </View>
              )}
              {activeTab === 'attended' && (
                <View style={styles.attendedBadgeRow}>
                  <Ionicons name="checkmark-done" size={12} color={colors.success} />
                  <Text style={styles.attendedBadgeText}>ATTENDED & CHECKED IN</Text>
                </View>
              )}
              <ReferenceEventCard
                event={event}
                isSaved={isSaved(event.id)}
                userInterests={user?.interests || []}
                onPress={() => handleCardPress(event.id)}
                onBookmarkPress={() => toggleSave(event.id)}
              />
            </View>
          ))
        )}
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
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.pill,
    padding: 3,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.pill,
    gap: 5,
  },
  segmentBtnActive: {
    backgroundColor: colors.orangePrimary,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#07080B',
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: spacing.xs,
    paddingBottom: 110,
  },
  cardWrapper: {
    marginBottom: spacing.xs,
  },
  upcomingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: 4,
    gap: 4,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.5,
  },
  attendedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: 4,
    gap: 4,
  },
  attendedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.pill,
  },
  exploreBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#07080B',
  },
});

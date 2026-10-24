import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../types';
import { useEvents } from '../context/EventsContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { calculateDistanceKm, formatDistance } from '../utils/distance';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EventDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<EventDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { eventId } = route.params;

  const {
    getEventById,
    isSaved,
    toggleSave,
    isRsvpd,
    registerForEvent,
    cancelRegistration,
    getEventAttendeeCount,
    allEvents,
  } = useEvents();
  const { userCoordinates } = useLocation();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrganizerModalVisible, setIsOrganizerModalVisible] = useState(false);

  const event = getEventById(eventId);

  if (!event) {
    return (
      <SafeAreaView style={styles.errorSafe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Enforce draft privacy: only the owning organizer can preview drafts
  const isDraft = event.status === 'draft';
  const isHost = event.organizer.id === user?.id || event.organizer.id === 'org-you';

  if (isDraft && !isHost) {
    return (
      <SafeAreaView style={styles.errorSafe}>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.amberPrimary} style={{ marginBottom: spacing.md }} />
          <Text style={styles.errorText}>Private Draft</Text>
          <Text style={styles.draftPrivateMessage}>
            This listing is an unpublished draft and is only accessible by its host.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Return to Discovery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const saved = isSaved(event.id);
  const rsvpd = isRsvpd(event.id);
  const attendeeCount = getEventAttendeeCount(event);
  const distance = calculateDistanceKm(userCoordinates, event.coordinates);

  const capacity = event.capacity ?? 100;
  const registeredCount = event.registeredCount ?? attendeeCount;
  const capacityPercent = Math.min(100, Math.round((registeredCount / capacity) * 100));
  const spotsLeft = Math.max(0, capacity - registeredCount);
  const isFull = spotsLeft === 0;
  const isCancelled = event.status === 'cancelled';
  const isDeadlinePassed = event.registrationDeadline
    ? new Date(event.registrationDeadline).getTime() < Date.now()
    : false;

  const formatDeadline = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const shareUrl = `https://socialbuddy.io/e/${event.id}`;
      await Share.share({
        title: event.title,
        message: `Join me at "${event.title}" on Social Buddy!\n🗓️ ${event.displayDate} at ${event.time}\n📍 ${event.venue}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled share
    }
  };

  const handleGetDirections = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const query = encodeURIComponent(`${event.venue}, ${event.address}`);
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      const canOpen = await Linking.canOpenURL(mapUrl);
      if (canOpen) {
        await Linking.openURL(mapUrl);
      } else {
        Alert.alert('Venue Location', `${event.venue}\n${event.address}`);
      }
    } catch {
      Alert.alert('Venue Location', `${event.venue}\n${event.address}`);
    }
  };

  const handleRegister = async () => {
    if (isDraft) {
      Alert.alert('Draft Mode', 'This event has not been published yet. You can publish it in the Host Command Center.');
      return;
    }
    if (isCancelled) {
      Alert.alert('Event Cancelled', event.cancellationReason || 'This event is no longer accepting registrations.');
      return;
    }
    if (isFull) {
      Alert.alert('Event Full', 'All seats for this event have been claimed.');
      return;
    }
    if (isDeadlinePassed) {
      Alert.alert('Registration Closed', 'The registration deadline for this event has passed.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSubmitting(true);
      const result = await registerForEvent(event.id);
      setIsSubmitting(false);

      if (result.success) {
        Alert.alert('Registration Confirmed! 🎉', result.message || 'Your seat has been reserved.');
      } else {
        Alert.alert('Registration Failed', result.error || result.message || 'Could not complete registration.');
      }
    } catch {
      setIsSubmitting(false);
      Alert.alert('Registration Error', 'An unexpected error occurred while reserving your seat.');
    }
  };

  const handleCancelRegistration = () => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration? Your reserved seat will be immediately released to other participants.',
      [
        { text: 'Keep My Seat', style: 'cancel' },
        {
          text: 'Yes, Cancel Seat',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setIsSubmitting(true);
              const result = await cancelRegistration(event.id);
              setIsSubmitting(false);

              if (result.success) {
                Alert.alert('Registration Cancelled', result.message || 'Your registration has been cancelled.');
              } else {
                Alert.alert('Cancellation Error', result.error || result.message || 'Could not cancel registration.');
              }
            } catch {
              setIsSubmitting(false);
              Alert.alert('Cancellation Error', 'Could not process cancellation at this time.');
            }
          },
        },
      ]
    );
  };

  const checklist = event.checklist || {};
  const idRequirementText =
    checklist.idRequired === true
      ? 'Government or Student Photo ID required'
      : checklist.idRequired === false
      ? 'No ID verification required'
      : checklist.idRequirement
      ? checklist.idRequirement
      : 'Not provided.';

  // Catalog of events by the same organizer
  const organizerOtherEvents = allEvents.filter(
    (e) =>
      e.id !== event.id &&
      (e.organizer.id === event.organizer.id || e.organizer.name === event.organizer.name)
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Full-Bleed Poster Image */}
        <View style={styles.posterContainer}>
          <Image source={{ uri: event.imageUrl }} style={styles.posterImage} />
          <LinearGradient
            colors={['rgba(9, 11, 14, 0.4)', 'transparent', colors.background]}
            locations={[0, 0.4, 0.98]}
            style={styles.gradientOverlay}
          />

          {/* Floating Top Nav Bar */}
          <View
            style={[
              styles.topNavSafe,
              { paddingTop: Math.max(insets.top, 38) + 8 },
            ]}
          >
            <View style={styles.topNav}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>

              <View style={styles.topNavRight}>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.circleButton, saved && styles.circleButtonSaved]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleSave(event.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={saved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={saved ? colors.orangePrimary : colors.textPrimary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Event Main Info */}
        <View style={styles.body}>
          {/* Badge Row */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{event.category}</Text>
            </View>

            {/* Event Lifecycle Status */}
            {isDraft ? (
              <View style={styles.draftPill}>
                <Ionicons name="eye-outline" size={12} color={colors.amberPrimary} />
                <Text style={styles.draftPillText}>DRAFT PREVIEW</Text>
              </View>
            ) : isCancelled ? (
              <View style={styles.cancelledPill}>
                <Ionicons name="alert-circle" size={12} color={colors.danger} />
                <Text style={styles.cancelledPillText}>CANCELLED</Text>
              </View>
            ) : (
              <View style={styles.publishedPill}>
                <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                <Text style={styles.publishedPillText}>PUBLISHED</Text>
              </View>
            )}

            {event.isVerifiedRealWorld ? (
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <Text style={styles.verifiedPillText}>Verified Real-World</Text>
              </View>
            ) : (
              <View style={styles.demoPill}>
                <Ionicons name="flask-outline" size={12} color={colors.amberLight} />
                <Text style={styles.demoPillText}>Demonstration</Text>
              </View>
            )}

            <View style={styles.distancePill}>
              <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.distancePillText}>{formatDistance(distance)}</Text>
            </View>
          </View>

          {/* Draft Preview Notice for Host */}
          {isDraft && (
            <View style={styles.draftBanner}>
              <Ionicons name="shield-outline" size={18} color={colors.amberPrimary} />
              <View style={styles.draftBannerContent}>
                <Text style={styles.draftBannerTitle}>Private Draft Mode</Text>
                <Text style={styles.draftBannerText}>
                  This listing is private and hidden from public discovery. Only you as host can view this preview.
                </Text>
              </View>
            </View>
          )}

          {/* Cancellation Notice Banner */}
          {isCancelled && (
            <View style={styles.cancellationBanner}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
              <View style={styles.cancellationBannerContent}>
                <Text style={styles.cancellationBannerTitle}>Event Cancelled</Text>
                <Text style={styles.cancellationBannerText}>
                  {event.cancellationReason || 'This event has been cancelled by the host. Registrations are closed.'}
                </Text>
              </View>
            </View>
          )}

          {/* Title & Tagline */}
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.tagline}>{event.tagline}</Text>

          {/* Organizer Operational Announcements (Milestone 4) */}
          {event.announcements && event.announcements.length > 0 && (
            <View style={styles.announcementsContainer}>
              <View style={styles.announcementsHeader}>
                <Ionicons name="megaphone-outline" size={16} color={colors.orangePrimary} />
                <Text style={styles.announcementsHeading}>
                  Organizer Updates ({event.announcements.length})
                </Text>
              </View>
              {event.announcements.map((ann) => (
                <View
                  key={ann.id}
                  style={[
                    styles.announcementCard,
                    ann.isUrgent && styles.announcementCardUrgent,
                  ]}
                >
                  <View style={styles.announcementTitleRow}>
                    <Text style={styles.announcementTitle}>{ann.title}</Text>
                    {ann.isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.announcementMessage}>{ann.message}</Text>
                  <Text style={styles.announcementTime}>
                    {new Date(ann.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Persisted Registration Confirmation Pass Card (When Registered) */}
          {rsvpd && (
            <View style={styles.confirmationCard}>
              <LinearGradient
                colors={['rgba(255, 107, 0, 0.15)', 'rgba(245, 158, 11, 0.05)']}
                style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.lg }]}
              />
              <View style={styles.confirmationHeader}>
                <View style={styles.confirmationBadge}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.orangePrimary} />
                  <Text style={styles.confirmationBadgeText}>REGISTRATION CONFIRMED</Text>
                </View>
                <Text style={styles.confirmationPassId}>
                  Pass #SB-{event.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.confirmationNotice}>
                Your seat is guaranteed! Show your registered name at the entrance reception.
              </Text>
              <View style={styles.confirmationFooter}>
                <TouchableOpacity
                  style={styles.cancelPassBtn}
                  onPress={handleCancelRegistration}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.cancelPassBtnText}>Cancel My Registration</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Timing & Timezone Card */}
          <View style={styles.infoCard}>
            <View style={styles.iconSquare}>
              <Ionicons name="calendar-outline" size={20} color={colors.amberPrimary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{event.displayDate}</Text>
              <Text style={styles.infoSubtitle}>
                {event.time}
                {event.endTime ? ` – ${event.endTime}` : ''} • {event.timezone || 'Local Time'}
              </Text>
            </View>
          </View>

          {/* Venue & Directions Card */}
          <View style={styles.infoCard}>
            <View style={styles.iconSquare}>
              <Ionicons name="map-outline" size={20} color={colors.amberPrimary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{event.venue}</Text>
              <Text style={styles.infoSubtitle}>{event.address}</Text>
            </View>
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={handleGetDirections}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-outline" size={14} color={colors.orangePrimary} />
              <Text style={styles.directionsBtnText}>Directions</Text>
            </TouchableOpacity>
          </View>

          {/* Capacity & Availability Status */}
          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <View style={styles.capacityLabelRow}>
                <Ionicons name="people-outline" size={16} color={colors.amberPrimary} />
                <Text style={styles.capacityLabel}>Seat Availability</Text>
              </View>
              <Text
                style={[
                  styles.spotsLeftText,
                  isFull && styles.spotsLeftFull,
                  isCancelled && styles.spotsLeftCancelled,
                ]}
              >
                {isCancelled
                  ? 'Registration Closed'
                  : isFull
                  ? 'Full (0 spots left)'
                  : `${spotsLeft} seats available`}
              </Text>
            </View>

            {/* Capacity Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${capacityPercent}%` },
                  isFull && styles.progressBarFull,
                ]}
              />
            </View>

            <View style={styles.capacitySubRow}>
              <Text style={styles.capacityCountText}>
                {registeredCount} / {capacity} registered ({capacityPercent}%)
              </Text>
              {event.registrationDeadline && (
                <Text style={styles.deadlineText}>
                  Deadline: {formatDeadline(event.registrationDeadline)}
                </Text>
              )}
            </View>
          </View>

          {/* Structured Agenda Section */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Event Agenda</Text>
            {event.agenda && event.agenda.length > 0 ? (
              <View style={styles.agendaTimeline}>
                {event.agenda.map((item, index) => (
                  <View key={index} style={styles.agendaItemRow}>
                    <View style={styles.agendaTimeBadge}>
                      <Text style={styles.agendaTimeText}>{item.time}</Text>
                    </View>
                    <View style={styles.agendaLineMarker} />
                    <View style={styles.agendaContent}>
                      <Text style={styles.agendaItemTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.agendaItemDesc}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.fallbackCard}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text style={styles.fallbackCardText}>
                  Detailed timetable will be announced closer to the event schedule.
                </Text>
              </View>
            )}
          </View>

          {/* Ready-to-Attend Checklist Section */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Ready-to-Attend Checklist</Text>
              <View style={styles.checklistTag}>
                <Ionicons name="list" size={12} color={colors.amberPrimary} />
                <Text style={styles.checklistTagText}>Pre-arrival</Text>
              </View>
            </View>

            <View style={styles.checklistGrid}>
              {/* Skill Level */}
              <View style={styles.checklistItem}>
                <Ionicons name="school-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Skill Level</Text>
                  <Text style={styles.checklistItemValue}>
                    {checklist.skillLevel?.trim() || 'Not provided.'}
                  </Text>
                </View>
              </View>

              {/* Eligibility */}
              <View style={styles.checklistItem}>
                <Ionicons name="person-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Eligibility</Text>
                  <Text style={styles.checklistItemValue}>
                    {checklist.eligibility?.trim() || 'Not provided.'}
                  </Text>
                </View>
              </View>

              {/* Solo / Team Rules */}
              <View style={styles.checklistItem}>
                <Ionicons name="people-circle-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Team / Solo Rules</Text>
                  <Text style={styles.checklistItemValue}>
                    {checklist.teamRules?.trim() || 'Not provided.'}
                  </Text>
                </View>
              </View>

              {/* Equipment Required */}
              <View style={styles.checklistItem}>
                <Ionicons name="laptop-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Equipment Required</Text>
                  <Text style={styles.checklistItemValue}>
                    {(checklist.equipmentRequired || checklist.equipment)?.trim() || 'Not provided.'}
                  </Text>
                </View>
              </View>

              {/* ID Requirement */}
              <View style={styles.checklistItem}>
                <Ionicons name="card-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Identification</Text>
                  <Text style={styles.checklistItemValue}>{idRequirementText}</Text>
                </View>
              </View>

              {/* Accessibility */}
              <View style={styles.checklistItem}>
                <Ionicons name="accessibility-outline" size={18} color={colors.amberLight} />
                <View style={styles.checklistItemContent}>
                  <Text style={styles.checklistItemLabel}>Accessibility</Text>
                  <Text style={styles.checklistItemValue}>
                    {checklist.accessibility?.trim() || 'Not provided.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>About the Event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>

          {/* Host / Organizer Card with Public Profile Modal Trigger (Milestone 4) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Organized By</Text>
            <TouchableOpacity
              style={styles.organizerCard}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsOrganizerModalVisible(true);
              }}
            >
              <Image source={{ uri: event.organizer.avatarUrl }} style={styles.organizerAvatar} />
              <View style={styles.organizerInfo}>
                <View style={styles.organizerNameRow}>
                  <Text style={styles.organizerName}>{event.organizer.name}</Text>
                  {event.organizer.isVerified ? (
                    <Ionicons name="checkmark-circle" size={14} color={colors.amberPrimary} />
                  ) : (
                    <View style={styles.sampleTag}>
                      <Text style={styles.sampleTagText}>Community Host</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.organizerRole}>{event.organizer.role || 'Event Organizer'}</Text>
              </View>
              <View style={styles.viewProfileChip}>
                <Text style={styles.viewProfileChipText}>View Profile</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.amberPrimary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Demonstration Notice */}
          {event.isSeedDemoData && (
            <View style={styles.demoNoticeCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.amberLight} />
              <Text style={styles.demoNoticeText}>
                Notice: Seeded demonstration listing showcasing Hyperlocal Event Discovery. Registrations are persisted locally and synchronized with Supabase transactional RPC locks.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed Sticky Registration Bottom Bar */}
      <SafeAreaView style={styles.stickyBottomSafe}>
        <View style={styles.stickyBottom}>
          <View style={styles.priceColumn}>
            <Text style={styles.priceLabel}>Admission</Text>
            <Text style={styles.priceValue}>{event.price}</Text>
          </View>

          {/* Action Button: States for Draft, Registered, Full, Cancelled, Closed, or Ready */}
          {isDraft ? (
            <TouchableOpacity
              style={styles.rsvpButton}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('MainTabs', { screen: 'Host' });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color="#07080B" />
              <Text style={styles.rsvpButtonText}>Host Center (Draft)</Text>
            </TouchableOpacity>
          ) : isCancelled ? (
            <View style={[styles.rsvpButton, styles.buttonDisabled]}>
              <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.buttonDisabledText}>Event Cancelled</Text>
            </View>
          ) : rsvpd ? (
            <TouchableOpacity
              style={[styles.rsvpButton, styles.rsvpButtonActive]}
              onPress={handleCancelRegistration}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.orangePrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.orangePrimary} />
                  <Text style={styles.rsvpButtonTextActive}>Seat Confirmed</Text>
                </>
              )}
            </TouchableOpacity>
          ) : isFull ? (
            <View style={[styles.rsvpButton, styles.buttonDisabled]}>
              <Ionicons name="people" size={18} color={colors.textMuted} />
              <Text style={styles.buttonDisabledText}>Capacity Full</Text>
            </View>
          ) : isDeadlinePassed ? (
            <View style={[styles.rsvpButton, styles.buttonDisabled]}>
              <Ionicons name="time" size={18} color={colors.textMuted} />
              <Text style={styles.buttonDisabledText}>Deadline Passed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.rsvpButton}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#07080B" />
              ) : (
                <>
                  <Ionicons name="ticket-outline" size={18} color="#07080B" />
                  <Text style={styles.rsvpButtonText}>Register Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Organizer Public Profile Modal (Milestone 4: F15) */}
      <Modal
        visible={isOrganizerModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOrganizerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalCard}>
            <View style={styles.modalTopBar}>
              <Text style={styles.modalHeading}>Organizer Profile</Text>
              <TouchableOpacity
                onPress={() => setIsOrganizerModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHeaderSection}>
                <Image
                  source={{ uri: event.organizer.avatarUrl }}
                  style={styles.profileLargeAvatar}
                />
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileNameText}>{event.organizer.name}</Text>
                  {event.organizer.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.amberPrimary} />
                  )}
                </View>
                <Text style={styles.profileRoleText}>
                  {event.organizer.role || 'Verified Community Organizer'}
                </Text>
                <View style={styles.verifiedTierPill}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                  <Text style={styles.verifiedTierText}>Community Verified Organizer</Text>
                </View>
              </View>

              {/* Bio */}
              <Text style={styles.profileSectionTitle}>About Organizer</Text>
              <Text style={styles.profileBioText}>
                {event.organizer.bio ||
                  'Hyperlocal organizer bringing communities together through experiential meetups, developer hackathons, and creative gatherings in the city.'}
              </Text>

              {/* Contact & Links */}
              <View style={styles.profileLinksRow}>
                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => {
                    const email = event.organizer.contactEmail || 'organizer@socialbuddy.io';
                    Linking.openURL(`mailto:${email}?subject=Question regarding ${event.title}`);
                  }}
                >
                  <Ionicons name="mail-outline" size={16} color={colors.orangePrimary} />
                  <Text style={styles.profileActionBtnText}>Contact Host</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.profileActionBtn}
                  onPress={() => {
                    const url = event.organizer.websiteUrl || 'https://socialbuddy.io';
                    Linking.openURL(url);
                  }}
                >
                  <Ionicons name="globe-outline" size={16} color={colors.amberPrimary} />
                  <Text style={styles.profileActionBtnText}>Website</Text>
                </TouchableOpacity>
              </View>

              {/* Other Events by Host */}
              {organizerOtherEvents.length > 0 && (
                <View style={styles.profileEventsSection}>
                  <Text style={styles.profileSectionTitle}>
                    More by this Host ({organizerOtherEvents.length})
                  </Text>
                  {organizerOtherEvents.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.otherEventRow}
                      onPress={() => {
                        setIsOrganizerModalVisible(false);
                        navigation.navigate('EventDetail', { eventId: item.id });
                      }}
                    >
                      <Image source={{ uri: item.imageUrl }} style={styles.otherEventThumb} />
                      <View style={styles.otherEventInfo}>
                        <Text style={styles.otherEventTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.otherEventMeta}>
                          {item.category} • {item.displayDate}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorSafe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  draftPrivateMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.amberPrimary,
    borderRadius: borderRadius.pill,
  },
  backBtnText: {
    color: colors.textOnAmber,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  posterContainer: {
    width,
    height: 320,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topNavSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topNavRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(9, 11, 14, 0.75)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonSaved: {
    borderColor: colors.orangePrimary,
    backgroundColor: 'rgba(255, 107, 0, 0.25)',
  },
  body: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  categoryPillText: {
    ...typography.micro,
    color: colors.amberPrimary,
  },
  draftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.amberPrimary,
    gap: 4,
  },
  draftPillText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontSize: 10,
    fontWeight: '800',
  },
  publishedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 4,
  },
  publishedPillText: {
    ...typography.micro,
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  cancelledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    gap: 4,
  },
  cancelledPillText: {
    ...typography.micro,
    color: colors.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 4,
  },
  verifiedPillText: {
    ...typography.micro,
    color: colors.success,
    fontSize: 10,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderGold,
    gap: 4,
  },
  demoPillText: {
    ...typography.micro,
    color: colors.amberLight,
    fontSize: 10,
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  distancePillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  draftBannerContent: {
    flex: 1,
  },
  draftBannerTitle: {
    ...typography.bodyBold,
    color: colors.amberPrimary,
    marginBottom: 2,
  },
  draftBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cancellationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cancellationBannerContent: {
    flex: 1,
  },
  cancellationBannerTitle: {
    ...typography.bodyBold,
    color: colors.danger,
    marginBottom: 2,
  },
  cancellationBannerText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  title: {
    ...typography.hero,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  announcementsContainer: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  announcementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  announcementsHeading: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  announcementCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  announcementCardUrgent: {
    borderColor: 'rgba(255, 107, 0, 0.5)',
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  announcementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  announcementTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  urgentBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.orangePrimary,
  },
  urgentBadgeText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  announcementMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 2,
  },
  announcementTime: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
  },
  confirmationCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  confirmationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmationBadgeText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  confirmationPassId: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  confirmationNotice: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  confirmationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
  },
  cancelPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelPassBtnText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconSquare: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  infoSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  directionsBtnText: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  capacitySection: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  spotsLeftText: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  spotsLeftFull: {
    color: colors.danger,
  },
  spotsLeftCancelled: {
    color: colors.textMuted,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.orangePrimary,
    borderRadius: 4,
  },
  progressBarFull: {
    backgroundColor: colors.danger,
  },
  capacitySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityCountText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  deadlineText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  sectionBlock: {
    marginTop: spacing.lg,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  checklistTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  checklistTagText: {
    ...typography.micro,
    color: colors.amberLight,
    fontWeight: '700',
  },
  checklistGrid: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checklistItemContent: {
    flex: 1,
  },
  checklistItemLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklistItemValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
  },
  agendaTimeline: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
  },
  agendaItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  agendaTimeBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderGold,
    minWidth: 70,
    alignItems: 'center',
  },
  agendaTimeText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontWeight: '700',
  },
  agendaLineMarker: {
    width: 2,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.sm,
    alignSelf: 'stretch',
  },
  agendaContent: {
    flex: 1,
  },
  agendaItemTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
    marginBottom: 2,
  },
  agendaItemDesc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
  },
  fallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  fallbackCardText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.md,
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.amberPrimary,
  },
  organizerInfo: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  organizerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  organizerRole: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sampleTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginLeft: 4,
  },
  sampleTagText: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 9,
  },
  viewProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  viewProfileChipText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontWeight: '700',
  },
  demoNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  demoNoticeText: {
    ...typography.caption,
    color: colors.amberLight,
    flex: 1,
    lineHeight: 18,
  },
  stickyBottomSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  stickyBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  priceColumn: {
    justifyContent: 'center',
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  priceValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.pill,
    minWidth: 160,
    justifyContent: 'center',
  },
  rsvpButtonActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.orangePrimary,
  },
  rsvpButtonText: {
    ...typography.bodyBold,
    color: '#07080B',
    fontWeight: '700',
  },
  rsvpButtonTextActive: {
    ...typography.bodyBold,
    color: colors.orangePrimary,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  buttonDisabledText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  profileModalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalHeading: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  profileHeaderSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  profileLargeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.amberPrimary,
    marginBottom: spacing.sm,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileNameText: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  profileRoleText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  verifiedTierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    marginTop: spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedTierText: {
    ...typography.micro,
    color: colors.success,
    fontWeight: '700',
  },
  profileSectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  profileBioText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  profileLinksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  profileActionBtnText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  profileEventsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  otherEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  otherEventThumb: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  otherEventInfo: {
    flex: 1,
  },
  otherEventTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  otherEventMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
});

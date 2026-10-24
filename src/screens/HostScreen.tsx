import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useEvents } from '../context/EventsContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import {
  EventCategory,
  HyperlocalEvent,
  RootStackParamList,
  EventAttendee,
} from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type HostTab = 'create' | 'manage';

const CATEGORIES: EventCategory[] = [
  'Workshops',
  'Meetups',
  'Music',
  'Comedy',
  'College',
  'Sports',
  'Parties',
];

const SAMPLE_POSTERS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', // Tech Conference
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800', // Concert Stage
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800', // Hackathon Team
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', // Celebration
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800', // Keynote
];

export const HostScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const {
    addEvent,
    updateEvent,
    deleteEvent,
    cancelEventByOrganizer,
    postAnnouncement,
    getEventAttendees,
    customEvents,
  } = useEvents();
  const { user } = useAuth();
  const { userCoordinates } = useLocation();

  const [activeTab, setActiveTab] = useState<HostTab>('create');

  // Form State
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('Workshops');
  const [date, setDate] = useState('2026-12-25');
  const [time, setTime] = useState('6:00 PM');
  const [endTime, setEndTime] = useState('9:00 PM');
  const [timezone, setTimezone] = useState('Local Time');
  const [venue, setVenue] = useState('Indiranagar Innovation Hub');
  const [address, setAddress] = useState('100 Feet Rd, Indiranagar, Bengaluru');
  const [price, setPrice] = useState('Free');
  const [capacity, setCapacity] = useState('50');
  const [registrationDeadline, setRegistrationDeadline] = useState('2026-12-24 5:00 PM');

  // Readiness Checklist Inputs
  const [skillLevel, setSkillLevel] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [teamRules, setTeamRules] = useState('');
  const [equipmentRequired, setEquipmentRequired] = useState('');
  const [idRequired, setIdRequired] = useState<boolean | undefined>(undefined);
  const [accessibility, setAccessibility] = useState('');

  const [selectedPoster, setSelectedPoster] = useState<string>(SAMPLE_POSTERS[0]);
  const [customPosterUri, setCustomPosterUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals for Attendee Management & Announcements
  const [attendeeModalEvent, setAttendeeModalEvent] = useState<HyperlocalEvent | null>(null);
  const [attendeesList, setAttendeesList] = useState<EventAttendee[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);

  const [announcementModalEvent, setAnnouncementModalEvent] = useState<HyperlocalEvent | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [isUrgentAnnouncement, setIsUrgentAnnouncement] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  // Cancellation Dialog State
  const [cancelModalEvent, setCancelModalEvent] = useState<HyperlocalEvent | null>(null);
  const [cancellationReasonText, setCancellationReasonText] = useState('');

  // Pick Custom Photo from Device Gallery
  const handlePickCustomImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo Permission Needed',
          'Please grant access to your photo library to upload a custom event poster.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setCustomPosterUri(pickedUri);
        setSelectedPoster(pickedUri);
      }
    } catch (err: any) {
      Alert.alert('Image Selection Error', err.message || 'Could not pick photo');
    }
  };

  const resetForm = () => {
    setEditingEventId(null);
    setTitle('');
    setTagline('');
    setDescription('');
    setCategory('Workshops');
    setDate('2026-12-25');
    setTime('6:00 PM');
    setEndTime('9:00 PM');
    setTimezone('Local Time');
    setVenue('Indiranagar Innovation Hub');
    setAddress('100 Feet Rd, Indiranagar, Bengaluru');
    setPrice('Free');
    setCapacity('50');
    setRegistrationDeadline('2026-12-24 5:00 PM');
    setSkillLevel('');
    setEligibility('');
    setTeamRules('');
    setEquipmentRequired('');
    setIdRequired(undefined);
    setAccessibility('');
    setSelectedPoster(SAMPLE_POSTERS[0]);
    setCustomPosterUri(null);
  };

  const populateEditForm = (ev: HyperlocalEvent) => {
    setEditingEventId(ev.id);
    setTitle(ev.title);
    setTagline(ev.tagline);
    setDescription(ev.description);
    setCategory(ev.category);
    setDate(ev.date);
    setTime(ev.time);
    setEndTime(ev.endTime || '9:00 PM');
    setTimezone(ev.timezone || 'Local Time');
    setVenue(ev.venue);
    setAddress(ev.address);
    setPrice(ev.price);
    setCapacity(ev.capacity ? String(ev.capacity) : '50');
    setRegistrationDeadline(ev.registrationDeadline || '');
    if (ev.checklist) {
      setSkillLevel(ev.checklist.skillLevel || '');
      setEligibility(ev.checklist.eligibility || '');
      setTeamRules(ev.checklist.teamRules || '');
      setEquipmentRequired(ev.checklist.equipmentRequired || ev.checklist.equipment || '');
      setIdRequired(ev.checklist.idRequired);
      setAccessibility(ev.checklist.accessibility || '');
    }
    setSelectedPoster(ev.imageUrl);
    setActiveTab('create');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter an event title.');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please provide an event description.');
      return false;
    }
    if (!venue.trim()) {
      Alert.alert('Required Field', 'Please specify the venue name.');
      return false;
    }
    const capNum = parseInt(capacity.trim(), 10);
    if (isNaN(capNum) || capNum <= 0) {
      Alert.alert('Invalid Capacity', 'Capacity seat limit must be at least 1.');
      return false;
    }
    return true;
  };

  const buildEventObject = (status: 'draft' | 'published'): HyperlocalEvent => {
    const newEventId = editingEventId || `host-ev-${Date.now()}`;
    const capNum = parseInt(capacity.trim(), 10) || 50;

    return {
      id: newEventId,
      title: title.trim(),
      tagline: tagline.trim() || 'Exclusive Community Event',
      description: description.trim(),
      category,
      date: date.trim() || '2026-12-25',
      displayDate: 'FRI, DEC 25',
      dayNumber: '25',
      monthShort: 'DEC',
      time: time.trim() || '6:00 PM',
      endTime: endTime.trim() || '9:00 PM',
      timezone: timezone.trim() || 'Local Time',
      venue: venue.trim(),
      address: address.trim() || `${venue.trim()}, Bengaluru`,
      coordinates: {
        latitude: userCoordinates.latitude + (Math.random() - 0.5) * 0.015,
        longitude: userCoordinates.longitude + (Math.random() - 0.5) * 0.015,
      },
      distanceKm: 1.5,
      imageUrl: selectedPoster,
      price: price.trim() || 'Free',
      isFree: price.trim().toLowerCase() === 'free' || price.trim() === '0' || !price.trim(),
      attendeeCount: 1,
      registeredCount: editingEventId ? undefined : 0,
      capacity: capNum,
      registrationDeadline: registrationDeadline.trim() || undefined,
      status,
      votedCount: 1,
      gradientColors: ['#FF6B00', '#FF8E53', '#07080B'] as const,
      buddiesAttending: [],
      organizer: {
        id: user?.id || 'org-you',
        name: user?.name || 'You (Host)',
        avatarUrl:
          user?.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        isVerified: true,
        role: 'Verified Organizer',
        bio: 'Local organizer cultivating engaging events and active tech/creative communities.',
        contactEmail: user?.email || 'organizer@socialbuddy.io',
        websiteUrl: 'https://socialbuddy.io',
      },
      isFeatured: true,
      isUpcoming: true,
      isSeedDemoData: false,
      isVerifiedRealWorld: true,
      checklist: {
        skillLevel: skillLevel.trim() || undefined,
        eligibility: eligibility.trim() || undefined,
        teamRules: teamRules.trim() || undefined,
        equipmentRequired: equipmentRequired.trim() || undefined,
        idRequired,
        accessibility: accessibility.trim() || undefined,
      },
    };
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter at least a title to save a draft.');
      return;
    }
    setIsSubmitting(true);
    const draftEvent = buildEventObject('draft');

    if (editingEventId) {
      const res = await updateEvent(draftEvent);
      setIsSubmitting(false);
      if (!res.success) {
        Alert.alert('Cannot Update Draft', res.error || 'Failed to update draft.');
        return;
      }
      Alert.alert('Draft Saved', `"${title.trim()}" has been updated in your private drafts.`);
    } else {
      await addEvent(draftEvent);
      setIsSubmitting(false);
      Alert.alert('Draft Saved', `"${title.trim()}" is saved as a private draft. Only you can view or publish it.`);
    }
    resetForm();
    setActiveTab('manage');
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const eventObj = buildEventObject('published');

    if (editingEventId) {
      const res = await updateEvent(eventObj);
      setIsSubmitting(false);
      if (!res.success) {
        Alert.alert('Unsafe Capacity Update', res.error || 'Could not update event.');
        return;
      }
      Alert.alert('Event Updated! 🎉', `"${title.trim()}" updates are now live.`);
      resetForm();
      setActiveTab('manage');
    } else {
      await addEvent(eventObj);
      setIsSubmitting(false);
      Alert.alert(
        'Event Published Successfully! 🎉',
        `"${title.trim()}" is now live in public discovery.`,
        [
          {
            text: 'View Listing',
            onPress: () => navigation.navigate('EventDetail', { eventId: eventObj.id }),
          },
          {
            text: 'Manage Events',
            onPress: () => {
              resetForm();
              setActiveTab('manage');
            },
          },
        ]
      );
    }
  };

  const handleOpenAttendees = async (ev: HyperlocalEvent) => {
    setAttendeeModalEvent(ev);
    setAttendeeSearch('');
    setIsLoadingAttendees(true);
    const list = await getEventAttendees(ev.id);
    setAttendeesList(list);
    setIsLoadingAttendees(false);
  };

  const handleOpenAnnouncement = (ev: HyperlocalEvent) => {
    setAnnouncementModalEvent(ev);
    setAnnouncementTitle('');
    setAnnouncementMessage('');
    setIsUrgentAnnouncement(false);
  };

  const handlePostAnnouncement = async () => {
    if (!announcementModalEvent) return;
    if (!announcementTitle.trim()) {
      Alert.alert('Required Field', 'Please enter an announcement title.');
      return;
    }
    if (!announcementMessage.trim()) {
      Alert.alert('Required Field', 'Please enter announcement details.');
      return;
    }

    setIsPostingAnnouncement(true);
    const res = await postAnnouncement(announcementModalEvent.id, {
      title: announcementTitle.trim(),
      message: announcementMessage.trim(),
      isUrgent: isUrgentAnnouncement,
    });
    setIsPostingAnnouncement(false);

    if (res.success) {
      Alert.alert('Announcement Broadcasted! 📢', 'Your update is now pinned to the event details page for all attendees.');
      setAnnouncementModalEvent(null);
    } else {
      Alert.alert('Failed to Post', res.error || 'Could not broadcast announcement.');
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelModalEvent) return;
    if (!cancellationReasonText.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear reason for attendees explaining why this event is cancelled.');
      return;
    }

    const res = await cancelEventByOrganizer(cancelModalEvent.id, cancellationReasonText.trim());
    if (res.success) {
      Alert.alert('Event Cancelled', `"${cancelModalEvent.title}" is now marked as cancelled. Registrations are closed and the cancellation reason is visible on the event details page.`);
      setCancelModalEvent(null);
      setCancellationReasonText('');
    } else {
      Alert.alert('Cancellation Error', res.error || 'Could not cancel event.');
    }
  };

  const confirmDeleteEvent = (event: HyperlocalEvent) => {
    Alert.alert(
      'Delete Hosted Event?',
      `Are you sure you want to completely remove "${event.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent(event.id);
          },
        },
      ]
    );
  };

  const filteredAttendees = attendeesList.filter(
    (a) =>
      a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
      a.passId.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  return (
    <View style={styles.screenWrapper}>
      {/* Ambient Glow */}
      <View style={styles.ambientGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255, 107, 0, 0.25)', 'rgba(7, 8, 11, 0.7)', '#07080B']}
          locations={[0, 0.35, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.radialAuraCircle} />
      </View>

      {/* Header */}
      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>ORGANIZER COMMAND CENTER</Text>
            <Text style={styles.headerTitle}>Host & Manage</Text>
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
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Segmented Navigation Tabs */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'create' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('create');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={editingEventId ? 'create' : 'add-circle'}
              size={14}
              color={activeTab === 'create' ? '#07080B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'create' && styles.segmentBtnTextActive,
              ]}
            >
              {editingEventId ? 'Edit Event' : 'Create Event'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'manage' && styles.segmentBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('manage');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="grid"
              size={14}
              color={activeTab === 'manage' ? '#07080B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'manage' && styles.segmentBtnTextActive,
              ]}
            >
              Managed Events ({customEvents.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'create' ? (
          <>
            {/* Edit Mode Alert Banner */}
            {editingEventId && (
              <View style={styles.editModeBanner}>
                <Ionicons name="create-outline" size={16} color={colors.amberPrimary} />
                <View style={styles.editModeBannerContent}>
                  <Text style={styles.editModeBannerText}>
                    Editing: {title || 'Hosted Event'}
                  </Text>
                  <Text style={styles.editModeBannerSubtext}>
                    Changes will preserve committed attendee registrations.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelEditBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Poster Selector */}
            <Text style={styles.sectionLabel}>CHOOSE COVER POSTER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.postersRow}
            >
              {/* Custom Image Upload Button */}
              <TouchableOpacity
                style={[
                  styles.posterThumbWrap,
                  styles.uploadPhotoBtn,
                  customPosterUri === selectedPoster && styles.posterThumbActive,
                ]}
                onPress={handlePickCustomImage}
                activeOpacity={0.8}
              >
                {customPosterUri ? (
                  <Image source={{ uri: customPosterUri }} style={styles.posterThumb} />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.orangePrimary} />
                    <Text style={styles.uploadPhotoText}>Custom Photo</Text>
                  </View>
                )}
                {customPosterUri && customPosterUri === selectedPoster && (
                  <View style={styles.posterCheckBadge}>
                    <Ionicons name="checkmark" size={14} color="#07080B" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Sample Posters */}
              {SAMPLE_POSTERS.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.posterThumbWrap,
                    selectedPoster === uri && styles.posterThumbActive,
                  ]}
                  onPress={() => setSelectedPoster(uri)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.posterThumb} />
                  {selectedPoster === uri && (
                    <View style={styles.posterCheckBadge}>
                      <Ionicons name="checkmark" size={14} color="#07080B" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Form Fields Card */}
            <View style={styles.formCard}>
              {/* Event Title */}
              <Text style={styles.inputLabel}>Event Title *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="text-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Hyperlocal Founders & AI Hackathon"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Short Catchphrase */}
              <Text style={styles.inputLabel}>Short Catchphrase</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Build, demo, and connect with seed investors"
                  placeholderTextColor={colors.textMuted}
                  value={tagline}
                  onChangeText={setTagline}
                />
              </View>

              {/* Category Selector */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryPillsRow}
              >
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        category === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description */}
              <Text style={styles.inputLabel}>About the Event *</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Detailed schedule, speaker highlights, who should attend..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Date & Timing Row */}
              <View style={styles.dualRow}>
                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>Date (YYYY-MM-DD) *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="2026-12-25"
                      placeholderTextColor={colors.textMuted}
                      value={date}
                      onChangeText={setDate}
                    />
                  </View>
                </View>

                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>Start Time *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="6:00 PM"
                      placeholderTextColor={colors.textMuted}
                      value={time}
                      onChangeText={setTime}
                    />
                  </View>
                </View>
              </View>

              {/* End Time & Timezone */}
              <View style={styles.dualRow}>
                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="9:00 PM"
                      placeholderTextColor={colors.textMuted}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>

                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>Timezone</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="globe-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Local Time"
                      placeholderTextColor={colors.textMuted}
                      value={timezone}
                      onChangeText={setTimezone}
                    />
                  </View>
                </View>
              </View>

              {/* Venue & Address */}
              <Text style={styles.inputLabel}>Venue Name *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Indiranagar Innovation Center"
                  placeholderTextColor={colors.textMuted}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>

              <Text style={styles.inputLabel}>Full Street Address *</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 100 Feet Rd, HAL 2nd Stage, Bengaluru"
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                />
              </View>

              {/* Capacity Limit & Deadline Settings */}
              <View style={styles.dualRow}>
                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>Capacity (Seats) *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="people-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="50"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textMuted}
                      value={capacity}
                      onChangeText={setCapacity}
                    />
                  </View>
                </View>

                <View style={styles.dualColumn}>
                  <Text style={styles.inputLabel}>Admission Fee</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="card-outline" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Free or $15"
                      placeholderTextColor={colors.textMuted}
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Registration Closing Deadline</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="alarm-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2026-12-24 5:00 PM"
                  placeholderTextColor={colors.textMuted}
                  value={registrationDeadline}
                  onChangeText={setRegistrationDeadline}
                />
              </View>

              {/* Readiness Checklist Settings */}
              <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                PARTICIPANT READINESS CHECKLIST
              </Text>
              <Text style={styles.sublabelHint}>
                Help attendees prepare. Any blank field will display as "Not provided."
              </Text>

              <Text style={styles.inputLabel}>Skill Level</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="school-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Beginner to Intermediate"
                  placeholderTextColor={colors.textMuted}
                  value={skillLevel}
                  onChangeText={setSkillLevel}
                />
              </View>

              <Text style={styles.inputLabel}>Eligibility</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Open to all students & builders"
                  placeholderTextColor={colors.textMuted}
                  value={eligibility}
                  onChangeText={setEligibility}
                />
              </View>

              <Text style={styles.inputLabel}>Team / Solo Rules</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="people-circle-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Solo or teams up to 4"
                  placeholderTextColor={colors.textMuted}
                  value={teamRules}
                  onChangeText={setTeamRules}
                />
              </View>

              <Text style={styles.inputLabel}>Equipment Required</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="laptop-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Laptop, charger, and HDMI cable"
                  placeholderTextColor={colors.textMuted}
                  value={equipmentRequired}
                  onChangeText={setEquipmentRequired}
                />
              </View>

              {/* ID Requirement Selector */}
              <Text style={styles.inputLabel}>ID Verification Required?</Text>
              <View style={styles.pillChoiceRow}>
                <TouchableOpacity
                  style={[styles.pillChoice, idRequired === true && styles.pillChoiceActive]}
                  onPress={() => setIdRequired(true)}
                >
                  <Text style={[styles.pillChoiceText, idRequired === true && styles.pillChoiceTextActive]}>
                    Yes (ID Required)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillChoice, idRequired === false && styles.pillChoiceActive]}
                  onPress={() => setIdRequired(false)}
                >
                  <Text style={[styles.pillChoiceText, idRequired === false && styles.pillChoiceTextActive]}>
                    No (Not Required)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pillChoice, idRequired === undefined && styles.pillChoiceActive]}
                  onPress={() => setIdRequired(undefined)}
                >
                  <Text style={[styles.pillChoiceText, idRequired === undefined && styles.pillChoiceTextActive]}>
                    Not Provided
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Accessibility Details</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="accessibility-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Wheelchair ramp, elevator to 3rd floor"
                  placeholderTextColor={colors.textMuted}
                  value={accessibility}
                  onChangeText={setAccessibility}
                />
              </View>

              {/* Form Actions: Save Draft vs Publish Live */}
              <View style={styles.formActionButtons}>
                <TouchableOpacity
                  style={styles.draftBtn}
                  onPress={handleSaveDraft}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.textPrimary} />
                  <Text style={styles.draftBtnText}>
                    {editingEventId ? 'Save Draft' : 'Save as Draft'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.publishBtn}
                  onPress={handlePublish}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FF6B00', '#FF8E53']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.publishGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#07080B" />
                    ) : (
                      <>
                        <Ionicons name="rocket-outline" size={18} color="#07080B" />
                        <Text style={styles.publishBtnText}>
                          {editingEventId ? 'Update Event Live' : 'Publish Event Live'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          /* Tab 2: Manage Hosted Events */
          <View style={styles.managedEventsSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>HOSTED EVENTS ({customEvents.length})</Text>
              <Text style={styles.sectionSublabel}>Manage attendees & announcements</Text>
            </View>

            {customEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={42} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Hosted Events Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first event listing to manage registrations, announcements, and attendees.
                </Text>
                <TouchableOpacity
                  style={styles.createFirstBtn}
                  onPress={() => setActiveTab('create')}
                >
                  <Text style={styles.createFirstBtnText}>Create an Event</Text>
                </TouchableOpacity>
              </View>
            ) : (
              customEvents.map((ev) => {
                const regCount = ev.registeredCount || 0;
                const capLimit = ev.capacity || 50;
                const isDraftEv = ev.status === 'draft';
                const isCancelledEv = ev.status === 'cancelled';

                return (
                  <View key={ev.id} style={styles.managedEventCard}>
                    <View style={styles.cardTopRow}>
                      <Image source={{ uri: ev.imageUrl }} style={styles.managedEventThumb} />
                      <View style={styles.managedEventInfo}>
                        <View style={styles.statusPillRow}>
                          {isDraftEv ? (
                            <View style={styles.draftBadge}>
                              <Text style={styles.draftBadgeText}>PRIVATE DRAFT</Text>
                            </View>
                          ) : isCancelledEv ? (
                            <View style={styles.cancelledBadge}>
                              <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
                            </View>
                          ) : (
                            <View style={styles.publishedBadge}>
                              <Text style={styles.publishedBadgeText}>LIVE IN DISCOVERY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.managedEventTitle} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        <Text style={styles.managedEventMeta} numberOfLines={1}>
                          {ev.category} • {ev.venue} • {ev.displayDate}
                        </Text>
                      </View>
                    </View>

                    {/* Operational Metrics Strip */}
                    <View style={styles.metricsStrip}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {regCount} / {capLimit}
                        </Text>
                        <Text style={styles.metricLabel}>Registered</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {Math.max(0, capLimit - regCount)}
                        </Text>
                        <Text style={styles.metricLabel}>Seats Left</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>
                          {ev.announcements?.length || 0}
                        </Text>
                        <Text style={styles.metricLabel}>Updates</Text>
                      </View>
                    </View>

                    {/* Organizer Action Buttons */}
                    <View style={styles.actionGridRow}>
                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}
                      >
                        <Ionicons name="eye-outline" size={14} color={colors.textPrimary} />
                        <Text style={styles.cardActionBtnText}>Preview</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => populateEditForm(ev)}
                      >
                        <Ionicons name="pencil-outline" size={14} color={colors.amberPrimary} />
                        <Text style={styles.cardActionBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleOpenAttendees(ev)}
                      >
                        <Ionicons name="people-outline" size={14} color={colors.orangePrimary} />
                        <Text style={styles.cardActionBtnText}>Attendees</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => handleOpenAnnouncement(ev)}
                      >
                        <Ionicons name="megaphone-outline" size={14} color={colors.success} />
                        <Text style={styles.cardActionBtnText}>Announce</Text>
                      </TouchableOpacity>

                      {!isCancelledEv && (
                        <TouchableOpacity
                          style={[styles.cardActionBtn, styles.cardActionBtnDanger]}
                          onPress={() => {
                            setCancelModalEvent(ev);
                            setCancellationReasonText('');
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                          <Text style={[styles.cardActionBtnText, { color: colors.danger }]}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.cardActionBtn}
                        onPress={() => confirmDeleteEvent(ev)}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Authorized Attendee List Modal (Milestone 4: F19) */}
      <Modal
        visible={attendeeModalEvent !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setAttendeeModalEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attendeeModalCard}>
            <View style={styles.modalTopBar}>
              <View>
                <Text style={styles.modalHeading}>Attendee Roster</Text>
                <Text style={styles.modalSubheading} numberOfLines={1}>
                  {attendeeModalEvent?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAttendeeModalEvent(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Privacy Protection Notice */}
            <View style={styles.privacyNoticeCard}>
              <Ionicons name="shield-checkmark" size={14} color={colors.success} />
              <Text style={styles.privacyNoticeText}>
                Participant contact info is hidden by default. Only authorized organizers can view verified attendees.
              </Text>
            </View>

            {/* Attendee Search */}
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search attendee or pass ID..."
                placeholderTextColor={colors.textMuted}
                value={attendeeSearch}
                onChangeText={setAttendeeSearch}
              />
            </View>

            {isLoadingAttendees ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.orangePrimary} />
                <Text style={styles.loadingText}>Loading attendee roster...</Text>
              </View>
            ) : filteredAttendees.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Attendees Found</Text>
                <Text style={styles.emptySubtitle}>
                  {attendeeSearch ? 'No registrations match your search.' : 'No participants have registered for this event yet.'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                {filteredAttendees.map((att) => (
                  <View key={att.id} style={styles.attendeeRow}>
                    <Image
                      source={{
                        uri:
                          att.avatarUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                      }}
                      style={styles.attendeeAvatar}
                    />
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>{att.name}</Text>
                      <Text style={styles.attendeePass}>{att.passId}</Text>
                    </View>
                    <View
                      style={[
                        styles.attendeeStatusPill,
                        att.status === 'attended' && styles.attendeeStatusAttended,
                      ]}
                    >
                      <Text style={styles.attendeeStatusText}>
                        {att.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Broadcast Announcement Modal (Milestone 4: F20) */}
      <Modal
        visible={announcementModalEvent !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setAnnouncementModalEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attendeeModalCard}>
            <View style={styles.modalTopBar}>
              <View>
                <Text style={styles.modalHeading}>Broadcast Announcement</Text>
                <Text style={styles.modalSubheading} numberOfLines={1}>
                  {announcementModalEvent?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAnnouncementModalEvent(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Announcement Headline *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Venue Room Updated to Hall 3B"
                placeholderTextColor={colors.textMuted}
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
              />
            </View>

            <Text style={styles.inputLabel}>Detailed Message *</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Provide directions, arrival instructions, or schedule adjustments..."
                placeholderTextColor={colors.textMuted}
                value={announcementMessage}
                onChangeText={setAnnouncementMessage}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={styles.urgentToggleRow}
              onPress={() => setIsUrgentAnnouncement(!isUrgentAnnouncement)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isUrgentAnnouncement ? 'checkbox' : 'square-outline'}
                size={20}
                color={isUrgentAnnouncement ? colors.orangePrimary : colors.textMuted}
              />
              <Text style={styles.urgentToggleText}>Flag as Urgent Alert (High Priority)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publishBtn}
              onPress={handlePostAnnouncement}
              disabled={isPostingAnnouncement}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF8E53']}
                style={styles.publishGradient}
              >
                {isPostingAnnouncement ? (
                  <ActivityIndicator size="small" color="#07080B" />
                ) : (
                  <>
                    <Ionicons name="megaphone" size={18} color="#07080B" />
                    <Text style={styles.publishBtnText}>Broadcast to Attendees</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Event Cancellation Dialog Modal (Milestone 4: F21) */}
      <Modal
        visible={cancelModalEvent !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setCancelModalEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attendeeModalCard}>
            <View style={styles.modalTopBar}>
              <View>
                <Text style={[styles.modalHeading, { color: colors.danger }]}>
                  Cancel Event
                </Text>
                <Text style={styles.modalSubheading} numberOfLines={1}>
                  {cancelModalEvent?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCancelModalEvent(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelWarningText}>
              Cancelling this event will close all registrations and display the cancellation notice to all participants.
            </Text>

            <Text style={styles.inputLabel}>Cancellation Reason *</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="State why this event is being cancelled (e.g., Speaker unavailable, venue maintenance)..."
                placeholderTextColor={colors.textMuted}
                value={cancellationReasonText}
                onChangeText={setCancellationReasonText}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.publishBtn, { backgroundColor: colors.danger }]}
              onPress={handleConfirmCancellation}
              activeOpacity={0.85}
            >
              <View style={[styles.publishGradient, { backgroundColor: colors.danger }]}>
                <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                <Text style={[styles.publishBtnText, { color: '#FFFFFF' }]}>
                  Confirm Event Cancellation
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    height: 360,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orangePrimary,
    borderWidth: 1.5,
    borderColor: '#07080B',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.pill,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  editModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.amberPrimary,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  editModeBannerContent: {
    flex: 1,
  },
  editModeBannerText: {
    ...typography.bodyBold,
    color: colors.amberPrimary,
    fontSize: 13,
  },
  editModeBannerSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  cancelEditBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelEditBtnText: {
    ...typography.micro,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  sublabelHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  postersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  posterThumbWrap: {
    width: 90,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.borderSubtle,
  },
  posterThumbActive: {
    borderColor: colors.orangePrimary,
  },
  posterThumb: {
    width: '100%',
    height: '100%',
  },
  posterCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.orangePrimary,
    borderRadius: borderRadius.pill,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPhotoBtn: {
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  uploadPhotoText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.card,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    fontSize: 13,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  categoryPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  categoryPillActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: colors.orangePrimary,
  },
  categoryPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  categoryPillTextActive: {
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  dualRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dualColumn: {
    flex: 1,
  },
  pillChoiceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  pillChoice: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pillChoiceActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: colors.orangePrimary,
  },
  pillChoiceText: {
    ...typography.micro,
    color: colors.textMuted,
    fontWeight: '700',
  },
  pillChoiceTextActive: {
    color: colors.orangePrimary,
  },
  formActionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: spacing.md - 2,
  },
  draftBtnText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  publishBtn: {
    flex: 1.5,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md - 2,
  },
  publishBtnText: {
    ...typography.bodyBold,
    color: '#07080B',
    fontWeight: '800',
    fontSize: 13,
  },
  managedEventsSection: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionSublabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  managedEventCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  managedEventThumb: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.md,
  },
  managedEventInfo: {
    flex: 1,
  },
  statusPillRow: {
    marginBottom: 2,
  },
  draftBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.amberPrimary,
  },
  draftBadgeText: {
    ...typography.micro,
    color: colors.amberPrimary,
    fontWeight: '800',
    fontSize: 8,
  },
  publishedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  publishedBadgeText: {
    ...typography.micro,
    color: colors.success,
    fontWeight: '800',
    fontSize: 8,
  },
  cancelledBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  cancelledBadgeText: {
    ...typography.micro,
    color: colors.danger,
    fontWeight: '800',
    fontSize: 8,
  },
  managedEventTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 2,
  },
  managedEventMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  metricLabel: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 9,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.borderSubtle,
  },
  actionGridRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardActionBtnDanger: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cardActionBtnText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  createFirstBtn: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  createFirstBtnText: {
    ...typography.bodyBold,
    color: '#07080B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  attendeeModalCard: {
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
    marginBottom: spacing.sm,
  },
  modalHeading: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  modalSubheading: {
    ...typography.caption,
    color: colors.textMuted,
    maxWidth: 240,
  },
  privacyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 6,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  privacyNoticeText: {
    ...typography.micro,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 14,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  attendeeRow: {
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
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  attendeePass: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  attendeeStatusPill: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  attendeeStatusAttended: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  attendeeStatusText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  urgentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: spacing.sm,
  },
  urgentToggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cancelWarningText: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});

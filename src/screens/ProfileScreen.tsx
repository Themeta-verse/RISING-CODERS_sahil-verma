import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEvents } from '../context/EventsContext';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const AVAILABLE_INTERESTS = [
  'AI',
  'Coding',
  'Design',
  'Workshops',
  'Hackathons',
  'Music',
  'Meetups',
  'Parties',
];

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { savedIds, rsvpIds } = useEvents();
  const { locationName, isUsingFallback, refreshLocation, discoveryAreas, selectedAreaId, setDiscoveryArea } = useLocation();
  const { user, userRole, isBackendConnected, switchRoleForDemo, updateProfile, deleteAccount, logout } = useAuth();

  // Profile Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Photo Permission Required',
          'Please allow access to your photos to choose a custom profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditAvatarUrl(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Error', 'Unable to pick photo: ' + (e.message || 'Unknown error'));
    }
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

      {/* Safe Header matching DiscoverScreen top offset with Back Button */}
      <View
        style={[
          styles.safeHeaderWrapper,
          { paddingTop: Math.max(insets.top, 38) + 8 },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerSubtitle}>ACCOUNT & SETTINGS</Text>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                user?.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
            }}
            style={styles.avatar}
          />
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.orangePrimary} />
          </View>
        </View>

        <Text style={styles.userName}>{user?.name || 'Alex Mercer'}</Text>
        <Text style={styles.userBio}>
          {user?.email || 'alex.mercer@socialbuddy.io'}
        </Text>
        {user?.bio ? (
          <Text style={styles.userBioDescription}>{user.bio}</Text>
        ) : null}

        {/* Edit Profile Action Button */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => {
            setEditName(user?.name || '');
            setEditBio(user?.bio || '');
            setEditAvatarUrl(user?.avatarUrl || '');
            setIsEditModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color={colors.orangePrimary} />
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Dynamic Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{rsvpIds.length}</Text>
            <Text style={styles.statLabel}>Attending</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{savedIds.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>18</Text>
            <Text style={styles.statLabel}>Buddies</Text>
          </View>
        </View>

        {/* Interests & Recommendation Inputs (FR-01, F01) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons
              name="heart-outline"
              size={18}
              color={colors.orangePrimary}
            />
            <Text style={styles.sectionCardTitle}>Interests & Topic Preferences</Text>
          </View>
          <Text style={styles.cardHelperText}>
            Selected interests guide transparent event feed ranking and explainable match reasons.
          </Text>
          <View style={styles.interestsGrid}>
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = (user?.interests || []).includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipActive,
                  ]}
                  onPress={async () => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                    const current = user?.interests || [];
                    const updated = isSelected
                      ? current.filter((i) => i !== interest)
                      : [...current, interest];
                    await updateProfile({ interests: updated });
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={14}
                    color={isSelected ? colors.orangePrimary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.interestChipText,
                      isSelected && styles.interestChipTextActive,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferred Discovery Area & GPS Status Section (FR-01, FR-02) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons
              name="navigate-circle-outline"
              size={18}
              color={colors.orangePrimary}
            />
            <Text style={styles.sectionCardTitle}>Preferred Discovery Area</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Active Center:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {locationName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location Mode:</Text>
            <View style={styles.modePill}>
              <Text style={styles.modeText}>
                {isUsingFallback
                  ? 'Manual Area Selection'
                  : 'Live Device GPS'}
              </Text>
            </View>
          </View>

          <Text style={styles.areaSwitchLabel}>Select Discovery Hub:</Text>
          <View style={styles.areaChipsRow}>
            {discoveryAreas.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaChip,
                  selectedAreaId === area.id && styles.areaChipActive,
                ]}
                onPress={() => setDiscoveryArea(area.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.areaChipText,
                    selectedAreaId === area.id && styles.areaChipTextActive,
                  ]}
                >
                  {area.name.replace('Indiranagar ', '').replace('Koramangala ', '').replace('Innovation ', '')}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.areaChip,
                selectedAreaId === 'gps' && styles.areaChipActive,
              ]}
              onPress={() => setDiscoveryArea('gps')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.areaChipText,
                  selectedAreaId === 'gps' && styles.areaChipTextActive,
                ]}
              >
                📡 Live GPS
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.refreshLocBtn}
            onPress={refreshLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={14} color={colors.orangePrimary} />
            <Text style={styles.refreshLocText}>Refresh GPS Position</Text>
          </TouchableOpacity>
        </View>

        {/* Backend & Security Status (FR-39, FR-50) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionCardHeader}>
            <Ionicons
              name={isBackendConnected ? "shield-checkmark" : "shield-outline"}
              size={18}
              color={isBackendConnected ? colors.success : colors.amberPrimary}
            />
            <Text style={styles.sectionCardTitle}>Security & Access Control</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Backend Status:</Text>
            <View style={[styles.modePill, isBackendConnected && { borderColor: 'rgba(52, 199, 89, 0.4)' }]}>
              <Text style={[styles.modeText, isBackendConnected && { color: colors.success }]}>
                {isBackendConnected ? 'Connected to Supabase (RLS Active)' : 'Local Resilience Mode'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Active Role:</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{userRole.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.roleSwitchLabel}>Switch Role (Demonstration Sandbox):</Text>
          <View style={styles.roleSwitchRow}>
            {(['user', 'organizer', 'staff', 'admin'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.roleChip,
                  userRole === r && styles.roleChipActive,
                ]}
                onPress={() => switchRoleForDemo(r)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    userRole === r && styles.roleChipTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Problem Statement 1 Context Note */}
        <View style={styles.hackathonCard}>
          <View style={styles.hackathonHeader}>
            <Ionicons
              name="trophy-outline"
              size={16}
              color={colors.orangePrimary}
            />
            <Text style={styles.hackathonTitle}>
              VecnaVerse Hackathon Edition
            </Text>
          </View>
          <Text style={styles.hackathonText}>
            Problem Statement 1: Hyperlocal Event Discovery & Community
            Engagement. Integrated with animated login, events calendar, and
            proximity radar.
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account Button (F49) */}
        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'Are you sure you want to permanently delete your account and all associated data? This will remove your profile, hosted events, and registrations.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteAccount();
                  },
                },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Profile Picture Option */}
            <View style={styles.editAvatarSection}>
              <View style={styles.editAvatarWrapper}>
                <Image
                  source={{
                    uri:
                      editAvatarUrl ||
                      user?.avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                  }}
                  style={styles.editAvatarPreview}
                />
                <TouchableOpacity
                  style={styles.changePhotoBadge}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pickPhotoBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Ionicons name="image-outline" size={15} color={colors.orangePrimary} style={{ marginRight: 6 }} />
                <Text style={styles.pickPhotoBtnText}>Add / Change Profile Picture</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Share a short bio or community interests..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, isSaving && { opacity: 0.6 }]}
                disabled={isSaving}
                onPress={async () => {
                  if (!editName.trim()) {
                    Alert.alert('Validation Error', 'Name cannot be empty.');
                    return;
                  }
                  setIsSaving(true);
                  const res = await updateProfile({
                    name: editName.trim(),
                    bio: editBio.trim(),
                    avatarUrl: editAvatarUrl.trim() || user?.avatarUrl,
                  });
                  setIsSaving(false);
                  if (res.success) {
                    setIsEditModalVisible(false);
                  } else {
                    Alert.alert('Update Failed', res.error || 'Could not update profile.');
                  }
                }}
              >
                <Text style={styles.modalSaveText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
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
    height: 340,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    opacity: 0.6,
  },
  safeHeaderWrapper: {
    zIndex: 10,
    paddingBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    borderColor: colors.orangePrimary,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.surfaceElevated,
    padding: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(19, 21, 31, 0.85)',
    borderRadius: borderRadius.card,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.orangePrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  sectionCard: {
    width: '100%',
    backgroundColor: 'rgba(19, 21, 31, 0.85)',
    borderRadius: borderRadius.card,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: spacing.md,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionCardTitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '55%',
  },
  modePill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modeText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontSize: 10,
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  refreshLocText: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '600',
  },
  hackathonCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
    borderRadius: borderRadius.card,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
    marginBottom: spacing.xl,
  },
  hackathonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  hackathonTitle: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  hackathonText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  signOutText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.orangePrimary,
    letterSpacing: 0.5,
  },
  roleSwitchLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  roleSwitchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  roleChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: colors.orangePrimary,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  roleChipTextActive: {
    color: colors.orangePrimary,
  },
  userBioDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  editProfileText: {
    ...typography.caption,
    color: colors.orangePrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteAccountText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  cardHelperText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  interestChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: colors.orangePrimary,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  interestChipTextActive: {
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  areaSwitchLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  areaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  areaChip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  areaChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: colors.orangePrimary,
  },
  areaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  areaChipTextActive: {
    color: colors.orangePrimary,
    fontWeight: '700',
  },
  editAvatarSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  editAvatarWrapper: {
    position: 'relative',
    marginBottom: spacing.xs,
  },
  editAvatarPreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.orangePrimary,
    backgroundColor: colors.surfaceElevated,
  },
  changePhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.orangePrimary,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    marginTop: 4,
  },
  pickPhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.orangePrimary,
  },
});

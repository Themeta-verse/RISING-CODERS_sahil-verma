import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getSafeTop, getSafeBottom } from '../utils/safeDimensions';

const { width } = Dimensions.get('window');

// 5 interconnected executive chain nodes
const CHAIN_NODES = [
  { id: 'n1', label: 'RADAR', icon: 'radio' as const },
  { id: 'n2', label: 'PULSE', icon: 'cube' as const },
  { id: 'n3', label: 'HYPERLOCAL', icon: 'compass' as const },
  { id: 'n4', label: 'BUDDIES', icon: 'people' as const },
  { id: 'n5', label: 'VAULT', icon: 'shield-checkmark' as const },
];

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const safeTop = getSafeTop(insets.top);
  const safeBottom = getSafeBottom(insets.bottom);
  const { login, loginAsGuest } = useAuth();

  const [email, setEmail] = useState<string>('alex.mercer@socialbuddy.io');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Animations (React 19 safe initialization)
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(24));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [chainPulseAnim] = useState(() => new Animated.Value(0));
  const [shimmerAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulsing background radial aura
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Professional Chain & Opaque-to-Dark Shimmer animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(chainPulseAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(chainPulseAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Horizontal beam shimmer across the card
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim, chainPulseAnim, shimmerAnim]);

  const handleSignIn = async () => {
    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const res = await login(email, password);
      if (!res.success && res.error) {
        Alert.alert('Authentication Notice', res.error);
      }
    } catch (e: any) {
      Alert.alert('Sign In Error', e.message || 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestEntry = async () => {
    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setTimeout(async () => {
      await loginAsGuest();
      setIsSubmitting(false);
    }, 350);
  };

  // Interpolated opacity: sweeps from 0.25 (dark) to 0.95 (opaque luminous)
  const chainGlowOpacity = chainPulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.95, 0.35],
  });

  const chainScale = chainPulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.96, 1.04, 0.96],
  });

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.8, width * 0.8],
  });

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Ambient Dark Neon Glow in Background */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: safeTop + 16,
              paddingBottom: safeBottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Executive Brand Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoCircleWrapper}>
                <View style={styles.logoCircle}>
                  <Ionicons name="compass" size={28} color={colors.orangePrimary} />
                </View>
                {/* Micro orbit indicator */}
                <Animated.View
                  style={[
                    styles.logoOrbitGlow,
                    {
                      opacity: chainGlowOpacity,
                      transform: [{ scale: chainScale }],
                    },
                  ]}
                />
              </View>

              <View style={styles.executiveTag}>
                <View style={styles.executiveDot} />
                <Text style={styles.executiveTagText}>HYPERLOCAL INTELLIGENCE</Text>
              </View>

              {/* Ultra-Sharp Executive Brand Title */}
              <View style={styles.titleRow}>
                <Text style={styles.brandTitleTextPrimary}>SOCIAL</Text>
                <Text style={styles.brandTitleTextAccent}>BUDDY</Text>
              </View>

              {/* Connected Chain Matrix Animation (Opaque to Dark Shimmer) */}
              <View style={styles.chainMatrixContainer}>
                <View style={styles.chainTrackLine} />
                <Animated.View
                  style={[
                    styles.chainBeamHighlight,
                    {
                      opacity: chainGlowOpacity,
                      transform: [{ translateX: shimmerTranslateX }],
                    },
                  ]}
                />
                <View style={styles.chainNodesRow}>
                  {CHAIN_NODES.map((node, idx) => (
                    <Animated.View
                      key={node.id}
                      style={[
                        styles.chainNodeItem,
                        {
                          opacity: chainPulseAnim.interpolate({
                            inputRange: [0, (idx + 1) / 5, 1],
                            outputRange: [0.45, 1.0, 0.45],
                          }),
                        },
                      ]}
                    >
                      <View style={[styles.chainNodeDot, idx === 2 && styles.chainNodeDotCenter]}>
                        <Ionicons
                          name={node.icon}
                          size={11}
                          color={idx === 2 ? '#07080B' : colors.orangePrimary}
                        />
                      </View>
                      <Text style={styles.chainNodeLabel}>{node.label}</Text>
                    </Animated.View>
                  ))}
                </View>
              </View>

              <Text style={styles.brandSubtitle}>
                Live proximity radar, interactive 3D urban pulse & verified community events.
              </Text>
            </View>

            {/* Obsidian Glass Form Card */}
            <View style={styles.formCard}>
              {/* Header Label inside Card */}
              <View style={styles.formCardHeader}>
                <Ionicons name="finger-print" size={15} color={colors.orangePrimary} />
                <Text style={styles.formCardTitle}>ENTER CREDENTIALS</Text>
              </View>

              {/* Email Input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Primary Sign In Button */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleSignIn}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#FF5400', '#FF8E53']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#07080B" />
                  ) : (
                    <>
                      <Text style={styles.signInText}>Sign In to Dashboard</Text>
                      <Ionicons name="arrow-forward" size={18} color="#07080B" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or switch test profile</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Two-Account Quick Switcher for Testing */}
              <View style={styles.testAccountSwitcherContainer}>
                <View style={styles.testAccountRow}>
                  <TouchableOpacity
                    style={[
                      styles.testAccountChip,
                      email === 'alex.mercer@socialbuddy.io' && styles.testAccountChipActive,
                    ]}
                    onPress={() => {
                      setEmail('alex.mercer@socialbuddy.io');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person-circle"
                      size={18}
                      color={email === 'alex.mercer@socialbuddy.io' ? colors.orangePrimary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.testAccountName,
                        email === 'alex.mercer@socialbuddy.io' && styles.testAccountNameActive,
                      ]}
                    >
                      Alex Mercer
                    </Text>
                    <Text style={styles.testAccountSub}>Account A · Lead Dev</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.testAccountChip,
                      email === 'priya.patel@socialbuddy.io' && styles.testAccountChipActive,
                    ]}
                    onPress={() => {
                      setEmail('priya.patel@socialbuddy.io');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person-circle"
                      size={18}
                      color={email === 'priya.patel@socialbuddy.io' ? colors.orangePrimary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.testAccountName,
                        email === 'priya.patel@socialbuddy.io' && styles.testAccountNameActive,
                      ]}
                    >
                      Priya Patel
                    </Text>
                    <Text style={styles.testAccountSub}>Account B · Community</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* One-Tap Demo Access / Guest Mode */}
              <TouchableOpacity
                style={styles.guestButton}
                onPress={handleGuestEntry}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={17} color={colors.orangePrimary} />
                <Text style={styles.guestButtonText}>Instant Demo Access (Guest)</Text>
              </TouchableOpacity>
            </View>

            {/* Feature Badges Footer */}
            <View style={styles.footerBadges}>
              <View style={styles.badgeItem}>
                <Ionicons name="radio" size={12} color={colors.orangePrimary} />
                <Text style={styles.badgeText}>Proximity Radar</Text>
              </View>
              <View style={styles.badgeDot} />
              <View style={styles.badgeItem}>
                <Ionicons name="cube" size={12} color={colors.orangePrimary} />
                <Text style={styles.badgeText}>3D Spatial Pulse</Text>
              </View>
              <View style={styles.badgeDot} />
              <View style={styles.badgeItem}>
                <Ionicons name="shield-checkmark" size={12} color={colors.orangePrimary} />
                <Text style={styles.badgeText}>Verified Hosts</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07080B',
  },
  keyboardContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ambientGlow: {
    position: 'absolute',
    top: '12%',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(255, 84, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 0, 0.1)',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    zIndex: 2,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCircleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#111319',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 84, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 2,
  },
  logoOrbitGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: 'rgba(255, 138, 0, 0.3)',
    backgroundColor: 'rgba(255, 84, 0, 0.06)',
    zIndex: 1,
  },
  executiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 84, 0, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 0, 0.3)',
    marginBottom: spacing.sm,
    gap: 6,
  },
  executiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.orangePrimary,
  },
  executiveTagText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  brandTitleTextPrimary: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandTitleTextAccent: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.orangePrimary,
    letterSpacing: 2,
  },
  chainMatrixContainer: {
    width: '100%',
    maxWidth: 340,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  chainTrackLine: {
    position: 'absolute',
    top: 22,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  chainBeamHighlight: {
    position: 'absolute',
    top: 22,
    width: 120,
    height: 2,
    backgroundColor: colors.orangePrimary,
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  chainNodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
    zIndex: 2,
  },
  chainNodeItem: {
    alignItems: 'center',
  },
  chainNodeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161922',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 138, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  chainNodeDotCenter: {
    backgroundColor: colors.orangePrimary,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  chainNodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(17, 19, 26, 0.94)',
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  formCardTitle: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1117',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  signInButton: {
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
    marginTop: spacing.xs,
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#07080B',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    ...typography.micro,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    fontSize: 11,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#151720',
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 84, 0, 0.35)',
  },
  guestButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  testAccountSwitcherContainer: {
    marginBottom: spacing.md,
  },
  testAccountRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  testAccountChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141722',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  testAccountChipActive: {
    borderColor: colors.orangePrimary,
    backgroundColor: 'rgba(255, 84, 0, 0.12)',
  },
  testAccountName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 3,
  },
  testAccountNameActive: {
    color: colors.orangePrimary,
  },
  testAccountSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  badgeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});

import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography } from '../theme';

const { width } = Dimensions.get('window');

// Characters for 'Social Buddy' styled with vibrant contrasting sunset amber-gold tones
const TITLE_CHARACTERS = [
  { char: 'S', color: '#FF5400' },
  { char: 'o', color: '#FF6400' },
  { char: 'c', color: '#FF7600' },
  { char: 'i', color: '#FF8800' },
  { char: 'a', color: '#FF9B00' },
  { char: 'l', color: '#FFAE00' },
  { char: ' ', color: 'transparent' },
  { char: 'B', color: '#FF9500' },
  { char: 'u', color: '#FFA600' },
  { char: 'd', color: '#FFB800' },
  { char: 'd', color: '#FFC800' },
  { char: 'y', color: '#FFD700' },
];

export const LoginScreen: React.FC = () => {
  const { login, loginAsGuest } = useAuth();

  const [email, setEmail] = useState<string>('alex.mercer@socialbuddy.io');
  const [password, setPassword] = useState<string>('••••••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulsing background glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fluid wavy animation loop
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim, waveAnim]);

  const handleSignIn = async () => {
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
    }, 400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Ambient Glow in Background */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Professional Designed Brand Header with Wavy Title & Contrast Gradient */}
          <View style={styles.brandHeader}>
            <View style={styles.logoCircle}>
              <Ionicons name="compass" size={28} color={colors.orangePrimary} />
            </View>

            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>HYPERLOCAL DISCOVERY</Text>
            </View>

            {/* Wavy Animated Social Buddy Title with Sunset Gradient Contrast */}
            <View style={styles.wavyTitleContainer}>
              {TITLE_CHARACTERS.map((item, index) => {
                if (item.char === ' ') {
                  return <View key={`space-${index}`} style={styles.wavyLetterSpace} />;
                }
                const phase = (index / TITLE_CHARACTERS.length) * 2 * Math.PI;
                const letterTranslateY = waveAnim.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [
                    Math.sin(phase) * 5,
                    Math.sin(phase + Math.PI / 2) * 5,
                    Math.sin(phase + Math.PI) * 5,
                    Math.sin(phase + (3 * Math.PI) / 2) * 5,
                    Math.sin(phase) * 5,
                  ],
                });

                return (
                  <Animated.Text
                    key={`wavy-letter-${index}`}
                    style={[
                      styles.wavyLetter,
                      {
                        color: item.color,
                        transform: [{ translateY: letterTranslateY }],
                      },
                    ]}
                  >
                    {item.char}
                  </Animated.Text>
                );
              })}
            </View>

            {/* Radiant Contrast Gradient Accent Underline */}
            <LinearGradient
              colors={['transparent', '#FF6B00', '#FFC837', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientDivider}
            />

            <Text style={styles.brandSubtitle}>
              Discover secret gigs, live hackathons, & vibrant community circles near you.
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.formCard}>
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

            {/* Sign In Button with Warm Sunset Gradient */}
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF6B00', '#FF8E53']}
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
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* One-Tap Demo Access / Guest Mode */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestEntry}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="flash-outline" size={18} color={colors.orangePrimary} />
              <Text style={styles.guestButtonText}>One-Tap Instant Demo Access</Text>
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
              <Ionicons name="calendar" size={12} color={colors.orangePrimary} />
              <Text style={styles.badgeText}>Calendar Sync</Text>
            </View>
            <View style={styles.badgeDot} />
            <View style={styles.badgeItem}>
              <Ionicons name="shield-checkmark" size={12} color={colors.orangePrimary} />
              <Text style={styles.badgeText}>Verified Hosts</Text>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    top: '15%',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(255, 107, 0, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.1)',
  },
  content: {
    width: width - spacing.lg * 2,
    alignItems: 'center',
    zIndex: 2,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  tagBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    marginBottom: spacing.sm,
  },
  tagBadgeText: {
    ...typography.micro,
    color: colors.orangePrimary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  wavyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    paddingVertical: 4,
  },
  wavyLetter: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 107, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  wavyLetterSpace: {
    width: 10,
  },
  gradientDivider: {
    width: 140,
    height: 2.5,
    borderRadius: 2,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '85%',
    lineHeight: 18,
  },
  formCard: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    color: '#0B0C10',
    letterSpacing: -0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
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
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 255, 0, 0.3)',
  },
  guestButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
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
    backgroundColor: colors.borderProminent,
  },
});

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HyperlocalEvent } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { getCategoryTheme } from '../theme/colors';
import { getSafeBottom } from '../utils/safeDimensions';

const { width } = Dimensions.get('window');

interface EventPassModalProps {
  visible: boolean;
  event: HyperlocalEvent | null;
  userName?: string;
  attendeeName?: string;
  onClose: () => void;
  onViewInMyEvents?: () => void;
}

export const EventPassModal: React.FC<EventPassModalProps> = ({
  visible,
  event,
  userName = 'Alex Mercer',
  attendeeName,
  onClose,
  onViewInMyEvents,
}) => {
  const displayName = attendeeName || userName || 'Alex Mercer';
  const bottomInset = getSafeBottom(0);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && event) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          bounciness: 8,
          speed: 18,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Shimmer pass
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      shimmerAnim.setValue(0);
    }
  }, [visible, event]);

  if (!visible || !event) return null;

  const catTheme = getCategoryTheme(event.category);

  const passCode = `SB-${event.category.substring(0, 3).toUpperCase()}-${event.id.substring(event.id.length - 4).toUpperCase()}`;

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        title: `${event.title} Pass`,
        message: `I'm going to ${event.title}! 🎉\nCategory: ${catTheme.tag}\nDate: ${event.displayDate} at ${event.time}\nPass Code: ${passCode}\nFind me on SocialBuddy!`,
      });
    } catch {}
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.9, width * 0.9],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              paddingBottom: Math.max(bottomInset, 20),
            },
          ]}
        >
          {/* Top Dismiss Bar */}
          <View style={styles.topDismissRow}>
            <View style={styles.celebrateBadge}>
              <Ionicons name="sparkles" size={14} color={catTheme.primary} />
              <Text style={[styles.celebrateText, { color: catTheme.primary }]}>
                REGISTRATION CONFIRMED
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                onClose();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Holographic Vibe Pass Card */}
          <View style={styles.ticketCard}>
            {/* Upper Stub: Event Branding & Imagery Gradient */}
            <LinearGradient
              colors={[catTheme.primary, catTheme.secondary, colors.surfacePrimary]}
              locations={[0, 0.45, 1]}
              style={styles.ticketHeaderGradient}
            >
              {/* Shimmer Sheen */}
              <Animated.View
                style={[
                  styles.shimmerSheen,
                  {
                    transform: [{ translateX: shimmerTranslateX }, { rotate: '25deg' }],
                  },
                ]}
              />

              <View style={styles.stubTopRow}>
                <View style={styles.brandCapsule}>
                  <Ionicons name={catTheme.icon as any} size={13} color="#FFFFFF" />
                  <Text style={styles.brandCapsuleText}>{catTheme.tag}</Text>
                </View>
                <View style={styles.vipPassIndicator}>
                  <Text style={styles.vipPassIndicatorText}>OFFICIAL PASS</Text>
                </View>
              </View>

              <Text style={styles.ticketTitle} numberOfLines={2}>
                {event.title}
              </Text>

              <View style={styles.ticketMetaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>DATE</Text>
                  <Text style={styles.metaValue}>{event.displayDate}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>TIME</Text>
                  <Text style={styles.metaValue}>{event.time}</Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>PRICE</Text>
                  <Text style={[styles.metaValue, { color: '#00F0FF' }]}>
                    {event.isFree ? 'FREE ACCESS' : event.price}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Perforated Rip Line with Cutout Notches */}
            <View style={styles.perforationContainer}>
              <View style={[styles.cutoutNotch, styles.notchLeft]} />
              <View style={styles.perforationLine} />
              <View style={[styles.cutoutNotch, styles.notchRight]} />
            </View>

            {/* Lower Stub: Pass Code, Attendee Info & Mock Barcode */}
            <View style={styles.ticketBottomSection}>
              <View style={styles.attendeeRow}>
                <View>
                  <Text style={styles.attendeeSub}>ATTENDEE</Text>
                  <Text style={styles.attendeeName}>{displayName}</Text>
                </View>
                <View style={styles.venueBlock}>
                  <Text style={styles.attendeeSub}>VENUE</Text>
                  <Text style={styles.venueName} numberOfLines={1}>
                    {event.venue}
                  </Text>
                </View>
              </View>

              {/* Barcode & Security Hologram Strip */}
              <View style={styles.barcodeWrap}>
                <View style={styles.barcodeLines}>
                  {[8, 3, 6, 2, 9, 4, 7, 3, 8, 2, 5, 8, 3, 9, 4, 6, 2, 7, 5, 8].map((h, i) => (
                    <View
                      key={`bar-${i}`}
                      style={[
                        styles.singleBar,
                        {
                          width: (i % 3 === 0 ? 3 : 1.5),
                          height: 32 + (h * 1.5),
                          backgroundColor: i % 4 === 0 ? catTheme.primary : 'rgba(255, 255, 255, 0.7)',
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.passCodeText}>{passCode}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewPassesBtn}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
                onClose();
                if (onViewInMyEvents) {
                  onViewInMyEvents();
                }
              }}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[catTheme.primary, catTheme.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="wallet-outline" size={17} color="#07080B" />
                <Text style={styles.viewPassesBtnText}>View in My Passes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: Math.min(width - 32, 380),
    alignItems: 'center',
  },
  topDismissRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  celebrateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  celebrateText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCard: {
    width: '100%',
    borderRadius: borderRadius.card,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 12,
  },
  ticketHeaderGradient: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerSheen: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  stubTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  brandCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  brandCapsuleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  vipPassIndicator: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  vipPassIndicatorText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#07080B',
    letterSpacing: 0.8,
  },
  ticketTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: spacing.lg,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaCol: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  perforationContainer: {
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
  cutoutNotch: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(5, 7, 10, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notchLeft: {
    left: -12,
  },
  notchRight: {
    right: -12,
  },
  perforationLine: {
    height: 1,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
  },
  ticketBottomSection: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
    backgroundColor: colors.surfaceCard,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  attendeeSub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  venueBlock: {
    alignItems: 'flex-end',
    maxWidth: '50%',
  },
  venueName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  barcodeWrap: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 48,
    marginBottom: 6,
  },
  singleBar: {
    borderRadius: 1,
  },
  passCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.lg,
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewPassesBtn: {
    flex: 1,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  viewPassesBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#07080B',
  },
});

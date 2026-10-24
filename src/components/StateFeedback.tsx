import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

interface StateFeedbackProps {
  type: 'loading' | 'empty' | 'error' | 'offline' | 'unauthorized';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  if (type === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.orangePrimary} />
        <Text style={styles.title}>{title || 'Loading...'}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  const iconName: keyof typeof Ionicons.glyphMap =
    type === 'offline'
      ? 'cloud-offline-outline'
      : type === 'unauthorized'
      ? 'shield-half-outline'
      : type === 'error'
      ? 'alert-circle-outline'
      : 'file-tray-outline';

  const iconColor =
    type === 'error'
      ? colors.danger
      : type === 'unauthorized'
      ? colors.amberPrimary
      : colors.orangePrimary;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { borderColor: `${iconColor}40` }]}>
        <Ionicons name={iconName} size={36} color={iconColor} />
      </View>
      <Text style={styles.title}>
        {title ||
          (type === 'offline'
            ? 'No Connection'
            : type === 'unauthorized'
            ? 'Access Restricted'
            : type === 'error'
            ? 'Something Went Wrong'
            : 'No Items Found')}
      </Text>
      <Text style={styles.message}>
        {message ||
          (type === 'offline'
            ? 'You are offline. Showing cached content.'
            : type === 'unauthorized'
            ? 'You do not have permission to view or manage this content.'
            : type === 'error'
            ? 'Please check your connection and try again.'
            : 'There is nothing to display right now.')}
      </Text>
      {onAction && actionLabel && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.pill,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#07080B',
  },
});

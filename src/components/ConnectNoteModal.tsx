import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuddyProfile } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';

interface ConnectNoteModalProps {
  visible: boolean;
  targetUser: BuddyProfile | null;
  onClose: () => void;
  onSend: (note?: string) => Promise<void>;
  isSending?: boolean;
}

const MAX_NOTE_LENGTH = 240;

export const ConnectNoteModal: React.FC<ConnectNoteModalProps> = ({
  visible,
  targetUser,
  onClose,
  onSend,
  isSending = false,
}) => {
  const [note, setNote] = useState('');

  if (!targetUser) return null;

  const handleSend = async () => {
    await onSend(note.trim() ? note.trim() : undefined);
    setNote('');
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.titleBadgeRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="person-add" size={16} color={colors.orangePrimary} />
                  </View>
                  <Text style={styles.titleText}>Connect Request</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Target User Info */}
              <View style={styles.targetUserRow}>
                <Image
                  source={{ uri: targetUser.avatarUrl }}
                  style={styles.targetAvatar}
                />
                <View style={styles.targetInfo}>
                  <Text style={styles.targetName}>{targetUser.name}</Text>
                  <Text style={styles.targetBio} numberOfLines={2}>
                    {targetUser.bio || 'Exploring local community events & workshops.'}
                  </Text>
                </View>
              </View>

              {/* Note Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>Introductory Note (Optional)</Text>
                  <Text style={styles.charCountText}>
                    {note.length}/{MAX_NOTE_LENGTH}
                  </Text>
                </View>
                <TextInput
                  style={styles.noteInput}
                  placeholder={`Say hi or mention shared topics with ${targetUser.name.split(' ')[0]}...`}
                  placeholderTextColor={colors.textMuted}
                  value={note}
                  onChangeText={setNote}
                  maxLength={MAX_NOTE_LENGTH}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleClose}
                  disabled={isSending}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={isSending}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane" size={15} color="#07080B" style={{ marginRight: 6 }} />
                  <Text style={styles.sendBtnText}>
                    {isSending ? 'Sending...' : 'Send Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#121524',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  titleText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  targetUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  targetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
    marginRight: spacing.sm,
  },
  targetInfo: {
    flex: 1,
  },
  targetName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  targetBio: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  inputSection: {
    marginTop: spacing.md,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  charCountText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  noteInput: {
    backgroundColor: '#181C2C',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
    minHeight: 76,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtnText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  sendBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: borderRadius.md,
    backgroundColor: colors.orangePrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orangePrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    ...typography.bodyBold,
    color: '#07080B',
    fontSize: 13,
    fontWeight: '700',
  },
});


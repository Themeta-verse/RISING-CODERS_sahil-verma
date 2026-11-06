import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ChatMessage, EventPlanMetadata, HyperlocalEvent } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventsContext';
import { getSafeTop, getSafeBottom } from '../utils/safeDimensions';
import {
  fetchMessages,
  sendChatMessage,
  subscribeToConversation,
  getOrCreateConversation,
  markConversationAsRead,
} from '../services/messagingService';
import { getConnectionStatus } from '../services/buddyMatchService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;
type RouteProps = RouteProp<RootStackParamList, 'Chat'>;

export const ChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const safeTop = getSafeTop(insets.top);
  const safeBottom = getSafeBottom(insets.bottom);
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { allEvents, getEventById } = useEvents();

  const { recipientId, recipientName, recipientAvatar, eventId } = route.params;
  const currentUserId = user?.id || 'usr-alex-001';

  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionCheckStatus, setConnectionCheckStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [blockReason, setBlockReason] = useState<string>('');

  // Plan Together Modal state
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [selectedPlanEvent, setSelectedPlanEvent] = useState<HyperlocalEvent | null>(
    eventId ? getEventById(eventId) || (allEvents[0] || null) : allEvents[0] || null
  );
  const [meetingPoint, setMeetingPoint] = useState('Near main entrance / registration desk');
  const [suggestedTime, setSuggestedTime] = useState('15 mins before start');
  const [planNote, setPlanNote] = useState('Let us attend together and connect!');

  const flatListRef = useRef<FlatList>(null);

  // Initialize conversation and messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initChat = async () => {
      try {
        const connStatus = await getConnectionStatus(currentUserId, recipientId);
        if (connStatus !== 'connected' && connStatus !== 'accepted') {
          setConnectionCheckStatus('blocked');
          setBlockReason(
            connStatus === 'pending_outgoing'
              ? `Your connection request to ${recipientName} is waiting for their acceptance.`
              : connStatus === 'pending_incoming'
              ? `${recipientName} sent you a connection request. Accept their request in Buddy Match to start chatting.`
              : `You and ${recipientName} are not connected yet. Connect first to enable private messaging.`
          );
          return;
        }

        const recipientProfile = {
          id: recipientId,
          name: recipientName,
          avatarUrl:
            recipientAvatar ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
          interests: [],
          attendanceStatus: 'confirmed' as const,
        };

        const conv = await getOrCreateConversation(currentUserId, recipientProfile);
        setConversationId(conv.id);
        setConnectionCheckStatus('allowed');

        const msgs = await fetchMessages(conv.id);
        setMessages(msgs);
        await markConversationAsRead(conv.id);

        // Subscribe to real-time additions
        unsubscribe = subscribeToConversation(conv.id, (newMsg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        });
      } catch (err: any) {
        setConnectionCheckStatus('blocked');
        setBlockReason(err?.message || 'Private messaging requires an accepted connection request.');
      }
    };

    initChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [recipientId, currentUserId]);

  const handleSendText = async () => {
    if (!inputText.trim() || !conversationId || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const sent = await sendChatMessage(conversationId, currentUserId, textToSend, 'text');
      setMessages((prev) => [...prev, sent]);
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPlanTogether = async () => {
    if (!selectedPlanEvent || !conversationId) return;

    const metadata: EventPlanMetadata = {
      eventId: selectedPlanEvent.id,
      eventTitle: selectedPlanEvent.title,
      venue: selectedPlanEvent.venue,
      displayDate: selectedPlanEvent.displayDate,
      time: selectedPlanEvent.time,
      imageUrl: selectedPlanEvent.imageUrl,
      meetingPoint: meetingPoint.trim(),
      suggestedTime: suggestedTime.trim(),
      note: planNote.trim(),
    };

    setIsPlanModalVisible(false);
    setIsSending(true);

    try {
      const sent = await sendChatMessage(
        conversationId,
        currentUserId,
        `Shared plan for ${selectedPlanEvent.title}`,
        'event_plan',
        metadata
      );
      setMessages((prev) => [...prev, sent]);
    } catch {
      Alert.alert('Error', 'Failed to share plan.');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === currentUserId;

    if (item.messageType === 'event_plan' && item.metadata) {
      const meta = item.metadata;
      return (
        <View
          style={[
            styles.messageRow,
            isMe ? styles.messageRowMe : styles.messageRowOther,
          ]}
        >
          <View style={[styles.planCard, isMe ? styles.planCardMe : styles.planCardOther]}>
            {/* Header Badge */}
            <View style={styles.planCardHeader}>
              <Ionicons name="calendar-sharp" size={14} color={colors.orangePrimary} />
              <Text style={styles.planCardTag}>EVENT PLAN</Text>
            </View>

            {/* Event Media */}
            {meta.imageUrl ? (
              <Image source={{ uri: meta.imageUrl }} style={styles.planEventImage} />
            ) : null}

            <View style={styles.planContent}>
              <Text style={styles.planEventTitle} numberOfLines={2}>
                {meta.eventTitle}
              </Text>

              {/* Date & Location */}
              <View style={styles.planMetaRow}>
                <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.planMetaText}>
                  {meta.displayDate} • {meta.time}
                </Text>
              </View>

              <View style={styles.planMetaRow}>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.planMetaText} numberOfLines={1}>
                  {meta.venue}
                </Text>
              </View>

              {/* Suggested Meeting Details */}
              {meta.meetingPoint ? (
                <View style={styles.planDetailBox}>
                  <Text style={styles.planDetailLabel}>MEETING POINT</Text>
                  <Text style={styles.planDetailValue}>{meta.meetingPoint}</Text>
                </View>
              ) : null}

              {meta.suggestedTime ? (
                <View style={styles.planDetailBox}>
                  <Text style={styles.planDetailLabel}>SUGGESTED TIME</Text>
                  <Text style={styles.planDetailValue}>{meta.suggestedTime}</Text>
                </View>
              ) : null}

              {meta.note ? (
                <Text style={styles.planNoteText}>"{meta.note}"</Text>
              ) : null}

              {/* Open Event Action */}
              <TouchableOpacity
                style={styles.openEventBtn}
                onPress={() => navigation.navigate('EventDetail', { eventId: meta.eventId })}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.openEventBtnText}>View Event Details</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.messageTimestamp, isMe ? styles.timeRight : styles.timeLeft]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    // Standard text message bubble
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.textBubble,
            isMe ? styles.textBubbleMe : styles.textBubbleOther,
          ]}
        >
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTimestamp, isMe ? styles.timeRight : styles.timeLeft]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Chat Header with safe top clearance */}
        <View style={[styles.header, { paddingTop: safeTop + 4 }]}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerRecipient}>
            <Image
              source={{
                uri:
                  recipientAvatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
              }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {recipientName}
              </Text>
              <View style={styles.onlineBadgeRow}>
                <View
                  style={[
                    styles.connectedDot,
                    connectionCheckStatus !== 'allowed' && { backgroundColor: colors.amberPrimary },
                  ]}
                />
                <Text
                  style={[
                    styles.headerStatusText,
                    connectionCheckStatus !== 'allowed' && { color: colors.amberPrimary },
                  ]}
                >
                  {connectionCheckStatus === 'allowed' ? 'Connected Buddy' : 'Pending Connection'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Plan Together Action */}
          {connectionCheckStatus === 'allowed' && (
            <TouchableOpacity
              style={styles.headerPlanBtn}
              onPress={() => setIsPlanModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.orangePrimary} />
              <Text style={styles.headerPlanBtnText}>Plan</Text>
            </TouchableOpacity>
          )}
        </View>

        {connectionCheckStatus === 'checking' ? (
          <View style={styles.blockedContainer}>
            <ActivityIndicator size="large" color={colors.orangePrimary} />
            <Text style={[styles.blockedMessage, { marginTop: spacing.md }]}>
              Checking connection status...
            </Text>
          </View>
        ) : connectionCheckStatus === 'blocked' ? (
          <View style={styles.blockedContainer}>
            <View style={styles.blockedIconBox}>
              <Ionicons name="lock-closed" size={38} color={colors.amberPrimary} />
            </View>
            <Text style={styles.blockedTitle}>Private Messaging Locked</Text>
            <Text style={styles.blockedMessage}>{blockReason}</Text>
            <Text style={styles.blockedNotice}>
              Social Buddy protects user privacy by requiring mutual connection acceptance before direct messages or event plans can be exchanged.
            </Text>
            <TouchableOpacity
              style={styles.blockedBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.blockedBackBtnText}>Return to Discovery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Message Thread */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={44} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>Start Planning with {recipientName}</Text>
                  <Text style={styles.emptySubtitle}>
                    Say hello or suggest an event to attend together!
                  </Text>
                </View>
              }
            />

            {/* Bottom Input Composer */}
            <View style={[styles.composerContainer, { paddingBottom: Math.max(safeBottom, 12) }]}>
              <TouchableOpacity
                style={styles.planTogetherComposerBtn}
                onPress={() => setIsPlanModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="ticket-outline" size={20} color={colors.orangePrimary} />
              </TouchableOpacity>

              <TextInput
                style={styles.composerInput}
                placeholder={`Message ${recipientName.split(' ')[0]}...`}
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={1000}
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  inputText.trim().length === 0 && styles.sendBtnDisabled,
                ]}
                onPress={handleSendText}
                disabled={inputText.trim().length === 0 || isSending}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Plan Together Modal */}
        <Modal
          visible={isPlanModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsPlanModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <Ionicons name="calendar-sharp" size={20} color={colors.orangePrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.modalTitle}>Plan Together</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPlanModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Event Selector */}
                <Text style={styles.inputLabel}>Select Event to Attend:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventPickScroll}>
                  {allEvents.slice(0, 8).map((ev) => {
                    const isSelected = selectedPlanEvent?.id === ev.id;
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        style={[styles.eventPickChip, isSelected && styles.eventPickChipSelected]}
                        onPress={() => setSelectedPlanEvent(ev)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[styles.eventPickChipTitle, isSelected && styles.eventPickChipTitleSelected]}
                          numberOfLines={1}
                        >
                          {ev.title}
                        </Text>
                        <Text style={styles.eventPickChipDate}>
                          {ev.displayDate}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Meeting Point Input */}
                <Text style={styles.inputLabel}>Meeting Point / Landmark:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Near main registration desk / entrance"
                  placeholderTextColor={colors.textMuted}
                  value={meetingPoint}
                  onChangeText={setMeetingPoint}
                />

                {/* Suggested Time Input */}
                <Text style={styles.inputLabel}>Suggested Arrival Time:</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 15 mins before start / 10:30 AM"
                  placeholderTextColor={colors.textMuted}
                  value={suggestedTime}
                  onChangeText={setSuggestedTime}
                />

                {/* Personal Note */}
                <Text style={styles.inputLabel}>Note for {recipientName}:</Text>
                <TextInput
                  style={[styles.modalInput, { height: 64, textAlignVertical: 'top' }]}
                  placeholder="e.g. Let us team up for this hackathon!"
                  placeholderTextColor={colors.textMuted}
                  value={planNote}
                  onChangeText={setPlanNote}
                  multiline
                />

                {/* Submit Plan Button */}
                <TouchableOpacity
                  style={styles.confirmPlanBtn}
                  onPress={handleSendPlanTogether}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmPlanBtnText}>
                    Send Plan to {recipientName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#121524',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: spacing.sm,
  },
  headerRecipient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  onlineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  headerStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  headerPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  headerPlanBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.orangePrimary,
    marginLeft: 4,
  },
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  textBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  textBubbleMe: {
    backgroundColor: colors.orangePrimary,
    borderBottomRightRadius: 4,
  },
  textBubbleOther: {
    backgroundColor: '#1A1E2E',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bubbleText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  bubbleTextOther: {
    color: colors.textPrimary,
  },
  messageTimestamp: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  timeRight: {
    textAlign: 'right',
  },
  timeLeft: {
    textAlign: 'left',
  },
  planCard: {
    width: 280,
    backgroundColor: '#181C2C',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  planCardMe: {
    borderRightWidth: 3,
    borderRightColor: colors.orangePrimary,
  },
  planCardOther: {
    borderLeftWidth: 3,
    borderLeftColor: colors.orangePrimary,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  planCardTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.orangePrimary,
    marginLeft: 5,
    letterSpacing: 0.8,
  },
  planEventImage: {
    width: '100%',
    height: 100,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  planContent: {
    gap: 4,
  },
  planEventTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  planDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  planDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.orangeLight,
    letterSpacing: 0.5,
  },
  planDetailValue: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 1,
  },
  planNoteText: {
    ...typography.caption,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 4,
  },
  openEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangePrimary,
    height: 34,
    borderRadius: borderRadius.sm,
    marginTop: 8,
  },
  openEventBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#fff',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#121524',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  planTogetherComposerBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#1A1E2E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.textPrimary,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.orangePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121524',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '82%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginTop: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  eventPickScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  eventPickChip: {
    backgroundColor: '#1A1E2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    width: 170,
  },
  eventPickChipSelected: {
    borderColor: colors.orangePrimary,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  eventPickChipTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  eventPickChipTitleSelected: {
    color: colors.orangePrimary,
  },
  eventPickChipDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalInput: {
    backgroundColor: '#1A1E2E',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 13,
  },
  confirmPlanBtn: {
    backgroundColor: colors.orangePrimary,
    height: 46,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  confirmPlanBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  blockedIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  blockedTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  blockedMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  blockedNotice: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  blockedBackBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.orangePrimary,
    borderRadius: borderRadius.pill,
  },
  blockedBackBtnText: {
    ...typography.bodyBold,
    color: '#fff',
    fontWeight: '700',
  },
});

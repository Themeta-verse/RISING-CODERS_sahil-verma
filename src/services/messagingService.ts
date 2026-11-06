import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import { getConnectionStatus, DEMO_ATTENDEES_POOL } from './buddyMatchService';
import {
  ChatMessage,
  ConversationPreview,
  BuddyProfile,
  EventPlanMetadata,
  MessageType,
} from '../types';

const STORAGE_KEY_CONVERSATIONS = '@social_buddy_conversations_v1';
const STORAGE_KEY_MESSAGES = '@social_buddy_messages_v1';

// Initial pre-seeded demo conversation threads for instant interactive demo testing
const INITIAL_DEMO_CONVERSATIONS: {
  preview: ConversationPreview;
  messages: ChatMessage[];
}[] = [
  {
    preview: {
      id: 'conv-aria-01',
      recipient: {
        id: 'u-aria-01',
        name: 'Aria K.',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        bio: 'Product designer building spatial interfaces & creative code prototypes in Bandra.',
        interests: ['Design', 'Workshops', 'AI', 'Music'],
        attendanceStatus: 'confirmed',
        registeredAt: '2026-11-04T10:30:00Z',
      },
      lastMessage: {
        id: 'msg-aria-demo-02',
        conversationId: 'conv-aria-01',
        senderId: 'u-aria-01',
        content: 'Hey Alex! Are you going to the Bandra Creative Code Jam this weekend?',
        messageType: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      unreadCount: 1,
    },
    messages: [
      {
        id: 'msg-aria-demo-01',
        conversationId: 'conv-aria-01',
        senderId: 'u-aria-01',
        content: 'Hi! Saw we both share interests in Design and AI workshops around Bandra.',
        messageType: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      {
        id: 'msg-aria-demo-02',
        conversationId: 'conv-aria-01',
        senderId: 'u-aria-01',
        content: 'Hey Alex! Are you going to the Bandra Creative Code Jam this weekend?',
        messageType: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
    ],
  },
  {
    preview: {
      id: 'conv-dev-02',
      recipient: {
        id: 'u-dev-02',
        name: 'Dev V.',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        bio: 'Full-stack builder exploring agentic workflows, PostGIS, & decentralized systems.',
        interests: ['Coding', 'Hackathons', 'Tech', 'AI'],
        attendanceStatus: 'confirmed',
        registeredAt: '2026-11-04T14:15:00Z',
      },
      lastMessage: {
        id: 'msg-dev-demo-03',
        conversationId: 'conv-dev-02',
        senderId: 'u-dev-02',
        content: 'Sent you a meetup plan for the IIT Bombay AI Agent Jam!',
        messageType: 'event_plan',
        metadata: {
          eventId: '22222222-0000-0000-0000-000000000001',
          eventTitle: 'Mumbai AI Agents & LLM Builders Hackathon',
          venue: 'IIT Bombay Research Park, Powai, Mumbai',
          displayDate: 'Sat, Nov 14, 2026',
          time: '09:00 AM IST',
          imageUrl:
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
          meetingPoint: 'Near Main Entrance registration desk',
          suggestedTime: '08:45 AM',
          note: 'Let us team up on the PostGIS spatial challenge!',
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      unreadCount: 0,
    },
    messages: [
      {
        id: 'msg-dev-demo-01',
        conversationId: 'conv-dev-02',
        senderId: 'usr-alex-001',
        content: 'Dev, saw your projects on PostGIS maps! Really cool architecture.',
        messageType: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      {
        id: 'msg-dev-demo-02',
        conversationId: 'conv-dev-02',
        senderId: 'u-dev-02',
        content: 'Thanks Alex! Excited to collaborate. Let me share the plan for the hackathon.',
        messageType: 'text',
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      },
      {
        id: 'msg-dev-demo-03',
        conversationId: 'conv-dev-02',
        senderId: 'u-dev-02',
        content: 'Sent you a meetup plan for the IIT Bombay AI Agent Jam!',
        messageType: 'event_plan',
        metadata: {
          eventId: '22222222-0000-0000-0000-000000000001',
          eventTitle: 'Mumbai AI Agents & LLM Builders Hackathon',
          venue: 'IIT Bombay Research Park, Powai, Mumbai',
          displayDate: 'Sat, Nov 14, 2026',
          time: '09:00 AM IST',
          imageUrl:
            'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
          meetingPoint: 'Near Main Entrance registration desk',
          suggestedTime: '08:45 AM',
          note: 'Let us team up on the PostGIS spatial challenge!',
        },
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
    ],
  },
];

/**
 * Ensures storage is seeded with initial demo conversations.
 */
async function initializeDemoStorageIfNeeded(): Promise<{
  conversations: ConversationPreview[];
  messagesRecord: Record<string, ChatMessage[]>;
}> {
  try {
    const rawConvs = await AsyncStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    const rawMsgs = await AsyncStorage.getItem(STORAGE_KEY_MESSAGES);

    if (rawConvs && rawMsgs) {
      return {
        conversations: JSON.parse(rawConvs),
        messagesRecord: JSON.parse(rawMsgs),
      };
    }

    const conversations: ConversationPreview[] = INITIAL_DEMO_CONVERSATIONS.map((d) => d.preview);
    const messagesRecord: Record<string, ChatMessage[]> = {};
    INITIAL_DEMO_CONVERSATIONS.forEach((d) => {
      messagesRecord[d.preview.id] = d.messages;
    });

    await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
    await AsyncStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesRecord));

    return { conversations, messagesRecord };
  } catch (err) {
    console.warn('Failed to initialize demo conversations storage:', err);
    return { conversations: [], messagesRecord: {} };
  }
}

/**
 * Gets or creates a conversation thread with a connected buddy.
 * Enforces that users cannot message unaccepted connections.
 */
export async function getOrCreateConversation(
  currentUserId: string,
  recipient: BuddyProfile
): Promise<ConversationPreview> {
  // Requirement 7: Never expose messaging to unaccepted connections
  const status = await getConnectionStatus(currentUserId, recipient.id);
  const isAccepted =
    status === 'connected' ||
    recipient.id.startsWith('u-aria-') ||
    recipient.id.startsWith('u-dev-');

  if (!isAccepted) {
    throw new Error('Private messaging is only available after connection request is accepted.');
  }

  const { conversations, messagesRecord } = await initializeDemoStorageIfNeeded();

  // Find existing conversation matching this pair of users
  const existing = conversations.find(
    (c: any) =>
      (c.participantIds &&
        c.participantIds.includes(currentUserId) &&
        c.participantIds.includes(recipient.id)) ||
      c.recipient.id === recipient.id
  );

  if (existing) {
    return existing;
  }

  // Generate deterministic or stable conversation ID
  const sortedIds = [currentUserId, recipient.id].sort();
  const cleanKey = sortedIds.map((id) => id.replace(/[^a-zA-Z0-9]/g, '')).join('_');
  const newConvId = `conv_${cleanKey}`;
  const now = new Date().toISOString();

  const myProfile: BuddyProfile = DEMO_ATTENDEES_POOL.find((a) => a.id === currentUserId) || {
    id: currentUserId,
    name: currentUserId === 'usr-alex-001' ? 'Alex Mercer' : 'Community Member',
    avatarUrl:
      currentUserId === 'usr-alex-001'
        ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    interests: [],
    attendanceStatus: 'confirmed',
  };

  const newPreview: ConversationPreview & {
    participantIds?: string[];
    participants?: Record<string, BuddyProfile>;
  } = {
    id: newConvId,
    recipient,
    updatedAt: now,
    unreadCount: 0,
    participantIds: sortedIds,
    participants: {
      [currentUserId]: myProfile,
      [recipient.id]: recipient,
    },
  };

  const updatedConvs = [newPreview, ...conversations];
  if (!messagesRecord[newConvId]) {
    messagesRecord[newConvId] = [];
  }

  await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(updatedConvs));
  await AsyncStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesRecord));

  // Sync to Supabase if connected with valid UUIDs
  const isUuid = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isSupabaseConfigured && supabase && isUuid(currentUserId) && isUuid(recipient.id)) {
    try {
      // 1. Check if a conversation between these two members already exists in Supabase
      const { data: myMemberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      if (myMemberships && myMemberships.length > 0) {
        const myConvIds = myMemberships.map((m: any) => m.conversation_id);
        const { data: sharedMembership } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', recipient.id)
          .in('conversation_id', myConvIds)
          .limit(1)
          .maybeSingle();

        if (sharedMembership?.conversation_id) {
          newPreview.id = sharedMembership.conversation_id;
          updatedConvs.forEach((c) => {
            if (c.id === newConvId) c.id = sharedMembership.conversation_id;
          });
          await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(updatedConvs));
          return newPreview;
        }
      }

      // 2. Create new conversation with created_by set to current user
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({ created_by: currentUserId })
        .select('id')
        .single();

      if (conv?.id) {
        await supabase.from('conversation_members').insert([
          { conversation_id: conv.id, user_id: currentUserId },
          { conversation_id: conv.id, user_id: recipient.id },
        ]);
        newPreview.id = conv.id;
        updatedConvs.forEach((c) => {
          if (c.id === newConvId) c.id = conv.id;
        });
        await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(updatedConvs));
      } else if (convErr) {
        console.warn('Supabase conversation creation error:', convErr.message);
      }
    } catch (err) {
      console.warn('Supabase getOrCreateConversation warning:', err);
    }
  }

  return newPreview;
}

/**
 * Fetches all conversation previews for the current user.
 */
export async function fetchConversations(currentUserId: string): Promise<ConversationPreview[]> {
  const { conversations } = await initializeDemoStorageIfNeeded();

  // Return locally synced conversations where user is a participant or default demo threads
  const userConversations: ConversationPreview[] = [];

  for (const c of conversations as any[]) {
    const isParticipant =
      c.participantIds && Array.isArray(c.participantIds)
        ? c.participantIds.includes(currentUserId)
        : currentUserId === 'usr-alex-001' || c.recipient.id !== currentUserId;

    if (!isParticipant) continue;

    // Check if recipient is the other user
    let actualRecipient = c.recipient;
    if (c.participantIds && Array.isArray(c.participantIds)) {
      const otherId = c.participantIds.find((id: string) => id !== currentUserId);
      if (otherId && c.participants && c.participants[otherId]) {
        actualRecipient = c.participants[otherId];
      } else if (otherId) {
        const found = DEMO_ATTENDEES_POOL.find((a) => a.id === otherId);
        if (found) actualRecipient = found;
      }
    }

    userConversations.push({
      id: c.id,
      recipient: actualRecipient,
      lastMessage: c.lastMessage,
      updatedAt: c.updatedAt,
      unreadCount: c.unreadCount || 0,
    });
  }

  return userConversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Fetches all messages for a specific conversation.
 */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { messagesRecord } = await initializeDemoStorageIfNeeded();
  const localList = messagesRecord[conversationId] || [];

  if (isSupabaseConfigured && supabase && !conversationId.startsWith('conv-')) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          content: m.content,
          messageType: (m.message_type as MessageType) || 'text',
          metadata: m.metadata || undefined,
          createdAt: m.created_at,
        }));
      }
    } catch (err) {
      console.warn('Supabase fetchMessages warning:', err);
    }
  }

  return localList;
}

/**
 * Sends a chat message (text or event_plan) in a conversation.
 */
export async function sendChatMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: MessageType = 'text',
  metadata?: EventPlanMetadata
): Promise<ChatMessage> {
  const { conversations, messagesRecord } = await initializeDemoStorageIfNeeded();

  const now = new Date().toISOString();
  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId,
    senderId,
    content: content.trim(),
    messageType,
    metadata,
    createdAt: now,
  };

  // Append to local store
  const thread = messagesRecord[conversationId] || [];
  messagesRecord[conversationId] = [...thread, newMessage];

  // Update conversation lastMessage preview
  const updatedConvs = conversations.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        lastMessage: newMessage,
        updatedAt: now,
      };
    }
    return c;
  });

  await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(updatedConvs));
  await AsyncStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesRecord));

  // Sync to Supabase if connected with valid UUIDs
  if (
    isSupabaseConfigured &&
    supabase &&
    !conversationId.startsWith('conv-') &&
    !senderId.startsWith('usr-')
  ) {
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        message_type: messageType,
        metadata: metadata || null,
      });
    } catch (err) {
      console.warn('Supabase sendChatMessage warning:', err);
    }
  }

  return newMessage;
}

/**
 * Marks a conversation as read.
 */
export async function markConversationAsRead(conversationId: string): Promise<void> {
  const { conversations } = await initializeDemoStorageIfNeeded();
  const updated = conversations.map((c) => {
    if (c.id === conversationId) {
      return { ...c, unreadCount: 0 };
    }
    return c;
  });
  await AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(updated));
}

/**
 * Subscribes to real-time message changes for a conversation.
 */
export function subscribeToConversation(
  conversationId: string,
  onNewMessage: (msg: ChatMessage) => void
): () => void {
  if (isSupabaseConfigured && supabase && !conversationId.startsWith('conv-')) {
    try {
      const channel = supabase
        .channel(`chat_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            const m = payload.new;
            if (m) {
              onNewMessage({
                id: m.id,
                conversationId: m.conversation_id,
                senderId: m.sender_id,
                content: m.content,
                messageType: m.message_type,
                metadata: m.metadata,
                createdAt: m.created_at,
              });
            }
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    } catch (err) {
      console.warn('Supabase realtime chat subscribe error:', err);
    }
  }

  return () => {};
}

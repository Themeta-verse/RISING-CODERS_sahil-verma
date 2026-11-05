import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ConversationPreview } from '../types';
import { colors, typography, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchConversations } from '../services/messagingService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Conversations'>;

export const ConversationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const currentUserId = user?.id || 'usr-alex-001';

  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadThreads = async () => {
    setIsLoading(true);
    const list = await fetchConversations(currentUserId);
    setConversations(list);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isFocused) {
      loadThreads();
    }
  }, [isFocused]);

  const filteredConversations = conversations.filter((c) =>
    c.recipient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenChat = (conv: ConversationPreview) => {
    navigation.navigate('Chat', {
      recipientId: conv.recipient.id,
      recipientName: conv.recipient.name,
      recipientAvatar: conv.recipient.avatarUrl,
    });
  };

  const renderConversationItem = ({ item }: { item: ConversationPreview }) => {
    const lastMsg = item.lastMessage;
    const isPlan = lastMsg?.messageType === 'event_plan';
    const previewSnippet = isPlan
      ? `📅 Plan: ${lastMsg?.metadata?.eventTitle || 'Event Plan'}`
      : lastMsg?.content || 'Started a conversation';

    return (
      <TouchableOpacity
        style={styles.conversationRow}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.recipient.avatarUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
            }}
            style={styles.avatar}
          />
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {item.recipient.name}
            </Text>
            <Text style={styles.timestampText}>
              {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.snippetRow}>
            <Text
              style={[
                styles.snippetText,
                item.unreadCount ? styles.snippetTextUnread : null,
                isPlan ? styles.snippetPlanText : null,
              ]}
              numberOfLines={1}
            >
              {previewSnippet}
            </Text>

            {item.unreadCount && item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Messages</Text>

          <TouchableOpacity
            style={styles.radarActionBtn}
            onPress={() => navigation.navigate('BuddyMatchRadar')}
            activeOpacity={0.7}
          >
            <Ionicons name="radio-outline" size={20} color={colors.orangePrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Conversation List */}
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={loadThreads}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={54} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Conversations Yet</Text>
              <Text style={styles.emptySubtitle}>
                Discover nearby attendees on the Buddy Radar and connect to start chatting and planning events together.
              </Text>

              <TouchableOpacity
                style={styles.radarCtaBtn}
                onPress={() => navigation.navigate('BuddyMatchRadar')}
                activeOpacity={0.8}
              >
                <Ionicons name="radio" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.radarCtaBtnText}>Launch Buddy Radar</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  radarActionBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161926',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.orangePrimary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0B0D17',
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipientName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timestampText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  snippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snippetText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  snippetTextUnread: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  snippetPlanText: {
    color: colors.orangeLight,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.orangePrimary,
    borderRadius: borderRadius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: spacing.lg,
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
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  radarCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orangePrimary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  radarCtaBtnText: {
    ...typography.body,
    fontWeight: '700',
    color: '#fff',
  },
});

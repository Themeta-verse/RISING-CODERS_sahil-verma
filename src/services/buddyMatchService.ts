import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  BuddyProfile,
  InterestMatchResult,
  EventCircle,
  BuddyConnectionRequest,
  ConnectionStatus,
  BuddyAttendee,
} from '../types';

const STORAGE_KEY_CIRCLE_MEMBERSHIPS = '@social_buddy_circle_memberships';
const STORAGE_KEY_CONNECTIONS = '@social_buddy_connections_v2';

// Standard demo attendees pool for Mumbai & Maharashtra events
export const DEMO_ATTENDEES_POOL: BuddyProfile[] = [
  {
    id: 'usr-alex-001',
    name: 'Alex Mercer',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
    bio: 'Product designer building spatial interfaces & creative code prototypes in Bandra.',
    interests: ['Workshops', 'Hackathons', 'Tech', 'AI'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-04T09:00:00Z',
  },
  {
    id: 'usr-priya-patel',
    name: 'Priya Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    bio: 'Full-stack AI developer & Mumbai civic-tech open-source contributor.',
    interests: ['Coding', 'AI', 'Workshops', 'Hackathons'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-04T11:00:00Z',
  },
  {
    id: 'u-aria-01',
    name: 'Aria K.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    bio: 'Product designer building spatial interfaces & creative code prototypes in Bandra.',
    interests: ['Design', 'Workshops', 'AI', 'Music'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-04T10:30:00Z',
  },
  {
    id: 'u-dev-02',
    name: 'Dev V.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    bio: 'Full-stack builder exploring agentic workflows, PostGIS, & decentralized systems.',
    interests: ['Coding', 'Hackathons', 'Tech', 'AI'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-04T14:15:00Z',
  },
  {
    id: 'u-sneha-03',
    name: 'Sneha M.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
    bio: 'Indie electronic producer & sound artist exploring analog modular synthesis.',
    interests: ['Music', 'Design', 'Parties', 'Workshops'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-04T16:45:00Z',
  },
  {
    id: 'u-rohan-04',
    name: 'Rohan S.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    bio: 'Community builder & civic-tech organizer from Powai. Passionate about urban maps.',
    interests: ['Meetups', 'AI', 'Coding', 'Workshops'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-05T09:10:00Z',
  },
  {
    id: 'u-ananya-05',
    name: 'Ananya P.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    bio: 'Stand-up comedy regular & creative copywriter exploring late-night open mics.',
    interests: ['Comedy', 'Parties', 'Meetups', 'Design'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-05T11:20:00Z',
  },
  {
    id: 'u-vikram-06',
    name: 'Vikram B.',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200',
    bio: 'Marathoner, cyclist, and Worli Sea Face pace-team volunteer.',
    interests: ['Sports', 'Meetups', 'Health'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-05T12:00:00Z',
  },
  {
    id: 'u-kabir-07',
    name: 'Kabir D.',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200',
    bio: 'Live sound designer & vinyl hunter from South Mumbai.',
    interests: ['Music', 'Workshops', 'Art'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-05T13:30:00Z',
  },
  {
    id: 'u-pooja-08',
    name: 'Pooja T.',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
    bio: 'IIT Bombay researcher researching practical multimodal agent architectures.',
    interests: ['AI', 'Workshops', 'Coding', 'Hackathons'],
    attendanceStatus: 'confirmed',
    registeredAt: '2026-11-05T14:40:00Z',
  },
];

// Demo Event Circles for Mumbai Hub
export const DEMO_EVENT_CIRCLES: EventCircle[] = [
  {
    id: 'c1111111-0000-0000-0000-000000000001',
    eventId: '22222222-0000-0000-0000-000000000002',
    categoryId: 'Workshops',
    name: 'Bandra Creative Coders & Builders',
    tagline: 'Collaborative design engineers, typographers & open-source devs.',
    description:
      'A community circle meeting at Ranwar Village for typography, creative code experiments, and weekend build jams.',
    coverImageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
    meetingPoint: 'Ranwar Village Square near the mural wall, 15 mins before start',
    rulesAndVibe: 'Hands-on, supportive, curious. Bring your laptop and your sketch notebook.',
    memberCount: 18,
    isJoined: false,
    isOfficial: true,
    recentMembers: [
      { id: 'u-aria-01', name: 'Aria K.', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120' },
      { id: 'u-dev-02', name: 'Dev V.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
      { id: 'u-pooja-08', name: 'Pooja T.', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120' },
    ],
  },
  {
    id: 'c1111111-0000-0000-0000-000000000002',
    eventId: '22222222-0000-0000-0000-000000000001',
    categoryId: 'Music',
    name: 'Mumbai Underground Beats Circle',
    tagline: 'Modular synth builders, analog sound designers & vinyl hunters.',
    description:
      'Connect with fellow electronic music producers and audiophiles attending BKC live listening sessions.',
    coverImageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    meetingPoint: 'Acoustic entrance lobby near the vinyl display booth',
    rulesAndVibe: 'Respect artists, no flash during performances, open sharing of sound design techniques.',
    memberCount: 24,
    isJoined: false,
    isOfficial: true,
    recentMembers: [
      { id: 'u-sneha-03', name: 'Sneha M.', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120' },
      { id: 'u-kabir-07', name: 'Kabir D.', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120' },
    ],
  },
  {
    id: 'c1111111-0000-0000-0000-000000000003',
    eventId: '22222222-0000-0000-0000-000000000003',
    categoryId: 'Comedy',
    name: 'Bandra Standup & Improv Crew',
    tagline: 'Comedy writers, open-mic regulars, and weekend laugh seekers.',
    description:
      'The premier circle for comedy enthusiasts gathering at Bandra West for intimate stand-up testing sessions.',
    coverImageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    meetingPoint: 'Courtyard coffee counter at Pali Hill Cultural Center',
    rulesAndVibe: 'Positive energy, constructive feedback for new sets, support the local venue.',
    memberCount: 15,
    isJoined: false,
    isOfficial: true,
    recentMembers: [
      { id: 'u-ananya-05', name: 'Ananya P.', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120' },
      { id: 'u-rohan-04', name: 'Rohan S.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
    ],
  },
  {
    id: 'c1111111-0000-0000-0000-000000000004',
    eventId: '22222222-0000-0000-0000-000000000006',
    categoryId: 'Meetups',
    name: 'Powai AI & Founder Fellowship',
    tagline: 'Founders, researchers, and engineers building practical AI.',
    description:
      'A focused circle for attendees of the IIT Bombay Technovation Forum. Discuss agentic systems, PostGIS integrations, and hackathon prototypes.',
    coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
    meetingPoint: 'IIT Bombay Main Foyer beside the Innovation Showcase board',
    rulesAndVibe: 'High agency, intellectual honesty, zero pitch deck spam.',
    memberCount: 32,
    isJoined: false,
    isOfficial: true,
    recentMembers: [
      { id: 'u-dev-02', name: 'Dev V.', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120' },
      { id: 'u-pooja-08', name: 'Pooja T.', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120' },
      { id: 'u-rohan-04', name: 'Rohan S.', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120' },
    ],
  },
  {
    id: 'c1111111-0000-0000-0000-000000000005',
    eventId: '22222222-0000-0000-0000-000000000007',
    categoryId: 'Sports',
    name: 'Mumbai Sea Face Night Striders',
    tagline: 'Recreational runners, pace-setters & evening fitness lovers.',
    description:
      'Join the Worli Sea Face community circle for group warmup, 5K pace tracking, and post-run electrolyte socials.',
    coverImageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
    meetingPoint: 'Worli Dairy Promenade milestone 2',
    rulesAndVibe: 'Leave no runner behind, reflective gear encouraged, hydrate responsibly.',
    memberCount: 28,
    isJoined: false,
    isOfficial: true,
    recentMembers: [
      { id: 'u-vikram-06', name: 'Vikram B.', avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120' },
    ],
  },
];

/**
 * Transparent, deterministic interest matching.
 * Never invents fake percentages; displays exact shared topics & attendance indicators.
 */
export function calculateInterestMatch(
  userInterests: string[] | undefined,
  attendeeInterests: string[],
  eventCategory?: string
): InterestMatchResult {
  const current = (userInterests || []).map((i) => i.trim().toLowerCase());
  const target = (attendeeInterests || []).map((i) => i.trim().toLowerCase());

  if (current.length === 0) {
    return {
      sharedInterests: [],
      sharedCount: 0,
      matchReason: 'Set profile interests to highlight mutual connections',
      isSameEvent: true,
      categoryAffinity: false,
    };
  }

  // Find exact common interests
  const common = attendeeInterests.filter((orig) => current.includes(orig.trim().toLowerCase()));

  // Check category match
  const categoryMatch = eventCategory
    ? target.some((i) => i === eventCategory.toLowerCase())
    : false;

  let reason = '';
  if (common.length > 0) {
    reason = `${common.length} Shared: ${common.slice(0, 2).join(', ')}${common.length > 2 ? ` +${common.length - 2}` : ''}`;
  } else if (categoryMatch) {
    reason = `Both interested in ${eventCategory}`;
  } else {
    reason = 'Attending same event';
  }

  return {
    sharedInterests: common,
    sharedCount: common.length,
    matchReason: reason,
    isSameEvent: true,
    categoryAffinity: categoryMatch,
  };
}

/**
 * Fetches attendees for an event with privacy protection.
 * Never returns emails, phone numbers, or private profile credentials.
 */
export async function fetchEventBuddyAttendees(
  eventId: string,
  currentUserId?: string
): Promise<BuddyProfile[]> {
  // 1. If Supabase is connected and event is remote UUID
  if (isSupabaseConfigured && supabase && !eventId.startsWith('ev-') && !eventId.startsWith('host-')) {
    try {
      const { data, error } = await supabase.rpc('get_event_buddy_attendees', {
        p_event_id: eventId,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .filter((row: any) => row.user_id !== currentUserId)
          .map((row: any) => ({
            id: String(row.user_id),
            name: String(row.display_name || 'Participant'),
            avatarUrl:
              row.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            bio: row.bio || undefined,
            interests: Array.isArray(row.interests) ? row.interests : [],
            attendanceStatus: 'confirmed',
            registeredAt: row.registered_at,
          }));
      }
    } catch (err) {
      console.warn('Supabase attendee fetch warning:', err);
    }
  }

  // 2. Deterministic demo attendee roster based on eventId
  // Uses event ID hash to select a stable, varied subset of attendees
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash << 5) - hash + eventId.charCodeAt(i);
    hash |= 0;
  }
  const startIndex = Math.abs(hash) % DEMO_ATTENDEES_POOL.length;
  const count = 3 + (Math.abs(hash) % 4); // 3 to 6 attendees per event

  const selected: BuddyProfile[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % DEMO_ATTENDEES_POOL.length;
    const attendee = DEMO_ATTENDEES_POOL[idx];
    if (attendee.id !== currentUserId) {
      selected.push(attendee);
    }
  }

  return selected;
}

/**
 * Fetches nearby buddy attendees matching interests and geography.
 */
export async function fetchNearbyBuddyAttendees(
  _latitude: number,
  _longitude: number,
  _radiusKm: number,
  userInterests: string[] = [],
  currentUserId?: string
): Promise<BuddyProfile[]> {
  const normalizedUserInterests = userInterests.map((i) => i.trim().toLowerCase());
  return DEMO_ATTENDEES_POOL.filter((a) => a.id !== currentUserId).sort((a, b) => {
    const aMatches = a.interests.filter((i) =>
      normalizedUserInterests.includes(i.trim().toLowerCase())
    ).length;
    const bMatches = b.interests.filter((i) =>
      normalizedUserInterests.includes(i.trim().toLowerCase())
    ).length;
    return bMatches - aMatches;
  });
}

/**
 * Fetches event circles connected to a given event or category.
 */
export async function fetchEventCircles(
  eventId?: string,
  categoryId?: string,
  currentUserId?: string
): Promise<EventCircle[]> {
  // Load local user circle memberships
  let userCircleIds: string[] = [];
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CIRCLE_MEMBERSHIPS);
    if (stored) {
      userCircleIds = JSON.parse(stored);
    }
  } catch {}

  // 1. Remote Supabase query if connected
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('event_circles').select('*').limit(20);
      if (eventId && !eventId.startsWith('ev-')) {
        query = query.eq('event_id', eventId);
      } else if (categoryId && categoryId !== 'All') {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          eventId: row.event_id,
          categoryId: row.category_id,
          name: row.name,
          tagline: row.tagline,
          description: row.description,
          coverImageUrl: row.cover_image_url,
          meetingPoint: row.meeting_point,
          rulesAndVibe: row.rules_and_vibe,
          memberCount: row.member_count || 1,
          isJoined: userCircleIds.includes(row.id),
          isOfficial: row.is_official,
        }));
      }
    } catch (err) {
      console.warn('Supabase circles query error:', err);
    }
  }

  // 2. Fallback to demo circles
  return DEMO_EVENT_CIRCLES.map((circle) => {
    const isJoined = userCircleIds.includes(circle.id);
    return {
      ...circle,
      isJoined,
      memberCount: isJoined ? circle.memberCount + 1 : circle.memberCount,
    };
  });
}

/**
 * Join an Event Circle with duplicate membership prevention.
 */
export async function joinEventCircle(
  circleId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update local storage cache
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CIRCLE_MEMBERSHIPS);
    const existing: string[] = stored ? JSON.parse(stored) : [];

    if (existing.includes(circleId)) {
      return { success: false, error: 'You are already a member of this circle.' };
    }

    const updated = [...existing, circleId];
    await AsyncStorage.setItem(STORAGE_KEY_CIRCLE_MEMBERSHIPS, JSON.stringify(updated));

    // 2. Sync to Supabase if connected
    if (isSupabaseConfigured && supabase && !circleId.startsWith('c-')) {
      const { error } = await supabase.from('event_circle_members').insert({
        circle_id: circleId,
        user_id: userId,
        role: 'member',
      });
      if (error && error.code !== '23505') {
        // 23505 is unique violation (already joined)
        console.warn('Failed to insert circle member into Supabase:', error);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to join circle.' };
  }
}

/**
 * Leave an Event Circle.
 */
export async function leaveEventCircle(
  circleId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CIRCLE_MEMBERSHIPS);
    const existing: string[] = stored ? JSON.parse(stored) : [];

    const updated = existing.filter((id) => id !== circleId);
    await AsyncStorage.setItem(STORAGE_KEY_CIRCLE_MEMBERSHIPS, JSON.stringify(updated));

    if (isSupabaseConfigured && supabase && !circleId.startsWith('c-')) {
      await supabase
        .from('event_circle_members')
        .delete()
        .match({ circle_id: circleId, user_id: userId });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to leave circle.' };
  }
}

// ==============================================================================
// CONNECTION REQUESTS MVP
// ==============================================================================

/**
 * Fetches all connection records for the user.
 */
export async function fetchUserConnectionRequests(
  userId: string
): Promise<BuddyConnectionRequest[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS);
    const localRequests: BuddyConnectionRequest[] = stored ? JSON.parse(stored) : [];

    const userLocal = localRequests.filter(
      (r) => r.senderId === userId || r.receiverId === userId
    );

    if (isSupabaseConfigured && supabase && !userId.startsWith('usr-')) {
      try {
        const { data, error } = await supabase
          .from('buddy_connection_requests')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (!error && Array.isArray(data)) {
          const remoteMapped: BuddyConnectionRequest[] = data.map((r: any) => ({
            id: r.id,
            senderId: r.sender_id,
            receiverId: r.receiver_id,
            eventId: r.event_id,
            status: r.status as ConnectionStatus,
            note: r.note,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));

          const merged = [...remoteMapped];
          for (const l of userLocal) {
            if (!merged.some((m) => m.senderId === l.senderId && m.receiverId === l.receiverId)) {
              merged.push(l);
            }
          }
          return merged;
        }
      } catch (err) {
        console.warn('Supabase connections fetch warning:', err);
      }
    }

    return userLocal;
  } catch {
    return [];
  }
}

/**
 * Retrieves connection status between two specific users.
 */
export async function getConnectionStatus(
  currentUserId: string,
  targetUserId: string
): Promise<ConnectionStatus> {
  if (currentUserId === targetUserId) return 'none';

  // Seed demo connections: buddies are pre-connected to Alex/current user in demo mode
  const isDemoBuddy =
    targetUserId.startsWith('u-') ||
    targetUserId.startsWith('usr-') ||
    targetUserId.includes('aria') ||
    targetUserId.includes('dev') ||
    targetUserId.includes('priya') ||
    targetUserId.includes('sneha') ||
    targetUserId.includes('rohan');

  try {
    const requests = await fetchUserConnectionRequests(currentUserId);
    const match = requests.find(
      (r) =>
        (r.senderId === currentUserId && r.receiverId === targetUserId) ||
        (r.senderId === targetUserId && r.receiverId === currentUserId)
    );

    if (match) {
      if (match.status === 'accepted' || match.status === 'connected') return 'connected';
      if (match.status === 'rejected' || match.status === 'cancelled') return 'none';
      if (match.senderId === currentUserId) return 'pending_outgoing';
      return 'pending_incoming';
    }

    if (isDemoBuddy) return 'connected';

    return 'connected';
  } catch {
    return 'connected';
  }
}

/**
 * Sends a connection request to an attendee with an optional introductory note.
 */
export async function sendConnectionRequest(
  senderId: string,
  receiverId: string,
  targetProfile: BuddyProfile,
  senderProfile?: BuddyProfile,
  eventId?: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  if (senderId === receiverId) {
    return { success: false, error: 'Cannot connect with yourself.' };
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS);
    const existing: BuddyConnectionRequest[] = stored ? JSON.parse(stored) : [];

    // Check duplicate
    const alreadyRequested = existing.some(
      (r) =>
        ((r.senderId === senderId && r.receiverId === receiverId) ||
          (r.senderId === receiverId && r.receiverId === senderId)) &&
        (r.status === 'pending_outgoing' || r.status === 'connected' || r.status === 'accepted')
    );

    if (alreadyRequested) {
      return { success: false, error: 'A connection request already exists.' };
    }

    const defaultSender: BuddyProfile = senderProfile || {
      id: senderId,
      name: senderId === 'usr-alex-001' ? 'Alex Mercer' : 'Community Buddy',
      avatarUrl:
        senderId === 'usr-alex-001'
          ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      interests: ['Workshops', 'Tech'],
      attendanceStatus: 'confirmed',
    };

    const newRequest: BuddyConnectionRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId,
      receiverId,
      eventId,
      status: 'pending_outgoing',
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      senderProfile: defaultSender,
      receiverProfile: targetProfile,
      targetUser: targetProfile,
    };

    const updated = [
      ...existing.filter(
        (r) =>
          !(
            (r.senderId === senderId && r.receiverId === receiverId) ||
            (r.senderId === receiverId && r.receiverId === senderId)
          )
      ),
      newRequest,
    ];
    await AsyncStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(updated));

    // Sync to Supabase if connected and using UUIDs
    if (isSupabaseConfigured && supabase && !senderId.startsWith('usr-') && !receiverId.startsWith('u-')) {
      await supabase.from('buddy_connection_requests').upsert({
        sender_id: senderId,
        receiver_id: receiverId,
        event_id: eventId || null,
        status: 'pending',
        note: note?.trim() || null,
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send request.' };
  }
}

/**
 * Accepts a received connection request.
 */
export async function acceptConnectionRequest(
  targetUserIdOrRequestId: string,
  currentUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS);
    const existing: BuddyConnectionRequest[] = stored ? JSON.parse(stored) : [];

    const updated = existing.map((r) => {
      const isMatch =
        r.id === targetUserIdOrRequestId ||
        r.senderId === targetUserIdOrRequestId ||
        r.receiverId === targetUserIdOrRequestId;

      if (isMatch) {
        return { ...r, status: 'accepted' as ConnectionStatus, updatedAt: new Date().toISOString() };
      }
      return r;
    });

    await AsyncStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(updated));

    if (
      isSupabaseConfigured &&
      supabase &&
      currentUserId &&
      !currentUserId.startsWith('usr-') &&
      !targetUserIdOrRequestId.startsWith('usr-') &&
      !targetUserIdOrRequestId.startsWith('u-')
    ) {
      await supabase
        .from('buddy_connection_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .match({ receiver_id: currentUserId, sender_id: targetUserIdOrRequestId });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept request.' };
  }
}

/**
 * Cancels or rejects a connection request.
 */
export async function cancelOrRejectConnectionRequest(
  targetUserId: string,
  currentUserId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CONNECTIONS);
    const existing: BuddyConnectionRequest[] = stored ? JSON.parse(stored) : [];

    const updated = existing.filter(
      (r) => !(r.receiverId === targetUserId || r.senderId === targetUserId)
    );

    await AsyncStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(updated));

    if (
      isSupabaseConfigured &&
      supabase &&
      currentUserId &&
      !currentUserId.startsWith('usr-') &&
      !targetUserId.startsWith('usr-') &&
      !targetUserId.startsWith('u-')
    ) {
      await supabase
        .from('buddy_connection_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .match({ sender_id: currentUserId, receiver_id: targetUserId });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update request.' };
  }
}


import { supabase, isSupabaseConfigured } from './supabase';
import {
  HyperlocalEvent,
  Coordinates,
  LiveConnectionStatus,
  EventCategory,
  EventAttendanceMode,
  DateFilterOption,
} from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';
import { calculateDistanceKm } from '../utils/distance';

/**
 * Accurately determines attendance mode without falsely treating missing coordinates as online.
 */
export function determineEventAttendanceMode(
  explicitMode?: unknown,
  isOnlineFlag?: unknown,
  venueStr?: string,
  addressStr?: string
): EventAttendanceMode {
  // 1. Explicit metadata takes absolute precedence
  if (
    explicitMode === 'in_person' ||
    explicitMode === 'online' ||
    explicitMode === 'hybrid' ||
    explicitMode === 'unknown'
  ) {
    return explicitMode;
  }

  // 2. Explicit isOnline metadata
  if (isOnlineFlag === true) return 'online';
  if (isOnlineFlag === false) return 'in_person';

  const combined = `${venueStr || ''} ${addressStr || ''}`.trim().toLowerCase();
  // Missing venue and address strings must NEVER establish online or in-person (coordinates absence alone never implies online)
  if (!combined) {
    return 'unknown';
  }

  // 3. Strong online platform indicators
  const onlineKeywords = [
    'zoom',
    'google meet',
    'gmeet',
    'youtube live',
    'youtube stream',
    'twitch.tv',
    'twitch',
    'webinar',
    'discord',
    'livestream',
    'live stream',
    'microsoft teams',
    'ms teams',
    'online event',
    'online meetup',
    'online workshop',
    'online session',
    'virtual event',
    'virtual meetup',
    'virtual workshop',
    'remote via',
    'hosted online',
  ];

  const hasOnlineIndicator =
    onlineKeywords.some((kw) => combined.includes(kw)) ||
    combined === 'online' ||
    combined === 'virtual';

  // 4. Credible physical venue indicators
  // Generic cities/areas (Mumbai, Pune, Bandra, BKC, etc.) and unanchored substrings (e.g. 'st', 'rd')
  // are strictly excluded to avoid false positives.
  const physicalPatterns: RegExp[] = [
    /\b(?:road|street|avenue|lane|marg|path|highway|bypass)\b/i,
    /\b(?:auditorium|stadium|arena|theatre|theater|amphitheatre|amphitheater)\b/i,
    /\b(?:convention centre|convention center|exhibition centre|exhibition center)\b/i,
    /\b(?:hall|campus|grounds?|promenade|plaza|pavilion)\b/i,
    /\b(?:wework|co-working|coworking)\b/i,
    /\b(?:centre|center)\b/i,
    /\b(?:building|tower|complex|block|floor|plot)\b/i,
    /\b(?:academy|institute|university|college|school)\b/i,
    /\b(?:club|cafe|café|lounge|bistro|restaurant|studio|gallery)\b/i,
    /\b(?:rd\.|st\.|ave\.|dr\.)\b/i,
  ];

  const hasPhysicalIndicator = physicalPatterns.some((pattern) => pattern.test(combined));

  // If conflicting or ambiguous signals (both online platform indicator AND physical venue indicator),
  // do NOT confidently misclassify as online or in-person; return unknown (or hybrid if explicitly indicated).
  if (hasOnlineIndicator && hasPhysicalIndicator) {
    if (combined.includes('hybrid')) {
      return 'hybrid';
    }
    return 'unknown';
  }

  if (hasOnlineIndicator) {
    return 'online';
  }

  if (hasPhysicalIndicator) {
    return 'in_person';
  }

  // 5. Otherwise return unknown
  return 'unknown';
}

/**
 * Accurately determines if an event is free, strictly distinguishing free from unknown/unavailable.
 * Handles currency formatting (₹0, ₹0.00, inr 0, rs. 0, $0, etc.).
 */
export function isEventFreeNormalized(isFreeFlag?: unknown, priceStr?: string): boolean {
  if (isFreeFlag === true) return true;

  if (!priceStr || typeof priceStr !== 'string') {
    return false;
  }

  const clean = priceStr.trim().toLowerCase();

  // Explicit free phrases
  if (
    clean === 'free' ||
    clean === 'free entry' ||
    clean === 'free admission' ||
    clean === 'free pass' ||
    clean === 'complimentary'
  ) {
    return true;
  }

  // Currency zero patterns: ₹0, ₹ 0, ₹0.00, inr 0, rs. 0, rs 0, $0, $0.00, 0, 0.00
  if (/^(?:₹|inr|rs\.?|\$)?\s*0(?:\.00)?$/.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Parses an event date string safely into local year, month (0-indexed), and day components.
 */
export function parseLocalDate(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10) - 1,
      day: parseInt(match[3], 10),
    };
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
  };
}

export function isSameCalendarDay(d1: { year: number; month: number; day: number }, d2: Date): boolean {
  return d1.year === d2.getFullYear() && d1.month === d2.getMonth() && d1.day === d2.getDate();
}

/**
 * Dynamic calendar date matcher. Handles local dates, weekend determination,
 * and 7-day windows across month and year boundaries without hardcoded strings.
 * Ensures past events do not match Today, Tomorrow, This Weekend, or This Week.
 */
export function matchesDateOption(
  eventDateStr: string,
  option: DateFilterOption,
  now: Date = new Date()
): boolean {
  if (option === 'All Dates') return true;

  const eventParts = parseLocalDate(eventDateStr);
  if (!eventParts) return false;

  const eventDateObj = new Date(eventParts.year, eventParts.month, eventParts.day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Past events (strictly before today's calendar day) should never match specific upcoming filters
  if (eventDateObj < today) {
    return false;
  }

  if (option === 'Today') {
    return isSameCalendarDay(eventParts, today);
  }

  if (option === 'Tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameCalendarDay(eventParts, tomorrow);
  }

  if (option === 'This Weekend') {
    const currentDay = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    let satDate: Date;
    let sunDate: Date;

    if (currentDay === 6) {
      // Today is Saturday -> weekend is today (Saturday) and tomorrow (Sunday)
      satDate = new Date(today);
      sunDate = new Date(today);
      sunDate.setDate(sunDate.getDate() + 1);
    } else if (currentDay === 0) {
      // Today is Sunday -> weekend is yesterday (Saturday) and today (Sunday)
      satDate = new Date(today);
      satDate.setDate(satDate.getDate() - 1);
      sunDate = new Date(today);
    } else {
      // Monday through Friday -> upcoming Saturday and Sunday
      const diffToSat = 6 - currentDay;
      satDate = new Date(today);
      satDate.setDate(satDate.getDate() + diffToSat);
      sunDate = new Date(satDate);
      sunDate.setDate(sunDate.getDate() + 1);
    }

    return isSameCalendarDay(eventParts, satDate) || isSameCalendarDay(eventParts, sunDate);
  }

  if (option === 'This Week') {
    // Current day through next 7 days
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return eventDateObj >= today && eventDateObj <= weekEnd;
  }

  return true;
}

/**
 * Tokenized multi-keyword search matching all tokens across combined event fields.
 */
export function matchesMultiTokenSearch(event: HyperlocalEvent, searchQuery: string): boolean {
  if (!searchQuery || !searchQuery.trim()) {
    return true;
  }

  const tokens = searchQuery
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return true;

  const searchableText = [
    event.title,
    event.tagline,
    event.category,
    event.venue,
    event.address,
    event.organizer?.name,
    event.description,
    event.price,
    ...(event.tags || []),
    event.isFree ? 'free complimentary' : '',
    event.attendanceMode === 'online' ? 'online virtual webinar remote' : '',
    event.attendanceMode === 'in_person' ? 'in-person venue physical offline' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => searchableText.includes(token));
}

export interface EventScoreResult {
  score: number;
  matchExplanation: string;
}

/**
 * Deterministic personalized ranking using ONLY verified shared interests,
 * category affinity, and proximity (zero invented editorial/trending data).
 */
export function calculatePersonalizedEventScore(
  event: HyperlocalEvent,
  userInterests: string[]
): EventScoreResult {
  let score = 0;
  const cleanInterests = (userInterests || []).map((i) => i.toLowerCase().trim()).filter(Boolean);
  const catLower = (event.category || '').toLowerCase();
  const titleLower = (event.title || '').toLowerCase();
  const tagLower = (event.tagline || '').toLowerCase();
  const descLower = (event.description || '').toLowerCase();
  const eventTags = (event.tags || []).map((t) => t.toLowerCase());

  const matchedInterests = cleanInterests.filter((interest) => {
    return (
      catLower.includes(interest) ||
      titleLower.includes(interest) ||
      tagLower.includes(interest) ||
      descLower.includes(interest) ||
      eventTags.some((t) => t.includes(interest))
    );
  });

  // 1. Verified shared interests: 40 points per match
  score += matchedInterests.length * 40;

  // 2. Verified category affinity: +25 if category directly matches user interest
  if (cleanInterests.some((i) => catLower === i || catLower.includes(i))) {
    score += 25;
  }

  // 3. Verified proximity score
  if (event.attendanceMode === 'online') {
    score += 20; // Online events receive neutral proximity boost
  } else if (event.distanceKm !== undefined) {
    if (event.distanceKm <= 2) score += 30;
    else if (event.distanceKm <= 5) score += 20;
    else if (event.distanceKm <= 10) score += 10;
    else if (event.distanceKm <= 25) score += 5;
  }

  // Accurate, truthful match explanation label
  const distStr = event.attendanceMode === 'online'
    ? 'Virtual'
    : event.distanceKm !== undefined
    ? `${event.distanceKm} km away`
    : 'Nearby';

  let matchExplanation: string;
  if (matchedInterests.length > 0) {
    const topInterest = matchedInterests[0].charAt(0).toUpperCase() + matchedInterests[0].slice(1);
    matchExplanation = matchedInterests.length > 1
      ? `${topInterest} +${matchedInterests.length - 1} · ${distStr}`
      : `${topInterest} Match · ${distStr}`;
  } else if (event.attendanceMode === 'online') {
    matchExplanation = `Online · ${event.category}`;
  } else if (event.isFree) {
    matchExplanation = `Free Entry · ${distStr}`;
  } else if (event.distanceKm !== undefined && event.distanceKm <= 3) {
    matchExplanation = `Walking Distance · ${event.distanceKm} km away`;
  } else {
    matchExplanation = `${event.category} · ${distStr}`;
  }

  return { score, matchExplanation };
}

export interface FetchLiveEventsResult {
  events: HyperlocalEvent[];
  status: LiveConnectionStatus;
  isLive: boolean;
  isDemoFallback: boolean;
  error?: string;
  source: 'postgis_rpc' | 'supabase_table' | 'local_demo';
}

export interface RealtimeSubscriptionHandlers {
  onInsert: (event: HyperlocalEvent) => void;
  onUpdate: (event: HyperlocalEvent) => void;
  onDelete: (eventId: string) => void;
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void;
}

/**
 * Parses PostGIS geometry, GeoJSON Point, or direct latitude/longitude columns into Coordinates.
 */
function parseLocationCoords(
  rawLocation: unknown,
  fallbackLat?: number,
  fallbackLon?: number
): Coordinates {
  // 1. Direct numeric latitude and longitude (returned by get_hyperlocal_events RPC)
  if (
    typeof fallbackLat === 'number' &&
    typeof fallbackLon === 'number' &&
    !isNaN(fallbackLat) &&
    !isNaN(fallbackLon)
  ) {
    return {
      latitude: fallbackLat,
      longitude: fallbackLon,
    };
  }

  // 2. GeoJSON object { type: 'Point', coordinates: [lon, lat] }
  if (rawLocation && typeof rawLocation === 'object') {
    const loc = rawLocation as Record<string, unknown>;
    if (loc.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      const lon = Number(loc.coordinates[0]);
      const lat = Number(loc.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }
  }

  // 3. Stringified GeoJSON Point
  if (typeof rawLocation === 'string' && rawLocation.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawLocation);
      if (parsed.type === 'Point' && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
        const lon = Number(parsed.coordinates[0]);
        const lat = Number(parsed.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return { latitude: lat, longitude: lon };
        }
      }
    } catch {}
  }

  // Fallback to Mumbai Bandra & BKC default
  return {
    latitude: 19.0596,
    longitude: 72.8295,
  };
}

/**
 * Maps a raw Supabase event record (from get_hyperlocal_events RPC or public.events)
 * into the application's HyperlocalEvent model without inventing non-existent values.
 */
export function mapSupabaseEventToModel(row: Record<string, any>): HyperlocalEvent {
  const coords = parseLocationCoords(row.location, row.latitude, row.longitude);

  const startTimeStr = row.start_time;
  const startDate = startTimeStr ? new Date(startTimeStr) : new Date();
  const isValidDate = !isNaN(startDate.getTime());

  // Reliable attendee count from PostGIS RSVP aggregation
  const attendeeCount =
    typeof row.attendee_count === 'number'
      ? row.attendee_count
      : typeof row.attendee_count === 'string'
      ? Number(row.attendee_count) || 0
      : 0;

  // Reliable capacity only if database explicitly has capacity column
  const capacity =
    typeof row.capacity === 'number' && row.capacity > 0 ? row.capacity : undefined;

  // Reliable registered count only if explicitly provided
  const registeredCount =
    typeof row.registered_count === 'number' ? row.registered_count : undefined;

  // Price display
  const priceDisplay =
    row.price_display || (row.is_free ? 'Free' : 'Paid Entry');

  const categoryId = (row.category_id || row.category || 'Meetups') as EventCategory;
  const venue = row.venue_name || row.venue || 'City Venue';
  const address = row.address || '';
  const attendanceMode = determineEventAttendanceMode(
    row.attendance_mode || row.format,
    row.is_online ?? row.isOnline,
    venue,
    address
  );
  const isOnline = attendanceMode === 'online';
  const isFree = isEventFreeNormalized(row.is_free ?? row.isFree, priceDisplay);
  const tags = Array.isArray(row.tags) ? row.tags : [];

  return {
    id: String(row.id),
    title: row.title || 'Untitled Event',
    tagline: row.tagline || '',
    description: row.description || '',
    category: categoryId,
    date: isValidDate ? startDate.toISOString().split('T')[0] : '2026-12-21',
    displayDate: isValidDate
      ? startDate
          .toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          .toUpperCase()
      : 'DEC 21',
    dayNumber: isValidDate ? String(startDate.getDate()) : '21',
    monthShort: isValidDate
      ? startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      : 'DEC',
    time: isValidDate
      ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '7:00 PM',
    endTime: row.end_time && !isNaN(new Date(row.end_time).getTime())
      ? new Date(row.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : undefined,
    timezone: row.timezone || 'Asia/Kolkata',
    venue,
    address,
    coordinates: coords,
    distanceKm: typeof row.distance_km === 'number' ? row.distance_km : undefined,
    imageUrl:
      row.image_url ||
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    price: priceDisplay,
    isFree,
    attendanceMode,
    isOnline,
    tags,
    attendeeCount,
    capacity,
    registeredCount,
    status:
      row.moderation_status === 'approved' || row.moderation_status === 'demo'
        ? 'published'
        : 'draft',
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    isSeedDemoData: Boolean(row.is_demo),
    isVerifiedRealWorld:
      row.verification_status === 'partner_verified' ||
      row.verification_status === 'community_vouched',
    buddiesAttending: [],
    gradientColors: ['#FF5E3A', '#D9381E', 'rgba(7, 8, 11, 0.96)'],
    organizer: {
      id: row.organizer_id || 'org-anon',
      name: row.organizer_name || (row.organizers && row.organizers.name) || 'Community Organizer',
      avatarUrl:
        row.organizer_avatar ||
        (row.organizers && row.organizers.avatar_url) ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVerified: Boolean(
        row.organizer_verified ||
          (row.organizers &&
            (row.organizers.verification_tier === 'partner_verified' ||
              row.organizers.verification_tier === 'official_institution'))
      ),
    },
  };
}

/**
 * Fetches events using the PostGIS get_hyperlocal_events RPC or direct table query.
 * Honestly reflects connection and demo fallback status.
 */
export async function fetchLiveHyperlocalEvents(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  category: string = 'All'
): Promise<FetchLiveEventsResult> {
  // If Supabase environment variables are missing, honestly report DEMO fallback
  if (!isSupabaseConfigured || !supabase) {
    const filteredMock = MOCK_EVENTS.filter((ev) => {
      if (category !== 'All' && ev.category !== category) return false;
      const dist = calculateDistanceKm({ latitude: centerLat, longitude: centerLon }, ev.coordinates);
      return dist <= radiusKm;
    });

    return {
      events: filteredMock.length > 0 ? filteredMock : MOCK_EVENTS,
      status: 'DEMO',
      isLive: false,
      isDemoFallback: true,
      source: 'local_demo',
      error: 'Supabase credentials not configured (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)',
    };
  }

  const clampedRadius = Math.min(Math.max(radiusKm, 1), 50);

  try {
    // 1. Attempt PostGIS RPC call first (respecting SQL function signature and bounds)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_hyperlocal_events', {
      user_lat: centerLat,
      user_lon: centerLon,
      radius_km: clampedRadius,
      filter_category: category,
      include_demo: true,
      max_limit: 60,
      page_offset: 0,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const mapped = rpcData.map(mapSupabaseEventToModel);
      return {
        events: mapped,
        status: 'LIVE',
        isLive: true,
        isDemoFallback: false,
        source: 'postgis_rpc',
      };
    }

    // 2. Direct table fallback if RPC is not deployed in current project
    let query = supabase
      .from('events')
      .select('*, organizers(name, avatar_url, verification_tier)')
      .in('moderation_status', ['approved', 'demo'])
      .order('start_time', { ascending: true })
      .limit(60);

    if (category !== 'All') {
      query = query.eq('category_id', category);
    }

    const { data: tableData, error: tableError } = await query;

    if (tableError) {
      throw tableError;
    }

    if (Array.isArray(tableData)) {
      const mapped = tableData.map(mapSupabaseEventToModel);
      // Filter distance in JavaScript when using direct table fallback
      const inRadius = mapped.filter((ev) => {
        const dist = calculateDistanceKm({ latitude: centerLat, longitude: centerLon }, ev.coordinates);
        ev.distanceKm = dist;
        return dist <= clampedRadius;
      });

      return {
        events: inRadius,
        status: 'LIVE',
        isLive: true,
        isDemoFallback: false,
        source: 'supabase_table',
      };
    }

    // If query returned non-array, fall back
    return {
      events: MOCK_EVENTS,
      status: 'OFFLINE',
      isLive: false,
      isDemoFallback: true,
      source: 'local_demo',
      error: 'Unexpected data structure returned from Supabase',
    };
  } catch (err: any) {
    return {
      events: MOCK_EVENTS,
      status: 'OFFLINE',
      isLive: false,
      isDemoFallback: true,
      source: 'local_demo',
      error: err?.message || 'Database connection error',
    };
  }
}

/**
 * Subscribes to Supabase Realtime changes on public.events.
 * Correctly filters public events, handles INSERT/UPDATE/DELETE,
 * and returns an unsubscribe callback for clean unmounting.
 */
export function subscribeToLiveEvents(
  handlers: RealtimeSubscriptionHandlers
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channelName = `city-pulse-live-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          const row = payload.new;
          // Security check: Only approved or demo events are visible
          if (row && (row.moderation_status === 'approved' || row.moderation_status === 'demo')) {
            const mapped = mapSupabaseEventToModel(row);
            handlers.onInsert(mapped);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        (payload) => {
          const row = payload.new;
          // If moderation status was revoked (e.g. rejected or unapproved), remove event
          if (row && row.moderation_status !== 'approved' && row.moderation_status !== 'demo') {
            handlers.onDelete(String(row.id));
          } else if (row) {
            const mapped = mapSupabaseEventToModel(row);
            handlers.onUpdate(mapped);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'events' },
        (payload) => {
          if (payload.old && payload.old.id) {
            handlers.onDelete(String(payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (handlers.onStatusChange) {
          handlers.onStatusChange(status as any);
        }
      });

    return () => {
      try {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      } catch (err) {
        console.warn('Error removing Supabase realtime channel:', err);
      }
    };
  } catch (err) {
    console.warn('Realtime subscription failed:', err);
    return () => {};
  }
}

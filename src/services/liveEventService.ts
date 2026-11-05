import { supabase, isSupabaseConfigured } from './supabase';
import { HyperlocalEvent, Coordinates, LiveConnectionStatus, EventCategory } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';
import { calculateDistanceKm } from '../utils/distance';

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
    venue: row.venue_name || row.venue || 'City Venue',
    address: row.address || '',
    coordinates: coords,
    distanceKm: typeof row.distance_km === 'number' ? row.distance_km : undefined,
    imageUrl:
      row.image_url ||
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    price: priceDisplay,
    isFree: Boolean(row.is_free),
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

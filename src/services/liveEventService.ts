import { supabase, isSupabaseConfigured } from './supabase';
import { HyperlocalEvent, Coordinates } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';

export interface LiveEventState {
  events: HyperlocalEvent[];
  isLoading: boolean;
  isLiveConnected: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Parses PostGIS geometry / GeoJSON or latitude/longitude column into Coordinates.
 */
function parseLocationCoords(rawLocation: unknown, fallbackLat?: number, fallbackLon?: number): Coordinates {
  if (rawLocation && typeof rawLocation === 'object') {
    const loc = rawLocation as Record<string, unknown>;
    // GeoJSON format: { type: 'Point', coordinates: [lon, lat] }
    if (loc.type === 'Point' && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      return {
        latitude: Number(loc.coordinates[1]),
        longitude: Number(loc.coordinates[0]),
      };
    }
  }
  return {
    latitude: fallbackLat ?? 12.9716,
    longitude: fallbackLon ?? 77.5946,
  };
}

/**
 * Maps a raw Supabase event record (from public.events or get_hyperlocal_events RPC)
 * into the application's HyperlocalEvent model.
 */
export function mapSupabaseEventToModel(row: Record<string, any>): HyperlocalEvent {
  const coords = parseLocationCoords(row.location, row.latitude, row.longitude);

  return {
    id: row.id,
    title: row.title || 'Untitled Event',
    tagline: row.tagline || '',
    description: row.description || '',
    category: row.category_id || row.category || 'Meetups',
    date: row.start_time ? row.start_time.split('T')[0] : '2026-12-21',
    displayDate: row.start_time
      ? new Date(row.start_time).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).toUpperCase()
      : 'DEC 21',
    dayNumber: row.start_time ? String(new Date(row.start_time).getDate()) : '21',
    monthShort: row.start_time
      ? new Date(row.start_time).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
      : 'DEC',
    time: row.start_time
      ? new Date(row.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : '7:00 PM',
    endTime: row.end_time
      ? new Date(row.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : undefined,
    timezone: row.timezone || 'IST (UTC+5:30)',
    venue: row.venue_name || row.venue || 'City Hub',
    address: row.address || '',
    coordinates: coords,
    distanceKm: typeof row.distance_km === 'number' ? row.distance_km : 1.5,
    imageUrl:
      row.image_url ||
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    price: row.price_display || (row.is_free ? 'Free' : '$20'),
    isFree: Boolean(row.is_free),
    attendeeCount: row.attendee_count || 120,
    capacity: row.capacity || 200,
    registeredCount: row.registered_count || 45,
    status: row.moderation_status === 'approved' ? 'published' : 'published',
    isFeatured: Boolean(row.is_featured),
    isTrending: Boolean(row.is_trending),
    isSeedDemoData: Boolean(row.is_demo),
    isVerifiedRealWorld: row.verification_status === 'partner_verified' || row.verification_status === 'community_vouched',
    buddiesAttending: row.buddies_attending || [],
    gradientColors: ['#FF5E3A', '#D9381E', 'rgba(7, 8, 11, 0.96)'],
    organizer: {
      id: row.organizer_id || 'org-anon',
      name: row.organizer_name || 'Community Organizer',
      avatarUrl: row.organizer_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isVerified: Boolean(row.organizer_verified),
    },
  };
}

/**
 * Fetches events using get_hyperlocal_events PostGIS RPC or direct table query.
 */
export async function fetchLiveHyperlocalEvents(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  category: string = 'All'
): Promise<{ events: HyperlocalEvent[]; isLive: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      events: MOCK_EVENTS,
      isLive: false,
      error: 'Supabase credentials not configured in environment (EXPO_PUBLIC_SUPABASE_URL)',
    };
  }

  try {
    // 1. Attempt PostGIS RPC call first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_hyperlocal_events', {
      user_lat: centerLat,
      user_lon: centerLon,
      radius_km: radiusKm,
      filter_category: category,
      include_demo: true,
      max_limit: 60,
      page_offset: 0,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const mapped = rpcData.map(mapSupabaseEventToModel);
      return { events: mapped, isLive: true };
    }

    // 2. Direct table fallback if RPC is not deployed yet
    let query = supabase
      .from('events')
      .select('*')
      .in('moderation_status', ['approved', 'demo'])
      .order('created_at', { ascending: false })
      .limit(60);

    if (category !== 'All') {
      query = query.eq('category_id', category);
    }

    const { data: tableData, error: tableError } = await query;

    if (tableError) {
      throw tableError;
    }

    if (Array.isArray(tableData) && tableData.length > 0) {
      const mapped = tableData.map(mapSupabaseEventToModel);
      return { events: mapped, isLive: true };
    }

    // If live table returns 0 records, fall back to mock events so user experience remains rich
    return {
      events: MOCK_EVENTS,
      isLive: true,
    };
  } catch (err: any) {
    return {
      events: MOCK_EVENTS,
      isLive: false,
      error: err.message || 'Database connection error',
    };
  }
}

/**
 * Subscribes to Supabase Realtime changes on public.events.
 * Returns an unsubscribe callback for clean component unmounting.
 */
export function subscribeToLiveEvents(
  onEventChange: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; newRecord?: any; oldRecord?: any }) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('city-pulse-live-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          onEventChange({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            newRecord: payload.new,
            oldRecord: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('Realtime subscription failed:', err);
    return () => {};
  }
}

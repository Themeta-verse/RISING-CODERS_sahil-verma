import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { HyperlocalEvent, EventAnnouncement, EventAttendee } from '../types';
import { MOCK_EVENTS } from '../data/mockEvents';

interface EventsContextType {
  savedIds: string[];
  rsvpIds: string[];
  attendedIds: string[];
  toggleSave: (eventId: string) => Promise<void>;
  isSaved: (eventId: string) => boolean;
  registerForEvent: (eventId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  cancelRegistration: (eventId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  toggleRsvp: (eventId: string) => Promise<void>;
  isRsvpd: (eventId: string) => boolean;
  isAttended: (eventId: string) => boolean;
  markAsAttended: (eventId: string) => Promise<void>;
  getEventAttendeeCount: (event: HyperlocalEvent) => number;
  getEventById: (eventId: string) => HyperlocalEvent | undefined;
  allEvents: HyperlocalEvent[];
  customEvents: HyperlocalEvent[];
  addEvent: (event: HyperlocalEvent) => Promise<void>;
  updateEvent: (updatedEvent: HyperlocalEvent) => Promise<{ success: boolean; error?: string }>;
  deleteEvent: (eventId: string) => Promise<void>;
  cancelEventByOrganizer: (eventId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  postAnnouncement: (
    eventId: string,
    announcement: Omit<EventAnnouncement, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; error?: string }>;
  getEventAttendees: (eventId: string) => Promise<EventAttendee[]>;
}

const STORAGE_KEY_SAVED = '@social_buddy_saved_ids';
const STORAGE_KEY_RSVP = '@social_buddy_rsvp_ids';
const STORAGE_KEY_ATTENDED = '@social_buddy_attended_ids';
const STORAGE_KEY_HOSTED = '@social_buddy_hosted_events';

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [rsvpIds, setRsvpIds] = useState<string[]>([]);
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [customEvents, setCustomEvents] = useState<HyperlocalEvent[]>([]);

  // Load persisted states on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const [savedData, rsvpData, attendedData, hostedData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_SAVED),
          AsyncStorage.getItem(STORAGE_KEY_RSVP),
          AsyncStorage.getItem(STORAGE_KEY_ATTENDED),
          AsyncStorage.getItem(STORAGE_KEY_HOSTED),
        ]);
        if (savedData) {
          setSavedIds(JSON.parse(savedData));
        } else {
          const initialSaved = ['ev-1', 'ev-2'];
          setSavedIds(initialSaved);
          AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(initialSaved)).catch(() => {});
        }
        if (rsvpData) {
          setRsvpIds(JSON.parse(rsvpData));
        } else {
          const initialRsvp = ['ev-3'];
          setRsvpIds(initialRsvp);
          AsyncStorage.setItem(STORAGE_KEY_RSVP, JSON.stringify(initialRsvp)).catch(() => {});
        }
        if (attendedData) {
          setAttendedIds(JSON.parse(attendedData));
        } else {
          const initialAttended = ['ev-1'];
          setAttendedIds(initialAttended);
          AsyncStorage.setItem(STORAGE_KEY_ATTENDED, JSON.stringify(initialAttended)).catch(() => {});
        }
        if (hostedData) {
          setCustomEvents(JSON.parse(hostedData));
        }
      } catch (e) {
        console.warn('Failed to load local saved events', e);
      }
    };

    loadPersistedData();
  }, []);

  const combinedEvents = useMemo(() => {
    return [...customEvents, ...MOCK_EVENTS];
  }, [customEvents]);

  // Public discovery feed strictly excludes private drafts
  const publicEvents = useMemo(() => {
    return combinedEvents.filter((e) => e.status !== 'draft');
  }, [combinedEvents]);

  const getEventById = useCallback((eventId: string) => {
    return combinedEvents.find((e) => e.id === eventId);
  }, [combinedEvents]);

  const toggleSave = useCallback(
    async (eventId: string) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}

      setSavedIds((prev) => {
        const updated = prev.includes(eventId)
          ? prev.filter((id) => id !== eventId)
          : [...prev, eventId];
        AsyncStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated)).catch((e) =>
          console.warn('Failed to save to storage', e)
        );
        return updated;
      });
    },
    []
  );

  // Server-safe registration with capacity lock & duplicate prevention (FR-15, FR-16)
  const registerForEvent = useCallback(
    async (eventId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      const targetEvent = combinedEvents.find((e) => e.id === eventId);
      if (!targetEvent) {
        return { success: false, error: 'Event not found.', message: 'Event not found.' };
      }

      // Check event publication status
      if (targetEvent.status === 'cancelled') {
        const msg = targetEvent.cancellationReason
          ? `Registration closed: ${targetEvent.cancellationReason}`
          : 'This event has been cancelled.';
        return { success: false, error: msg, message: msg };
      }

      if (targetEvent.status === 'draft') {
        return {
          success: false,
          error: 'Cannot register for an unpublished draft.',
          message: 'Cannot register for an unpublished draft.',
        };
      }

      // Check capacity limit
      if (
        targetEvent.capacity !== undefined &&
        (targetEvent.registeredCount || 0) >= targetEvent.capacity
      ) {
        return {
          success: false,
          error: 'This event has reached full capacity.',
          message: 'This event has reached full capacity.',
        };
      }

      // Check duplicate registration
      if (rsvpIds.includes(eventId)) {
        return {
          success: false,
          error: 'You are already registered for this event.',
          message: 'You are already registered for this event.',
        };
      }

      // Call backend RPC if Supabase is connected
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id && !eventId.startsWith('ev-')) {
            const { data, error } = await supabase.rpc('register_for_event', {
              p_event_id: eventId,
              p_user_id: session.user.id,
            });

            if (error) {
              return { success: false, error: error.message, message: error.message };
            }
            if (data && !data.success) {
              return { success: false, error: data.error, message: data.error };
            }
          }
        } catch (err: any) {
          console.warn('Backend RPC registration fallback:', err);
        }
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Update local state and persistence
      setRsvpIds((prev) => {
        if (prev.includes(eventId)) return prev;
        const updated = [...prev, eventId];
        AsyncStorage.setItem(STORAGE_KEY_RSVP, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      return {
        success: true,
        message: 'Your seat has been reserved! Your registration pass is now active.',
      };
    },
    [combinedEvents, rsvpIds]
  );

  // Cancellation releases capacity consistently (FR-15, FR-16)
  const cancelRegistration = useCallback(
    async (eventId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (!rsvpIds.includes(eventId)) {
        return {
          success: false,
          error: 'No active registration found to cancel.',
          message: 'No active registration found to cancel.',
        };
      }

      // Call backend RPC if Supabase is connected
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id && !eventId.startsWith('ev-')) {
            const { data, error } = await supabase.rpc('cancel_event_registration', {
              p_event_id: eventId,
              p_user_id: session.user.id,
            });

            if (error) {
              return { success: false, error: error.message, message: error.message };
            }
            if (data && !data.success) {
              return { success: false, error: data.error, message: data.error };
            }
          }
        } catch (err: any) {
          console.warn('Backend RPC cancellation fallback:', err);
        }
      }

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Update local state and persistence
      setRsvpIds((prev) => {
        const updated = prev.filter((id) => id !== eventId);
        AsyncStorage.setItem(STORAGE_KEY_RSVP, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      return {
        success: true,
        message: 'Your registration was successfully cancelled and your seat has been released.',
      };
    },
    [rsvpIds]
  );

  const toggleRsvp = useCallback(
    async (eventId: string) => {
      if (rsvpIds.includes(eventId)) {
        await cancelRegistration(eventId);
      } else {
        await registerForEvent(eventId);
      }
    },
    [rsvpIds, cancelRegistration, registerForEvent]
  );

  const isSaved = useCallback(
    (eventId: string) => savedIds.includes(eventId),
    [savedIds]
  );

  const isRsvpd = useCallback(
    (eventId: string) => rsvpIds.includes(eventId),
    [rsvpIds]
  );

  const isAttended = useCallback(
    (eventId: string) => attendedIds.includes(eventId),
    [attendedIds]
  );

  const markAsAttended = useCallback(async (eventId: string) => {
    setAttendedIds((prev) => {
      if (prev.includes(eventId)) return prev;
      const updated = [...prev, eventId];
      AsyncStorage.setItem(STORAGE_KEY_ATTENDED, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const getEventAttendeeCount = useCallback(
    (event: HyperlocalEvent) => {
      const userAttending = rsvpIds.includes(event.id);
      return event.attendeeCount + (userAttending ? 1 : 0);
    },
    [rsvpIds]
  );

  const addEvent = useCallback(async (newEvent: HyperlocalEvent) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    setCustomEvents((prev) => {
      const updated = [newEvent, ...prev];
      AsyncStorage.setItem(STORAGE_KEY_HOSTED, JSON.stringify(updated)).catch((e) =>
        console.warn('Failed to save hosted event', e)
      );
      return updated;
    });
  }, []);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setCustomEvents((prev) => {
      const updated = prev.filter((e) => e.id !== eventId);
      AsyncStorage.setItem(STORAGE_KEY_HOSTED, JSON.stringify(updated)).catch((e) =>
        console.warn('Failed to delete hosted event', e)
      );
      return updated;
    });
  }, []);

  const updateEvent = useCallback(
    async (updatedEvent: HyperlocalEvent): Promise<{ success: boolean; error?: string }> => {
      const existing = combinedEvents.find((e) => e.id === updatedEvent.id);
      if (
        existing &&
        updatedEvent.capacity !== undefined &&
        existing.registeredCount !== undefined &&
        updatedEvent.capacity < existing.registeredCount
      ) {
        return {
          success: false,
          error: `Cannot reduce capacity to ${updatedEvent.capacity}. Committed registrations: ${existing.registeredCount}.`,
        };
      }

      setCustomEvents((prev) => {
        const updated = prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
        AsyncStorage.setItem(STORAGE_KEY_HOSTED, JSON.stringify(updated)).catch((e) =>
          console.warn('Failed to update hosted event', e)
        );
        return updated;
      });

      if (isSupabaseConfigured && supabase && !updatedEvent.id.startsWith('host-ev-')) {
        try {
          await supabase
            .from('events')
            .update({
              title: updatedEvent.title,
              tagline: updatedEvent.tagline,
              description: updatedEvent.description,
              venue_name: updatedEvent.venue,
              address: updatedEvent.address,
              capacity: updatedEvent.capacity,
              registration_deadline: updatedEvent.registrationDeadline,
              status: updatedEvent.status,
              checklist: updatedEvent.checklist,
              agenda: updatedEvent.agenda,
              cancellation_reason: updatedEvent.cancellationReason,
              announcements: updatedEvent.announcements,
            })
            .eq('id', updatedEvent.id);
        } catch (err) {
          console.warn('Supabase update fallback:', err);
        }
      }

      return { success: true };
    },
    [combinedEvents]
  );

  const cancelEventByOrganizer = useCallback(
    async (eventId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
      if (!reason.trim()) {
        return { success: false, error: 'A cancellation reason is required.' };
      }
      const existing = combinedEvents.find((e) => e.id === eventId);
      if (!existing) {
        return { success: false, error: 'Event not found.' };
      }

      const cancelledEvent: HyperlocalEvent = {
        ...existing,
        status: 'cancelled',
        cancellationReason: reason.trim(),
      };

      setCustomEvents((prev) => {
        const updated = prev.map((e) => (e.id === eventId ? cancelledEvent : e));
        AsyncStorage.setItem(STORAGE_KEY_HOSTED, JSON.stringify(updated)).catch((e) =>
          console.warn('Failed to save cancellation', e)
        );
        return updated;
      });

      if (isSupabaseConfigured && supabase && !eventId.startsWith('host-ev-')) {
        try {
          await supabase
            .from('events')
            .update({
              status: 'cancelled',
              cancellation_reason: reason.trim(),
            })
            .eq('id', eventId);
        } catch (err) {
          console.warn('Supabase cancellation fallback:', err);
        }
      }

      return { success: true };
    },
    [combinedEvents]
  );

  const postAnnouncement = useCallback(
    async (
      eventId: string,
      announcement: Omit<EventAnnouncement, 'id' | 'createdAt'>
    ): Promise<{ success: boolean; error?: string }> => {
      const existing = combinedEvents.find((e) => e.id === eventId);
      if (!existing) {
        return { success: false, error: 'Event not found.' };
      }

      const newAnnouncement: EventAnnouncement = {
        id: `ann-${Date.now()}`,
        title: announcement.title.trim(),
        message: announcement.message.trim(),
        createdAt: new Date().toISOString(),
        isUrgent: announcement.isUrgent,
      };

      const existingAnnouncements = existing.announcements || [];
      const updatedAnnouncements = [newAnnouncement, ...existingAnnouncements];

      const updatedEvent: HyperlocalEvent = {
        ...existing,
        announcements: updatedAnnouncements,
      };

      setCustomEvents((prev) => {
        const updated = prev.map((e) => (e.id === eventId ? updatedEvent : e));
        AsyncStorage.setItem(STORAGE_KEY_HOSTED, JSON.stringify(updated)).catch((e) =>
          console.warn('Failed to save announcement', e)
        );
        return updated;
      });

      if (isSupabaseConfigured && supabase && !eventId.startsWith('host-ev-')) {
        try {
          await supabase
            .from('events')
            .update({
              announcements: updatedAnnouncements,
            })
            .eq('id', eventId);
        } catch (err) {
          console.warn('Supabase announcement fallback:', err);
        }
      }

      return { success: true };
    },
    [combinedEvents]
  );

  const getEventAttendees = useCallback(
    async (eventId: string): Promise<EventAttendee[]> => {
      // In Supabase, if authenticated and event is a UUID, query event_rsvps
      if (
        isSupabaseConfigured &&
        supabase &&
        !eventId.startsWith('ev-') &&
        !eventId.startsWith('host-ev-')
      ) {
        try {
          const { data, error } = await supabase
            .from('event_rsvps')
            .select(`
              id,
              status,
              created_at,
              profiles:user_id (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('event_id', eventId);

          if (!error && data && data.length > 0) {
            return data.map((item: any) => ({
              id: item.id,
              name: item.profiles?.full_name || 'Registered Participant',
              avatarUrl: item.profiles?.avatar_url,
              registrationDate: item.created_at,
              status: (item.status === 'active' ? 'confirmed' : item.status) as any,
              passId: `#SB-${item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
            }));
          }
        } catch (err) {
          console.warn('Supabase attendee fetch fallback:', err);
        }
      }

      // Local / seed event mock attendee roster
      const target = combinedEvents.find((e) => e.id === eventId);
      const isUserRsvpd = rsvpIds.includes(eventId);
      const isUserAttended = attendedIds.includes(eventId);

      const roster: EventAttendee[] = [];

      if (isUserRsvpd) {
        roster.push({
          id: 'user-you',
          name: 'You (Current User)',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          registrationDate: new Date().toISOString(),
          status: isUserAttended ? 'attended' : 'confirmed',
          passId: `#SB-${eventId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
        });
      }

      if (target?.buddiesAttending && target.buddiesAttending.length > 0) {
        target.buddiesAttending.forEach((buddy, idx) => {
          roster.push({
            id: buddy.id,
            name: buddy.name,
            avatarUrl: buddy.avatarUrl,
            registrationDate: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
            status: 'confirmed',
            passId: `#SB-${(buddy.id + idx).slice(-6).toUpperCase()}`,
          });
        });
      }

      return roster;
    },
    [combinedEvents, rsvpIds, attendedIds]
  );

  return (
    <EventsContext.Provider
      value={{
        savedIds,
        rsvpIds,
        attendedIds,
        toggleSave,
        isSaved,
        registerForEvent,
        cancelRegistration,
        toggleRsvp,
        isRsvpd,
        isAttended,
        markAsAttended,
        getEventAttendeeCount,
        getEventById,
        allEvents: publicEvents,
        customEvents,
        addEvent,
        updateEvent,
        deleteEvent,
        cancelEventByOrganizer,
        postAnnouncement,
        getEventAttendees,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = (): EventsContextType => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export type EventCategory =
  | 'All'
  | 'Music'
  | 'Comedy'
  | 'Workshops'
  | 'College'
  | 'Sports'
  | 'Meetups'
  | 'Parties';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BuddyAttendee {
  id: string;
  name: string;
  avatarUrl: string;
}

export type UserRole = 'user' | 'organizer' | 'staff' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  isGuest?: boolean;
  interests?: string[];
  bio?: string;
}

export interface AppError {
  message: string;
  code?: string;
  retry?: () => void;
}

export interface EventOrganizer {
  id: string;
  name: string;
  avatarUrl: string;
  isVerified: boolean;
  role?: string;
  bio?: string;
  contactEmail?: string;
  websiteUrl?: string;
}

export interface EventAnnouncement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isUrgent?: boolean;
}

export interface EventAttendee {
  id: string;
  name: string;
  avatarUrl?: string;
  registrationDate: string;
  status: 'confirmed' | 'cancelled' | 'attended';
  passId: string;
}

export interface EventAgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventChecklist {
  skillLevel?: string;
  eligibility?: string;
  teamRules?: string;
  equipment?: string;
  equipmentRequired?: string;
  idRequirement?: string;
  idRequired?: boolean;
  accessibility?: string;
}

export type EventStatus = 'published' | 'draft' | 'cancelled';

export interface HyperlocalEvent {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: EventCategory;
  date: string; // ISO format: YYYY-MM-DD
  displayDate: string;
  dayNumber?: string;
  monthShort?: string;
  time: string;
  endTime?: string;
  timezone?: string;
  registrationDeadline?: string;
  venue: string;
  address: string;
  coordinates: Coordinates;
  distanceKm?: number;
  imageUrl: string;
  price: string;
  isFree: boolean;
  attendeeCount: number;
  capacity?: number;
  registeredCount?: number;
  status?: EventStatus;
  cancellationReason?: string;
  votedCount?: number;
  gradientColors?: readonly [string, string, ...string[]];
  buddiesAttending: BuddyAttendee[];
  organizer: EventOrganizer;
  isFeatured?: boolean;
  isTrending?: boolean;
  isUpcoming?: boolean;
  isSeedDemoData: boolean;
  isVerifiedRealWorld: boolean;
  agenda?: EventAgendaItem[];
  checklist?: EventChecklist;
  announcements?: EventAnnouncement[];
}

export type RootTabParamList = {
  Discover: undefined;
  Calendar: undefined;
  Nearby: undefined;
  Host: undefined;
  Saved: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Profile: undefined;
  EventDetail: { eventId: string };
  CityPulse: { focusEventId?: string } | undefined;
};

// ==============================================================================
// CITY PULSE SPATIAL & PROJECTION TYPES
// ==============================================================================

export type LocationProvenance = 'gps' | 'discovery_hub' | 'fallback_demo';

export interface CartesianPoint {
  x: number; // km relative to projection center (East is +x, West is -x)
  y: number; // km relative to projection center (North is +y, South is -y)
}

export interface IsometricPoint {
  isoX: number; // 2.5D projected horizontal coordinate
  isoY: number; // 2.5D projected vertical coordinate
}

export interface ScreenPoint {
  screenX: number;  // Position in screen pixels relative to viewport
  screenY: number;  // Position in screen pixels relative to viewport
  depth: number;    // Z-depth for painter's algorithm sorting
  visible: boolean;  // Inside renderable viewport boundary
}

export interface ProjectedSpatialMarker {
  eventId: string;
  event: HyperlocalEvent;
  coordinates: Coordinates;
  cartesian: CartesianPoint;
  isometric: IsometricPoint;
  screen: ScreenPoint;
  distanceKm: number;
  isValid: boolean;
}

export interface CityPulseViewportConfig {
  center: Coordinates;
  scale: number; // Pixels per kilometer
  viewportWidth: number;
  viewportHeight: number;
  isometricAngle?: number; // Radians, defaults to Math.PI / 6 (30 deg)
  maxRadiusKm?: number;
}

export interface LocationMismatchInfo {
  isMismatch: boolean;
  userDistanceKm: number;
  userLocationName: string;
  activeAreaName: string;
  disclaimer?: string;
}


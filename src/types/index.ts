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

export type EventAttendanceMode = 'in_person' | 'online' | 'hybrid' | 'unknown';
export type EventFormatFilter = 'all' | 'in_person' | 'online';
export type DateFilterOption = 'All Dates' | 'Today' | 'Tomorrow' | 'This Weekend' | 'This Week';

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
  attendanceMode?: EventAttendanceMode;
  isOnline?: boolean;
  tags?: string[];
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
  BuddyMatch: { eventId?: string } | undefined;
  BuddyMatchRadar: { eventId?: string } | undefined;
  EventCircleDetail: { circleId: string; eventId?: string };
  Chat: {
    conversationId?: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar: string;
    eventId?: string;
  };
  Conversations: undefined;
};

// ==============================================================================
// BUDDY MATCH & EVENT CIRCLES TYPES
// ==============================================================================

export type ConnectionStatus =
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming'
  | 'connected'
  | 'accepted'
  | 'rejected'
  | 'cancelled';

export interface BuddyProfile {
  id: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  interests: string[];
  attendanceStatus: 'confirmed' | 'interested' | 'host' | 'attended';
  registeredAt?: string;
  isHost?: boolean;
}

export interface InterestMatchResult {
  sharedInterests: string[];
  sharedCount: number;
  matchReason: string;
  isSameEvent: boolean;
  categoryAffinity?: boolean;
}

export interface EventCircle {
  id: string;
  eventId?: string;
  categoryId?: string;
  name: string;
  tagline?: string;
  description: string;
  coverImageUrl?: string;
  meetingPoint?: string;
  rulesAndVibe?: string;
  memberCount: number;
  isJoined: boolean;
  isOfficial?: boolean;
  recentMembers?: BuddyAttendee[];
}

export interface BuddyConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  eventId?: string;
  status: ConnectionStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  senderProfile?: BuddyProfile;
  receiverProfile?: BuddyProfile;
  targetUser?: BuddyProfile;
}

// ==============================================================================
// CITY PULSE SPATIAL & PROJECTION TYPES
// ==============================================================================

export type LocationProvenance = 'gps' | 'discovery_hub' | 'fallback_demo';

export type LiveConnectionStatus = 'LIVE' | 'CONNECTING' | 'DEMO' | 'OFFLINE';

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

// ==============================================================================
// REALTIME PRIVATE MESSAGING & PLAN TOGETHER TYPES
// ==============================================================================

export type MessageType = 'text' | 'event_plan' | 'system';

export interface EventPlanMetadata {
  eventId: string;
  eventTitle: string;
  venue: string;
  displayDate: string;
  time: string;
  imageUrl?: string;
  meetingPoint?: string;
  suggestedTime?: string;
  note?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  metadata?: EventPlanMetadata;
  createdAt: string;
}

export interface ConversationPreview {
  id: string;
  recipient: BuddyProfile;
  lastMessage?: ChatMessage;
  updatedAt: string;
  unreadCount?: number;
}


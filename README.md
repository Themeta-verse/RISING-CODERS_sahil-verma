# Social Buddy 🧭

> **Hyperlocal Event Discovery & Community Engagement Platform**  
> Built for the **VecnaVerse Hackathon** (Problem Statement 1: Hyperlocal Event Discovery & Community Engagement).

---

## 🌟 Overview

**Social Buddy** is a mobile application built with React Native and Expo, designed to connect people with secret gigs, tech hackathons, creative workshops, and vibrant community circles happening right around the corner.

Moving beyond generic event listings and opaque recommendation black-boxes, Social Buddy emphasizes:
- **Spatial Proximity:** Real-time distance filtering and neighborhood hub discovery (Bandra & BKC, South Mumbai Heritage, Andheri & Juhu, Thane, Navi Mumbai, Pune, Nashik, Nagpur).
- **Explainable Relevance:** Transparent match badges indicating why an event was recommended (e.g. *"Workshops +1 · 1.5 km away"*, *"Free Entry"*, *"Virtual"*).
- **Readiness-First Attendee Journey:** Pre-arrival checklists covering skill levels, prerequisites, solo/team policies, equipment requirements, ID checks, and accessibility details.
- **Organizer Command Center:** End-to-end event hosting, cover poster uploads, capacity safeguards, broadcast announcements, and authorized attendee roster management.
- **Social Coordination:** Peer-to-peer buddy matching, Buddy Radar, event circles, and secure private event messaging.

---

## 📱 Key Features

### 🔍 1. Discover 2.0 (Personalized Event Discovery & Live Feed)
> **Milestone Released:** November 6, 2026 · 3:10 AM IST (UTC+05:30)

- **Personalized Event Matching:** Deterministic ranking driven by verified user profile interests (`AI`, `Coding`, `Design`, `Workshops`, `Hackathons`, `Music`, `Meetups`, `Parties`).
- **Verifiable Relevance Scoring:** Events score strictly on verified shared interests (+40 per match), direct category affinity (+25), and physical proximity (+30 for $\le 2\text{ km}$, +20 for $\le 5\text{ km}$ or virtual, +10 for $\le 10\text{ km}$, +5 for $\le 25\text{ km}$).
- **Deterministic 4-Tier Tie-Breaking:** Stable sorting hierarchy (score descending $\rightarrow$ proximity ascending $\rightarrow$ date ascending $\rightarrow$ unique ID ascending) guaranteeing feed stability without fabricated popularity or trending scores.
- **Truthful Match Badges:** Dynamic, truthful badge labels reflecting exact reasons for recommendation.
- **Advanced Discovery Filters:**
  - **Free-Only Events:** Dedicated toggle filtering free events via explicit `isFree` metadata and currency zero normalization (`₹0`, `₹0.00`, `INR 0`, `Rs. 0`, `$0`, `$0.00`, `0`, `0.00`, `Free Entry`, `Complimentary`), strictly distinguishing free from unknown/unavailable pricing (`TBD`, `TBA`).
  - **Attendance Format Filters:** Instant toggling between `All Formats`, `In-Person`, and `Online`.
  - **Dynamic Calendar Date Filters:** `Today`, `Tomorrow`, `This Weekend`, `This Week`, and `All Dates`. Handles month/year rollovers (e.g., Oct 31 $\rightarrow$ Nov 1, Dec 31 $\rightarrow$ Jan 1) and excludes past events from upcoming windows.
  - **Multi-Token Keyword Search:** Tokenized multi-word search across event titles, taglines, categories, venues, addresses, descriptions, tags, organizers, and pricing terms. Every query token must match somewhere across the combined searchable fields.
- **Conservative Attendance Classification:**
  - **Metadata Priority:** Explicit `attendance_mode` / `format` metadata and `isOnline` flags take absolute priority.
  - **Virtual Platform Detection:** Reliable online keywords (`zoom`, `google meet`, `gmeet`, `webinar`, `discord`, `twitch`, `livestream`, `teams`, `remote via`) accurately classified as `online`.
  - **Credible Physical Venue Detection:** Word-boundary regular expressions verify physical infrastructure (`theatre`, `auditorium`, `stadium`, `convention centre`, `hall`, `road`, `street`, `wework`, `building`, etc.).
  - **Conservative Unknown Fallback:** City/area names alone (e.g., Mumbai, BKC, Bandra) never establish in-person attendance, and missing coordinates never imply online attendance. Conflicting or ambiguous signals default to `unknown`, preserved in the `All` filter and excluded from specific format filters.
- **Live Event Feed & Pull-to-Refresh:**
  - Pull-to-refresh directly invokes remote hyperlocal fetching via the PostGIS `get_hyperlocal_events` RPC or table fallback.
  - Updates `allEvents` across the application while safely preserving custom hosted events, saved bookmarks, RSVPs, and attendance records.
  - Concurrency guard prevents duplicate simultaneous refresh requests.
  - Graceful network error handling retains cached events and displays a subtle offline notice.
- **Enhanced Event Card UX:**
  - Format badges: high-contrast `ONLINE` (`#60A5FA`) and `IN-PERSON` (`#34D399`) badges.
  - Virtual event distance presentation: displays `'Virtual'` instead of raw kilometer measurements.
  - Dynamic ambient background glow that shifts in color as users scroll through cards.
  - Contextual empty states detailing active filters with a one-tap "Reset All Filters" action.

### 🏙️ 2. City Pulse & Hyperlocal Discovery
- **3D Spatial Projection & Interactive Map:** Visual map projection of city events with interactive map markers, category clusters, and distance callouts.
- **Multi-Hub Navigation:** Instant switching between regional culture hubs (Bandra & BKC, South Mumbai, Andheri & Juhu, Pune, Thane, Navi Mumbai, Nashik, Nagpur) and physical GPS coordinates with location mismatch detection.
- **Category & Distance Filters:** Quick filter chips for `Music`, `Workshops`, `Meetups`, `Parties`, `Comedy`, `Sports`, and `College`, with radius controls from `10 km` to `50 km`.

### 👥 3. Buddy Match & Buddy Radar
- **Buddy Radar Scanner:** Visual proximity scanner discovering other verified attendees going to nearby events.
- **Connection Lifecycle:** Send connection requests with customized intro notes, accept/decline invites, and view attendee profiles.
- **Event Circles:** Form event squads and join community groups centered around shared events.
- **Private Event Messaging:** 1-on-1 private messaging and group event circles powered by Supabase Realtime with plan coordination ("Plan Together").

### 📅 4. Interactive Events Calendar
- **Dynamic Month Dropdown:** Full-year calendar navigation supporting 2026, 2027, and beyond with one-tap month & year picker.
- **Photo-Thumbnail Date Grid:** Circular event artwork previews pinned directly to corresponding calendar days.
- **Scheduled Date Drawer:** Tap any day to inspect all scheduled sessions, times, venues, and instant bookmarking.

### 🎫 5. Event Decision & Registration Journey
- **Comprehensive Details:** Timings, venue directions, organizer credentials, capacity meters, and deadlines.
- **Ready-to-Attend Checklist:** Complete clarity on prerequisites before RSVPing (skill requirements, team rules, required items, accessibility).
- **Transactional Registration:** Safe RSVP and cancellation handled via backend RPCs to avoid race conditions or over-capacity bookings.
- **Native Sharing:** One-tap native sharing via device share sheets.

### 🛠️ 6. Organizer Command Center (Host)
- **Multi-Event Management:** Host, preview, edit, reschedule, or cancel events with visible cancellation reasons.
- **Custom Poster Upload:** Choose from curated high-contrast event presets or upload custom posters from the device gallery via `expo-image-picker`.
- **Attendee Roster:** View authorized attendee names, registration timestamps, and real-time capacity metrics.
- **Broadcast Announcements:** Send pinned operational updates directly to registered participants.
- **Capacity Safeguards:** Server-side validation preventing accidental down-sizing below registered counts.

### 🏷️ 7. My Events (Saved & Passes)
- **Segmented Management:** Quick toggle between **Saved** bookmarks, **Upcoming** RSVP passes, and **Attended** event history.
- **Fast Cancellation:** Attendees can release booked tickets anytime to open up capacity for others.

### 👤 8. Profile & Account Settings
- **Profile Picture Management:** Upload or update profile pictures directly from the device gallery with real-time avatar synchronization across the entire app.
- **Interest Customization:** Select and update preferred community topics on the fly.
- **Discovery Hub Selection:** Set a default neighborhood or enable GPS scanning.
- **Account Controls:** Secure sign-out and complete GDPR/CCPA cascade account deletion.
- **Role Switcher (Demo Tool):** Switch between `user`, `organizer`, `staff`, and `admin` roles for evaluation and testing.

---

## 🎨 Design System & Aesthetics

Social Buddy features a dark **Obsidian Theme** engineered for high visual impact and smooth performance:
- **Palette:** Rich obsidian (`#07080B`), elevated cards (`#12151D`), accented with glowing warm sunset orange (`#FF6B00` → `#FF5E3A`).
- **Wavy Animated Brand Title:** Continuous sinusoidal floating wave animation and contrast gradient on the Sign-In dashboard.
- **Dynamic Ambient Glow:** Screen backgrounds respond to the color gradient of the currently visible card.
- **Micro-Interactions:** Subtle haptic feedback (`expo-haptics`) on selections, bookmarking, filter pills, and tab switching.
- **Safe Area Insets:** Native notch and dynamic island compliance across iOS and Android devices.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) (0.88.0) + [Expo](https://expo.dev/) (SDK 58.0.19) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | Vanilla React Native `StyleSheet` with centralized Design Tokens (`colors`, `spacing`, `typography`, `borderRadius`) |
| **Navigation** | [React Navigation 7](https://reactnavigation.org/) (Bottom Tabs + Native Stack) |
| **Backend & Database** | [Supabase](https://supabase.com/) (PostgreSQL 15, PostGIS Spatial queries, Row Level Security) |
| **Realtime** | Supabase Realtime Channels (live messaging, plan coordination, event updates) |
| **Device Hardware** | `expo-location`, `expo-image-picker`, `expo-haptics` |
| **Local Storage** | `@react-native-async-storage/async-storage` for offline caching, session hydration, and hosted event persistence |

---

## 📁 Project Structure

```
SOCIAL-BUDDY/
├── App.tsx                     # App entry point, Font hydration & Root Provider setup
├── app.json                    # Expo project configuration
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── BuddyAttendeeCard.tsx # Attendee profile card with connect action
│   │   ├── ConnectNoteModal.tsx  # Customized connection intro note modal
│   │   ├── EventCircleCard.tsx   # Event squad & circle card
│   │   ├── FeaturedEventCard.tsx # Banner carousel card with match badges
│   │   ├── RadiusFilter.tsx      # Proximity distance filter pills
│   │   ├── ReferenceEventCard.tsx# Discover 2.0 card with format badges & truthful labels
│   │   └── StateFeedback.tsx     # Standardized loading/empty/offline states
│   ├── context/                # React Context Providers
│   │   ├── AuthContext.tsx     # Supabase auth, roles, profile management, and session hydration
│   │   ├── EventsContext.tsx   # Live event feed, remote refresh, RSVPs, saved bookmarks, and custom hosting
│   │   └── LocationContext.tsx # GPS coordinates, neighborhood hubs, and distance calculations
│   ├── data/                   # Default datasets and fallback events
│   │   └── mockEvents.ts       # Curated hyperlocal seed events & default coordinates
│   ├── navigation/             # App navigators
│   │   └── RootNavigator.tsx   # Bottom tabs (Events, Calendar, Nearby, Host, Saved) & Stack
│   ├── screens/                # Core Application Screens
│   │   ├── BuddyMatchRadarScreen.tsx # Concentric radar scanner for nearby attendees
│   │   ├── BuddyMatchScreen.tsx      # Attendee matchmaking & squad discovery
│   │   ├── ChatScreen.tsx            # Private 1-on-1 & event circle chat with Plan Together
│   │   ├── CityPulseScreen.tsx       # 3D interactive map projection & live pulse feed
│   │   ├── ConversationsScreen.tsx   # Direct messages inbox & conversation list
│   │   ├── DiscoverScreen.tsx        # Discover 2.0 feed with multi-criteria filters & live refresh
│   │   ├── EventCircleDetailScreen.tsx # Circle details & squad membership
│   │   ├── EventDetailScreen.tsx     # Pre-arrival checklist, RSVP, directions & share
│   │   ├── EventsCalendarScreen.tsx  # Dynamic month dropdown, day photo grid & drawer
│   │   ├── HostScreen.tsx            # Organizer command center, event creation & rosters
│   │   ├── LoginScreen.tsx           # Sign-in dashboard with wavy animated gradient title
│   │   ├── ProfileScreen.tsx         # Profile editing, gallery avatar picker & settings
│   │   └── SavedScreen.tsx           # My Events (Saved, Upcoming, Attended)
│   ├── services/
│   │   ├── buddyMatchService.ts # Connection lifecycle, attendee queries & notes
│   │   ├── liveEventService.ts  # PostGIS RPC fetch, realtime sync, attendance classification, date & price normalization
│   │   ├── messagingService.ts  # Supabase realtime messaging, conversations & plans
│   │   └── supabase.ts          # Supabase client initialization & connection checks
│   ├── theme/                  # Design tokens
│   │   ├── colors.ts           # Obsidian background, text, and warm sunset palette
│   │   ├── spacing.ts          # Centralized padding and margin scale
│   │   └── typography.ts       # Standardized font scales and weights
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces, attendance modes & domain models
│   └── utils/
│       └── distance.ts         # Haversine spatial distance calculations
├── scripts/
│   └── test_discover_2_filters.ts # Discover 2.0 test suite covering 82 test cases
└── supabase/
    └── migrations/             # PostgreSQL schema, RLS policies, PostGIS RPCs, and messaging triggers
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Expo Go](https://expo.dev/go) app installed on your physical device, or an iOS / Android simulator

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/RISING-CODERS/RISING-CODERS_sahil-verma.git
cd RISING-CODERS_sahil-verma
npm install
```

### 2. Environment Variables
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
> *Note: If Supabase credentials are not provided or the network is unavailable, Social Buddy gracefully runs in an offline-resilient demo mode using cached local storage.*

### 3. Start Development Server
```bash
npx expo start
```
- Press `a` to launch in Android Emulator
- Press `i` to launch in iOS Simulator
- Press `w` to open in Web Browser
- Scan the displayed QR code with the **Expo Go** mobile app on your phone.

---

## 🧪 Validation & Test Suite

Social Buddy includes comprehensive automated test suites to verify data integrity, filter accuracy, and security:

```bash
# Run Discover 2.0 filter, ranking, classification, and refresh test suite (82/82 passing)
npx tsx -r ./scripts/register-hook.cjs scripts/test_discover_2_filters.ts

# Type check TypeScript codebase (Strict Mode)
npx tsc --noEmit

# Export web production bundle
npx expo export --platform web

# Diagnose dependency and configuration health
npx expo-doctor
```

### Discover 2.0 Test Suite Coverage
The verification suite (`scripts/test_discover_2_filters.ts`) validates 82 test cases across 6 suites:
1. **Free / Pricing Normalization (24 tests):** Handles explicit flags, free variations (`Free Entry`, `Complimentary`), currency zero regex formats (`₹0`, `₹0.00`, `INR 0`, `Rs. 0`, `$0`, `$0.00`), and non-free / unavailable exclusions (`₹499`, `TBD`, `TBA`, `N/A`).
2. **Attendance Format Classification (24 tests):** Validates explicit metadata precedence, virtual platform keywords (Zoom, Google Meet, Teams, Discord, Twitch), physical venue word boundary patterns (theatres, auditoriums, convention centres, campuses, roads), strict exclusion of broad city names alone, missing coordinate safety, and ambiguous signal fallback to `unknown`.
3. **Calendar Date Filtering & Past Events (17 tests):** Local day parsing, month and year boundary rollovers (Oct 31 $\rightarrow$ Nov 1, Dec 31 $\rightarrow$ Jan 1), Saturday/Sunday weekend calculations, 7-day rolling window, and past event exclusions from upcoming filters.
4. **Multi-Token Search (5 tests):** Cross-field multi-keyword token matching (e.g., matching across title, organizer, venue, and tags), token order independence, case insensitivity, and whitespace handling.
5. **Deterministic Personalized Ranking (5 tests):** Verified shared interests, direct category affinity, proximity weighting, zero fabricated bonuses, stable deterministic tie-breaking, and truthful match explanations.
6. **Genuine Event-Source Refresh & Persistence (7 tests):** Remote PostGIS RPC / table query invocation, live `allEvents` context update, preservation of locally hosted events, bookmarks, and RSVPs, and duplicate refresh concurrency prevention.

---

## ⏱️ Development Timeline & Feature Milestones

| Milestone | Date & Time | Scope & Delivered Features |
|---|---|---|
| **Auth & Connection Lifecycle** | November 5, 2026 · 9:05 PM IST | Hardened authentication, connection requests, customized intro notes, and attendee connection lifecycle. |
| **Radar & Private Messaging** | November 5, 2026 · 11:00 PM IST | Buddy Match Radar visual scan, Supabase Realtime 1-on-1 private messaging, Event Circles squads, and Plan Together coordination. |
| **Discover 2.0** | November 6, 2026 · 3:10 AM IST | Discover 2.0 personalized discovery, advanced filters, live event refresh, conservative attendance classification. |

---

## 🔒 Security & Data Integrity

- **Row Level Security (RLS):** Private participant data (emails, phone numbers, RSVP logs, private direct messages) is strictly restricted from unauthorized queries using PostgreSQL RLS policies.
- **Server-Side Validation:** Event capacity and registration deadlines are strictly enforced via transactional database triggers and RPCs (`register_for_event`, `cancel_event_registration`).
- **Role-Based Access Control:** Separate capability tiers for participants, verified organizers, staff, and system administrators.
- **Privacy First:** Only foreground location permissions are requested, with instant fallback to manual neighborhood hubs.

---

## 📄 License

This project was built for the **VecnaVerse Hackathon** under the MIT License.
All rights reserved.

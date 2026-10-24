# Social Buddy 🧭

> **Hyperlocal Event Discovery & Community Engagement Platform**  
> Built for the **VecnaVerse Hackathon** (Problem Statement 1: Hyperlocal Event Discovery & Community Engagement).

---

## 🌟 Overview

**Social Buddy** is a mobile application built with React Native and Expo, designed to connect people with secret gigs, tech hackathons, creative workshops, and vibrant community circles happening right around the corner.

Moving beyond generic event listings and opaque recommendation black-boxes, Social Buddy emphasizes:
- **Spatial Proximity:** Real-time distance filtering and neighborhood hub discovery (Indiranagar, Koramangala, Whitefield, North Corridor).
- **Explainable Relevance:** Transparent match badges indicating why an event was recommended (e.g. *"Matches your interest in Coding"*, *"In your neighborhood (< 2 km)"*).
- **Readiness-First Attendee Journey:** Pre-arrival checklists covering skill levels, prerequisites, solo/team policies, equipment requirements, ID checks, and accessibility details.
- **Organizer Command Center:** End-to-end event hosting, cover poster uploads, capacity safeguards, broadcast announcements, and authorized attendee roster management.

---

## 📱 Key Features

### 🔍 1. Hyperlocal Discovery & Ranked Feed
- **Proximity & Hub Filtering:** Switch seamlessly between live GPS coordinates and popular neighborhood hubs with manual fallback.
- **Distance Radius Selector:** Filter events within `2 km`, `5 km`, `10 km`, `25 km`, or `All Distance`.
- **Multi-Field Keyword Search:** Instant search across event titles, topics, organizers, venues, and descriptions with persistent query state.
- **Interest-Driven Sorting:** Deterministic relevance ranking based on user-selected interests (`AI`, `Coding`, `Design`, `Workshops`, `Hackathons`, `Music`, `Meetups`, `Parties`).
- **Explainable Match Badges:** Visual clarity on why each event appears on the feed.

### 📅 2. Interactive Events Calendar
- **Dynamic Month Dropdown:** Full-year calendar navigation supporting 2026, 2027, and beyond with one-tap month & year picker.
- **Photo-Thumbnail Date Grid:** Circular event artwork previews pinned directly to corresponding calendar days.
- **Scheduled Date Drawer:** Tap any day to inspect all scheduled sessions, times, venues, and instant bookmarking.

### 📡 3. Proximity Radar (Nearby Scan)
- **Live Visual Scanner:** Concentric scanning radar with animated sweep beam and pulsating beacons.
- **Distance-Ranked Cards:** Nearby event cards sorted strictly by real-time distance from the user.

### 🎫 4. Event Decision & Registration Journey
- **Comprehensive Details:** Timings, venue directions, organizer credentials, capacity meters, and deadlines.
- **Ready-to-Attend Checklist:** Complete clarity on prerequisites before RSVPing (skill requirements, team rules, required items, accessibility).
- **Transactional Registration:** Safe RSVP and cancellation handled via backend RPCs to avoid race conditions or over-capacity bookings.
- **Native Sharing:** One-tap native sharing via device share sheets.

### 🛠️ 5. Organizer Command Center (Host)
- **Multi-Event Management:** Host, preview, edit, reschedule, or cancel events with visible cancellation reasons.
- **Custom Poster Upload:** Choose from curated high-contrast event presets or upload custom posters from the device gallery via `expo-image-picker`.
- **Attendee Roster:** View authorized attendee names, registration timestamps, and real-time capacity metrics.
- **Broadcast Announcements:** Send pinned operational updates directly to registered participants.
- **Capacity Safeguards:** Server-side validation preventing accidental down-sizing below registered counts.

### 🏷️ 6. My Events (Saved & Passes)
- **Segmented Management:** Quick toggle between **Saved** bookmarks, **Upcoming** RSVP passes, and **Attended** event history.
- **Fast Cancellation:** Attendees can release booked tickets anytime to open up capacity for others.

### 👤 7. Profile & Account Settings
- **Profile Picture Management:** Upload or update profile pictures directly from the device gallery with real-time avatar synchronization across the entire app.
- **Interest Customization:** Select and update preferred community topics on the fly.
- **Discovery Hub Selection:** Set a default neighborhood or enable GPS scanning.
- **Account Controls:** Secure sign-out and complete GDPR/CCPA cascade account deletion.
- **Role Switcher (Demo Tool):** Switch between `user`, `organizer`, `staff`, and `admin` roles for evaluation and testing.

---

## 🎨 Design System & Aesthetics

Social Buddy features a dark **Obsidian Theme** engineered for high visual impact and smooth performance:
- **Palette:** Rich obsidian (`#07080B`), elevated cards (`#12151D`), accented with glowing warm sunset orange (`#FF5400` → `#FFC837`).
- **Wavy Animated Brand Title:** Continuous sinusoidal floating wave animation and contrast gradient on the Sign-In dashboard.
- **Micro-Interactions:** Subtle haptic feedback (`expo-haptics`) on selections, bookmarking, and tab switching.
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
| **Device Hardware** | `expo-location`, `expo-image-picker`, `expo-haptics` |
| **Local Storage** | `@react-native-async-storage/async-storage` for resilient offline caching and session hydration |

---

## 📁 Project Structure

```
SOCIAL-BUDDY/
├── App.tsx                     # App entry point, Font hydration & Root Provider setup
├── app.json                    # Expo project configuration
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── CategorySelector.tsx# Horizontal topic selector chips
│   │   ├── FeaturedEventCard.tsx# Banner carousel card with match badges
│   │   ├── EventGridCard.tsx   # Two-column discovery grid cards
│   │   ├── RadiusFilter.tsx    # Proximity distance filter pills
│   │   └── StateFeedback.tsx   # Standardized loading/empty/offline states
│   ├── context/                # React Context Providers
│   │   ├── AuthContext.tsx     # Supabase auth, roles, profile management, and session hydration
│   │   ├── EventsContext.tsx   # Event discovery, RSVPs, saved bookmarks, and notifications
│   │   └── LocationContext.tsx # GPS coordinates, neighborhood hubs, and distance calculations
│   ├── data/                   # Default datasets and fallback events
│   │   └── mockEvents.ts       # Curated hyperlocal seed events
│   ├── navigation/             # App navigators
│   │   └── RootNavigator.tsx   # Bottom tabs (Events, Calendar, Nearby, Host, Saved) & Stack
│   ├── screens/                # Core Application Screens
│   │   ├── DiscoverScreen.tsx  # Main discovery feed, radius filter & search
│   │   ├── EventDetailScreen.tsx# Pre-arrival checklist, RSVP, directions & share
│   │   ├── EventsCalendarScreen.tsx# Dynamic month dropdown, day photo grid & drawer
│   │   ├── HostScreen.tsx      # Organizer command center, event creation & rosters
│   │   ├── LoginScreen.tsx     # Sign-in dashboard with wavy animated gradient title
│   │   ├── ProfileScreen.tsx   # Profile editing, gallery avatar picker & settings
│   │   ├── RadarScreen.tsx     # Concentric proximity radar scan
│   │   └── SavedScreen.tsx     # My Events (Saved, Upcoming, Attended)
│   ├── services/
│   │   └── supabase.ts         # Supabase client initialization & connection checks
│   ├── theme/                  # Design tokens
│   │   ├── colors.ts           # Obsidian background, text, and warm sunset palette
│   │   ├── spacing.ts          # Centralized padding and margin scale
│   │   └── typography.ts       # Standardized font scales and weights
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces and domain models
│   └── utils/
│       └── distance.ts         # Haversine spatial distance calculations
└── supabase/
    └── migrations/             # PostgreSQL schema, RLS policies, and RPC definitions
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
git clone https://github.com/Themeta-verse/SOCIAL-BUDDY.git
cd SOCIAL-BUDDY
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

## 🧪 Validation & Type Checking

Ensure code health before submitting changes:
```bash
# Type check TypeScript codebase
npx tsc --noEmit

# Diagnose dependency and configuration health
npx expo-doctor
```

---

## 🔒 Security & Data Integrity

- **Row Level Security (RLS):** Private participant data (emails, phone numbers, RSVP logs) is restricted from public queries using PostgreSQL RLS policies.
- **Server-Side Validation:** Event capacity and registration deadlines are strictly enforced via transactional database triggers and RPCs (`register_for_event`, `cancel_event_registration`).
- **Role-Based Access Control:** Separate capability tiers for participants, verified organizers, staff, and system administrators.
- **Privacy First:** Only foreground location permissions are requested, with instant fallback to manual neighborhood hubs.

---

## 📄 License

This project was built for the **VecnaVerse Hackathon** under the MIT License.
All rights reserved.

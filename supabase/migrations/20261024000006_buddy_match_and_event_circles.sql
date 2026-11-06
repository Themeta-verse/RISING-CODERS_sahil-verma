-- ==============================================================================
-- Migration: 20261024000006_buddy_match_and_event_circles.sql
-- Project: Social Buddy (Feature 2: Buddy Match & Event Circles)
-- Description:
--   1. Adds interest tags, display name, and demo flag to public.profiles.
--   2. Creates public.event_circles for event-specific community groups.
--   3. Creates public.event_circle_members for tracking circle membership with duplicate prevention.
--   4. Creates public.buddy_connection_requests for privacy-preserving connection lifecycle.
--   5. Configures Row Level Security (RLS) enforcing strict user ownership and anti-impersonation.
--   6. Implements get_event_buddy_attendees() security definer RPC with zero private data exposure.
--   7. Seeds demonstration circles mapped to verified Maharashtra events.
-- ==============================================================================

begin;

-- 1. ENHANCE USER PROFILES
alter table public.profiles
  add column if not exists interests text[] default '{}',
  add column if not exists display_name text,
  add column if not exists is_demo boolean not null default false;

-- 2. EVENT CIRCLES (Event-Specific Communities)
create table if not exists public.event_circles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  category_id text references public.event_categories(id) on delete set null,
  name text not null check (char_length(name) >= 3 and char_length(name) <= 80),
  tagline text check (char_length(tagline) <= 160),
  description text not null,
  cover_image_url text,
  meeting_point text,
  rules_and_vibe text,
  member_count int not null default 1,
  is_official boolean not null default false,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. EVENT CIRCLE MEMBERS (Membership & Roles)
create table if not exists public.event_circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.event_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'lead')),
  joined_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

-- 4. BUDDY CONNECTION REQUESTS (Connection Lifecycle MVP)
create table if not exists public.buddy_connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  note text check (char_length(note) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

-- ==============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ==============================================================================

create index if not exists idx_event_circles_event on public.event_circles(event_id);
create index if not exists idx_event_circles_category on public.event_circles(category_id);
create index if not exists idx_circle_members_circle on public.event_circle_members(circle_id);
create index if not exists idx_circle_members_user on public.event_circle_members(user_id);
create index if not exists idx_buddy_req_sender on public.buddy_connection_requests(sender_id, status);
create index if not exists idx_buddy_req_receiver on public.buddy_connection_requests(receiver_id, status);
create index if not exists idx_buddy_req_event on public.buddy_connection_requests(event_id);

-- ==============================================================================
-- UPDATED_AT TRIGGERS
-- ==============================================================================

drop trigger if exists trigger_event_circles_updated_at on public.event_circles;
create trigger trigger_event_circles_updated_at
  before update on public.event_circles
  for each row execute function public.handle_updated_at();

drop trigger if exists trigger_buddy_connection_requests_updated_at on public.buddy_connection_requests;
create trigger trigger_buddy_connection_requests_updated_at
  before update on public.buddy_connection_requests
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.event_circles enable row level security;
alter table public.event_circle_members enable row level security;
alter table public.buddy_connection_requests enable row level security;

-- ------------------------------------------------------------------------------
-- RLS POLICIES: EVENT CIRCLES
-- ------------------------------------------------------------------------------

-- Public / authenticated discovery
drop policy if exists "Event circles are viewable by everyone" on public.event_circles;
create policy "Event circles are viewable by everyone"
  on public.event_circles for select
  using (true);

-- Authenticated users or database administrators can create circles
drop policy if exists "Authenticated users can create event circles" on public.event_circles;
create policy "Authenticated users can create event circles"
  on public.event_circles for insert
  with check (
    auth.uid() = created_by
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- Creators or administrators can update circles
drop policy if exists "Circle creators can update circle metadata" on public.event_circles;
create policy "Circle creators can update circle metadata"
  on public.event_circles for update
  using (
    auth.uid() = created_by
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- ------------------------------------------------------------------------------
-- RLS POLICIES: EVENT CIRCLE MEMBERS
-- ------------------------------------------------------------------------------

-- Circle members are viewable by everyone for discovery and membership lists
drop policy if exists "Circle members are viewable by everyone" on public.event_circle_members;
create policy "Circle members are viewable by everyone"
  on public.event_circle_members for select
  using (true);

-- Users can only join circles as themselves (anti-impersonation)
drop policy if exists "Users can join circles as themselves" on public.event_circle_members;
create policy "Users can join circles as themselves"
  on public.event_circle_members for insert
  with check (
    auth.uid() = user_id
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- Users can only leave circles for themselves
drop policy if exists "Users can leave circles for themselves" on public.event_circle_members;
create policy "Users can leave circles for themselves"
  on public.event_circle_members for delete
  using (
    auth.uid() = user_id
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- ------------------------------------------------------------------------------
-- RLS POLICIES: BUDDY CONNECTION REQUESTS
-- ------------------------------------------------------------------------------

-- Users can only view requests where they are either sender or receiver
drop policy if exists "Users can view their own connection requests" on public.buddy_connection_requests;
create policy "Users can view their own connection requests"
  on public.buddy_connection_requests for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or coalesce(auth.role(), '') = 'service_role'
  );

-- Users can only send connection requests as themselves (anti-impersonation)
drop policy if exists "Users can send connection requests as themselves" on public.buddy_connection_requests;
create policy "Users can send connection requests as themselves"
  on public.buddy_connection_requests for insert
  with check (
    (auth.uid() = sender_id and sender_id <> receiver_id)
    or coalesce(auth.role(), '') = 'service_role'
  );

-- Receivers can accept or reject; senders CANNOT accept their own requests
drop policy if exists "Receivers can accept or reject connection requests" on public.buddy_connection_requests;
create policy "Receivers can accept or reject connection requests"
  on public.buddy_connection_requests for update
  using (auth.uid() = receiver_id or coalesce(auth.role(), '') = 'service_role')
  with check (
    (auth.uid() = receiver_id and status in ('accepted', 'rejected'))
    or coalesce(auth.role(), '') = 'service_role'
  );

-- Senders can cancel their own pending requests
drop policy if exists "Senders can cancel their connection requests" on public.buddy_connection_requests;
create policy "Senders can cancel their connection requests"
  on public.buddy_connection_requests for update
  using (auth.uid() = sender_id or coalesce(auth.role(), '') = 'service_role')
  with check (
    (auth.uid() = sender_id and status = 'cancelled')
    or coalesce(auth.role(), '') = 'service_role'
  );

-- Senders can delete their cancelled connection requests
drop policy if exists "Senders can delete connection requests" on public.buddy_connection_requests;
create policy "Senders can delete connection requests"
  on public.buddy_connection_requests for delete
  using (
    auth.uid() = sender_id
    or coalesce(auth.role(), '') = 'service_role'
  );

-- ==============================================================================
-- PRIVACY-SAFE ATTENDEE DISCOVERY RPC
-- ==============================================================================

-- Returns public attendee info with ZERO exposure of email, phone, or private credentials
create or replace function public.get_event_buddy_attendees(p_event_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  interests text[],
  status text,
  registered_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  select
    p.id as user_id,
    coalesce(p.display_name, p.full_name) as display_name,
    p.avatar_url,
    p.bio,
    coalesce(p.interests, '{}'::text[]) as interests,
    r.status,
    r.created_at as registered_at
  from public.event_rsvps r
  join public.profiles p on p.id = r.user_id
  where r.event_id = p_event_id
    and r.status = 'active';
end;
$$;

grant execute on function public.get_event_buddy_attendees(uuid) to anon, authenticated;

-- ==============================================================================
-- DEMONSTRATION SEED FOR EVENT CIRCLES (IDEMPOTENT & MATCHED TO SEED EVENTS)
-- ==============================================================================

insert into public.event_circles (
  id,
  event_id,
  category_id,
  name,
  tagline,
  description,
  cover_image_url,
  meeting_point,
  rules_and_vibe,
  member_count,
  is_official,
  is_demo
) values
(
  'c1111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  'Workshops',
  'Bandra Creative Coders & Builders',
  'Collaborative design engineers, typographers & open-source devs.',
  'A vibrant community circle meeting at Ranwar Village for typography, creative code experiments, and weekend build jams.',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
  'Ranwar Village Square near the mural wall, 15 mins before workshop start',
  'Inclusive, curious, hands-on. Bring your laptop and your favorite sketch notebook.',
  18,
  true,
  true
),
(
  'c1111111-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000001',
  'Music',
  'Mumbai Underground Beats Circle',
  'Modular synth builders, analog sound designers & vinyl hunters.',
  'Connect with fellow electronic music producers and audiophiles attending the BKC Warehouse live listening session.',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
  'Main acoustic entrance lobby near the vinyl display',
  'Respect the artists, no flash photography during sets, open sharing of sound design techniques.',
  24,
  true,
  true
),
(
  'c1111111-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000003',
  'Comedy',
  'Bandra Standup & Improv Crew',
  'Comedy writers, open-mic fans, and weekend laugh seekers.',
  'The premier circle for comedy enthusiasts gathering at Bandra West for intimate stand-up testing sessions.',
  'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
  'Courtyard coffee counter at Pali Hill Cultural Center',
  'Positive energy, constructive feedback for new sets, support the local venue.',
  15,
  true,
  true
),
(
  'c1111111-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000006',
  'College',
  'Powai AI & Founder Fellowship',
  'Founders, researchers, and engineers building practical AI.',
  'A focused circle for attendees of the IIT Bombay Technovation Forum. Discuss agentic systems, PostGIS integrations, and hackathon prototypes.',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800',
  'IIT Bombay Main Foyer beside the Innovation Showcase board',
  'High agency, intellectual honesty, zero pitch deck spam.',
  32,
  true,
  true
),
(
  'c1111111-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000007',
  'Sports',
  'Mumbai Sea Face Night Striders',
  'Recreational runners, pace-setters & evening fitness lovers.',
  'Join the Worli Sea Face community circle for group warmup, 5K pace tracking, and post-run electrolyte socials.',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800',
  'Worli Dairy Promenade milestone 2',
  'Leave no runner behind, reflective bands encouraged, hydrate responsibly.',
  28,
  true,
  true
)
on conflict (id) do update set
  event_id = excluded.event_id,
  category_id = excluded.category_id,
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  cover_image_url = excluded.cover_image_url,
  meeting_point = excluded.meeting_point,
  rules_and_vibe = excluded.rules_and_vibe,
  member_count = excluded.member_count,
  is_official = excluded.is_official,
  is_demo = excluded.is_demo
where public.event_circles.is_demo = true;

commit;

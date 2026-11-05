-- ==============================================================================
-- Seed Script: supabase/seed.sql
-- Project: Social Buddy (Phase 4 City Pulse Product Sprint)
-- Target: Supabase (PostgreSQL 15+ with PostGIS)
-- Description: Comprehensive, dense Maharashtra demonstration dataset covering:
--              1. Mumbai (Bandra, BKC, South Mumbai, Worli, Lower Parel, Powai, Juhu, Andheri, Borivali, Colaba)
--              2. Thane (Talao Pali, Viviana Hub, Upvan Lake)
--              3. Navi Mumbai (Vashi, Kharghar, Nerul/Belapur)
--              4. Mira-Bhayandar (Mira Road, Bhayandar West)
--              5. Pune (Koregaon Park, Hinjewadi, Shivajinagar, Kalyani Nagar)
--              6. Nashik (Sula Valley, Anjaneri)
--              7. Nagpur (Futala Lake, VNIT Campus)
--
-- All records are explicitly designated as demonstration samples:
--   moderation_status = 'demo', verification_status = 'demo_sample', is_demo = true
-- To ensure transparent data provenance without fabricating verified real-world events.
-- ==============================================================================

begin;

-- ==============================================================================
-- 0. COMPATIBILITY & SECURITY GUARDS
-- Ensure guard_event_moderation_fields recognizes direct database administrator
-- sessions (session_user in ('postgres', 'supabase_admin')) so seeding operates
-- safely without bypassing security for ordinary clients.
-- ==============================================================================

create or replace function public.guard_event_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  privileged_actor boolean;
begin
  privileged_actor :=
    coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('moderator', 'admin')
    );

  if tg_op = 'INSERT' then
    if not privileged_actor and (
      new.moderation_status <> 'pending'
      or new.verification_status <> 'unverified'
      or new.is_featured
      or new.is_trending
      or new.is_demo
      or new.moderated_by is not null
      or new.moderated_at is not null
      or new.rejection_reason is not null
    ) then
      raise exception 'Submitted events must remain pending and unverified'
        using errcode = '42501';
    end if;
  elsif not privileged_actor and (
    new.moderation_status is distinct from old.moderation_status
    or new.verification_status is distinct from old.verification_status
    or new.is_featured is distinct from old.is_featured
    or new.is_trending is distinct from old.is_trending
    or new.is_demo is distinct from old.is_demo
    or new.moderated_by is not null
    or new.moderated_at is not null
    or new.rejection_reason is not null
  ) then
    raise exception 'Only a moderator or administrator can change moderation fields'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ==============================================================================
-- 1. SEED DEMONSTRATION ORGANIZERS (MAHARASHTRA HUBS)
-- ==============================================================================

insert into public.organizers (id, name, slug, avatar_url, bio, verification_tier, is_demo)
values
  ('11111111-0000-0000-0000-000000000001', 'Bayline Acoustic Collective', 'bayline-acoustic', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120', 'Curators of coastal indie acoustic sessions and sunset music in Mumbai.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000002', 'Mumbai Tech Guild', 'mumbai-tech-guild', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=120', 'Active developer community building AI agents, cloud APIs and web software in BKC.', 'partner_verified', true),
  ('11111111-0000-0000-0000-000000000003', 'Suburban Comedy Lab', 'suburban-comedy', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=120', 'Spotlighting emerging stand-up comics and improv writers across Bandra and Juhu.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000004', 'Horizon Sound Project', 'horizon-sound', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120', 'Audiovisual producers crafting synthwave and electronic art installations.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000005', 'Bombay Heritage Walkers', 'bombay-heritage', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=120', 'Passionate urban historians leading architecture walks through South Mumbai and Kala Ghoda.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000006', 'IITB Innovation Council', 'iitb-innovation', 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120', 'Student-led engineering council hosting hackathons and robotics symposiums in Powai.', 'official_institution', true),
  ('11111111-0000-0000-0000-000000000007', 'Thane Collective Hub', 'thane-collective', 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=120', 'Grassroots collective organizing open-air lake markets, busking and tech meetups in Thane.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000008', 'Navi Mumbai Waterfront Club', 'navi-mumbai-waterfront', 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120', 'Fitness, cycling and outdoor sports enthusiasts along Palm Beach Road.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000009', 'Pune Indie Circuit', 'pune-indie-circuit', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=120', 'Independent music network connecting bands and live jazz across Koregaon Park.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000010', 'Nagpur Cultural Circle', 'nagpur-cultural', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=120', 'Promoting community arts, lakeside concerts and youth hackathons in Central India.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000011', 'Borivali Trail Walkers', 'borivali-trails', 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=120', 'Community guides leading forest trails and sunrise treks in Sanjay Gandhi National Park.', 'community_vouched', true),
  ('11111111-0000-0000-0000-000000000012', 'Andheri Film & Creator Guild', 'andheri-creators', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=120', 'Writers, indie filmmakers, and digital artists across Lokhandwala and Versova.', 'community_vouched', true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  verification_tier = excluded.verification_tier,
  is_demo = excluded.is_demo
where public.organizers.is_demo = true;

-- ==============================================================================
-- 2. SEED DEMONSTRATION EVENTS (MAHARASHTRA STATEWIDE - 30 EVENTS)
-- ==============================================================================

insert into public.events (
  id, title, tagline, description, category_id,
  start_time, end_time, timezone, venue_name, address,
  location, image_url, price_display, is_free,
  organizer_id, moderation_status, verification_status,
  is_featured, is_trending, is_demo
) values
  (
    '22222222-0000-0000-0000-000000000001',
    'Echoes by the Bay: Sunset Acoustic Sessions',
    'Intimate acoustic indie sets overlooking the Arabian Sea',
    'Experience an enchanting open-air evening with local indie singer-songwriters against the backdrop of the Bandstand sunset. Bring your friends, sit on the sea steps, and unwind.',
    'Music',
    now() + interval '3 hours',
    now() + interval '7 hours',
    'Asia/Kolkata',
    'Bandstand Amphitheatre',
    'BJ Road, Bandstand Promenade, Bandra West, Mumbai',
    st_point(72.8194, 19.0435)::geography,
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000001',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    'BKC AI & Spatial Tech Sprint',
    '48-hour collaborative build sprint for AI agent developers',
    'Join 100+ engineers, creators, and UI designers building interactive map apps, geospatial agents, and generative workflows. Mentorship, lightning talks, and developer showcases included.',
    'Workshops',
    now() + interval '1 day',
    now() + interval '1 day 8 hours',
    'Asia/Kolkata',
    'WeWork Enam Sambhav, BKC',
    'G Block, Bandra Kurla Complex, Mumbai',
    st_point(72.8682, 19.0664)::geography,
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000002',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    'Late Night Laughs: Bandra Comedy Club',
    'Unfiltered stand-up comedy showcase with top Mumbai comics',
    'An electric comedy showcase featuring 5 premier Mumbai stand-up artists testing brand-new material in an intimate subterranean room.',
    'Comedy',
    now() + interval '5 hours',
    now() + interval '7 hours 30 minutes',
    'Asia/Kolkata',
    'That Comedy Club Bandra',
    'Pali Hill, 14th Road, Bandra West, Mumbai',
    st_point(72.8315, 19.0628)::geography,
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
    '₹399',
    false,
    '11111111-0000-0000-0000-000000000003',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    'Neon Horizon: Rooftop Audiovisual Showcase',
    'Underground synthwave, melodic techno & laser installation',
    'Breathtaking panoramic views of the Mumbai skyline paired with kinetic laser sculptures and live electronic synthesizers.',
    'Parties',
    now() + interval '6 hours',
    now() + interval '11 hours',
    'Asia/Kolkata',
    'AER Rooftop Lounge',
    '1/136, Dr E Moses Rd, Worli, Mumbai',
    st_point(72.8222, 18.995)::geography,
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&auto=format&fit=crop&q=80',
    '₹799',
    false,
    '11111111-0000-0000-0000-000000000004',
    'demo',
    'demo_sample',
    true,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    'Kala Ghoda Art & Photowalk',
    'Guided architectural heritage walk and street photography',
    'Explore South Mumbai Victorian Gothic and Indo-Saracenic landmarks with visual artists and heritage storytellers. Open to photographers and sketchers of all levels.',
    'Meetups',
    now() + interval '1 day 2 hours',
    now() + interval '1 day 5 hours',
    'Asia/Kolkata',
    'Kala Ghoda Heritage Precinct',
    'K. Dubash Marg, Fort, South Mumbai',
    st_point(72.8324, 18.9275)::geography,
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000005',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000006',
    'Techfest Vanguard: Robotics & AI Hack',
    'Annual inter-college engineering challenge and innovation expo',
    'Student teams from top Maharashtra universities demonstrate autonomous rovers, drone swarms, and edge ML prototypes.',
    'College',
    now() + interval '2 days',
    now() + interval '2 days 8 hours',
    'Asia/Kolkata',
    'IIT Bombay Campus Grounds',
    'Main Gate Rd, Powai, Mumbai',
    st_point(72.9133, 19.1334)::geography,
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000006',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000007',
    'Marine Drive Sunrise 10K & Stride',
    'Early morning coastal run along Queen''s Necklace',
    'Kick off your weekend with an invigorating morning run along the Arabian Sea. Hydration stations and community cool-down at Nariman Point.',
    'Sports',
    now() + interval '1 day 12 hours',
    now() + interval '1 day 15 hours',
    'Asia/Kolkata',
    'Marine Drive Promenade',
    'Netaji Subhash Chandra Bose Rd, Churchgate, Mumbai',
    st_point(72.8228, 18.9322)::geography,
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000008',
    'Talao Pali Indie Flea & Sunset Market',
    'Artisanal crafts, live acoustic busking & local pop-ups',
    'Browse handcrafted pottery, regional food stalls, and acoustic performances around historic Talao Pali lake.',
    'Meetups',
    now() + interval '1 day 4 hours',
    now() + interval '1 day 9 hours',
    'Asia/Kolkata',
    'Talao Pali Promenade',
    'Jambli Naka, Thane West, Thane',
    st_point(72.9735, 19.1912)::geography,
    'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000007',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000009',
    'Ghodbunder Cloud & Mobile Dev Meetup',
    'Hands-on React Native & full-stack architecture deep dive',
    'A practical technical session featuring reactive UI architecture, edge caching, and scalable mobile state patterns for software builders.',
    'Workshops',
    now() + interval '2 days 3 hours',
    now() + interval '2 days 7 hours',
    'Asia/Kolkata',
    'Viviana Tech Arena',
    'Eastern Express Highway, Laxmi Nagar, Thane',
    st_point(72.9718, 19.2088)::geography,
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000007',
    'demo',
    'demo_sample',
    false,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000010',
    'Palm Beach Coastal Cycling Circuit',
    'Scenic 25K weekend cycling ride along Palm Beach waterfront',
    'A community social ride along the tree-lined Palm Beach corridor with marshland views, pace leaders, and breakfast meetup.',
    'Sports',
    now() + interval '1 day 11 hours',
    now() + interval '1 day 14 hours',
    'Asia/Kolkata',
    'Palm Beach Waterfront Plaza',
    'Sector 19A, Vashi, Navi Mumbai',
    st_point(72.998, 19.0762)::geography,
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000011',
    'Kharghar Amphitheatre Indie Jam',
    'Open-air indie fusion and rock band battle',
    'Seven collegiate and independent bands battle it out on stage amidst the lush backdrop of Kharghar hills and waterfalls.',
    'Music',
    now() + interval '2 days 4 hours',
    now() + interval '2 days 9 hours',
    'Asia/Kolkata',
    'Central Park Amphitheatre',
    'Sector 23, Kharghar, Navi Mumbai',
    st_point(73.0675, 19.0435)::geography,
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000012',
    'Mira Road Standup & Improv Night',
    'Hilarious evening of experimental comedy and crowd games',
    'Fast-paced improv sketches and punchy stand-up sets in North Mumbai premier community performance space.',
    'Comedy',
    now() + interval '1 day 6 hours',
    now() + interval '1 day 8 hours',
    'Asia/Kolkata',
    'The Studio Theatre Mira Road',
    'Kanakia Park, Mira Road East, Mira Bhayandar',
    st_point(72.871, 19.2818)::geography,
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
    '₹249',
    false,
    '11111111-0000-0000-0000-000000000003',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000013',
    'Koregaon Park Backyard Jazz & Blues',
    'Atmospheric open-garden jazz quartet and vinyl exchange',
    'Soothing live brass, upright bass, and blues rhythms beneath century-old banyan trees in Koregaon Park.',
    'Music',
    now() + interval '1 day 5 hours',
    now() + interval '1 day 9 hours',
    'Asia/Kolkata',
    'High Spirits Garden',
    'North Main Road, Koregaon Park, Pune',
    st_point(73.8942, 18.5365)::geography,
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
    '₹350',
    false,
    '11111111-0000-0000-0000-000000000009',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000014',
    'Hinjewadi Open-Source Builders Hack',
    'Collaborative hack night on distributed systems and AI APIs',
    'Overnight coding session with technical leads from Pune technology parks building resilient microservices and edge pipelines.',
    'Workshops',
    now() + interval '2 days 2 hours',
    now() + interval '2 days 10 hours',
    'Asia/Kolkata',
    'Hinjewadi Tech Park Incubator',
    'Phase 1, Hinjewadi IT Park, Pune',
    st_point(73.7389, 18.5912)::geography,
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000002',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000015',
    'COEP MindSpark: Autonomous Bot Derby',
    'Inter-college robotics arena and hardware prototyping fest',
    'Teams compete in high-stakes robotic navigation challenges, battle-bots, and real-time obstacle evasion courses.',
    'College',
    now() + interval '3 days',
    now() + interval '3 days 8 hours',
    'Asia/Kolkata',
    'College of Engineering Pune Campus',
    'Wellesley Road, Shivajinagar, Pune',
    st_point(73.8567, 18.5302)::geography,
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000006',
    'demo',
    'demo_sample',
    true,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000016',
    'Kalyani Nagar Sunset Rooftop Beats',
    'Deep house and chill electronica with Pune skyline views',
    'Lush open terrace with ambient lighting, artisan mocktails, and live percussion alongside curated electronic sets.',
    'Parties',
    now() + interval '1 day 6 hours',
    now() + interval '1 day 11 hours',
    'Asia/Kolkata',
    'The Rooftop Kalyani Nagar',
    'East Avenue, Kalyani Nagar, Pune',
    st_point(73.9038, 18.5478)::geography,
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&auto=format&fit=crop&q=80',
    '₹499',
    false,
    '11111111-0000-0000-0000-000000000004',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000017',
    'Sula Valley Acoustic Sunsets',
    'Acoustic folk music, grape stomping & sunset picnic',
    'Relax in the scenic rolling vineyards of Nashik with live acoustic guitar and vineyard tours overlooking Gangapur Lake.',
    'Meetups',
    now() + interval '2 days 5 hours',
    now() + interval '2 days 10 hours',
    'Asia/Kolkata',
    'Sula Vineyards Amphitheatre',
    'Govardhan Village, Gangapur-Savargaon Rd, Nashik',
    st_point(73.6885, 20.0055)::geography,
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    '₹599',
    false,
    '11111111-0000-0000-0000-000000000001',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000018',
    'Anjaneri Hills Trail Run & Trek',
    'Challenging 12K mountain trail run through Western Ghats',
    'Traverse ancient stone trails, fog-draped plateaus, and waterfalls with experienced mountain guides.',
    'Sports',
    now() + interval '3 days 1 hour',
    now() + interval '3 days 6 hours',
    'Asia/Kolkata',
    'Anjaneri Basecamp',
    'Trimbak Road, Nashik District',
    st_point(73.5782, 19.9234)::geography,
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000019',
    'Futala Lake Sunset Symphony',
    'Live fusion orchestra and sitar-electronic ambient jam',
    'Nagpur premier lakeside promenade hosts an open musical jam celebrating classical Indian ragas merged with ambient electronica.',
    'Music',
    now() + interval '1 day 5 hours',
    now() + interval '1 day 8 hours',
    'Asia/Kolkata',
    'Futala Lake Promenade',
    'Vayusena Nagar, West Nagpur, Nagpur',
    st_point(79.0522, 21.1528)::geography,
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000010',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000020',
    'VNIT Aarohi: Open AI Hack Challenge',
    'Central India flagship youth tech fest and AI sprint',
    'Collegiate hackathon challenging student engineers to build social apps, accessibility devices, and generative tools.',
    'College',
    now() + interval '2 days 3 hours',
    now() + interval '2 days 9 hours',
    'Asia/Kolkata',
    'VNIT Auditorium & Grounds',
    'South Ambazari Road, Nagpur',
    st_point(79.051, 21.1245)::geography,
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000010',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000021',
    'Kanheri Caves Sunrise Mountain Trek',
    'Scenic forest ridge hike to ancient Buddhist rock-cut caves',
    'Wake up early for a guided nature trek through the green lungs of Mumbai. Experience panoramic city views from the Kanheri cliff summit with experienced naturalists.',
    'Sports',
    now() + interval '1 day 10 hours',
    now() + interval '1 day 14 hours',
    'Asia/Kolkata',
    'SGNP Main Gate & Trailhead',
    'Western Express Highway, Borivali East, Mumbai',
    st_point(72.909, 19.2288)::geography,
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1000&auto=format&fit=crop&q=80',
    '₹150',
    false,
    '11111111-0000-0000-0000-000000000011',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000022',
    'Lokhandwala Creators & Indie Film Circle',
    'Casual roundtable for writers, cinematographers & media builders',
    'An open networking evening for indie content creators, screenwriters, and video producers. Pitch ideas, find crew collaborators, and swap production stories over artisanal chai.',
    'Meetups',
    now() + interval '1 day 3 hours',
    now() + interval '1 day 7 hours',
    'Asia/Kolkata',
    'Versova Social Workstation',
    'Lokhandwala Complex, Andheri West, Mumbai',
    st_point(72.8285, 19.1415)::geography,
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000012',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000023',
    'Juhu Shoreline Sunset Acoustic Circle',
    'Golden hour guitar loops and indie vocals by the sea',
    'Sit in the beach breeze as acoustic artists and cajon percussionists play golden-hour covers and original soul music. Bring a mat and enjoy the sunset.',
    'Music',
    now() + interval '4 hours',
    now() + interval '8 hours',
    'Asia/Kolkata',
    'Juhu Tara Waterfront',
    'Juhu Tara Road, Juhu Beach, Mumbai',
    st_point(72.826, 19.0988)::geography,
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000001',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000024',
    'Bandra Typography & Urban Mural Jam',
    'Hands-on street typography and spray mural workshop',
    'Learn letterform aesthetics, stencil techniques, and mural wall composition with celebrated Mumbai graffiti writers in historic Ranwar Village.',
    'Workshops',
    now() + interval '1 day 5 hours',
    now() + interval '1 day 9 hours',
    'Asia/Kolkata',
    'Ranwar Village Art Loft',
    'Chapel Road, Ranwar, Bandra West, Mumbai',
    st_point(72.831, 19.052)::geography,
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    '₹450',
    false,
    '11111111-0000-0000-0000-000000000005',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000025',
    'The Mill Compound Improv Comedy Hour',
    'High-octane unscripted comedy, games and crowd roasts',
    'No scripts, no filters! A lightning-fast team of improv comedians craft hilarious sketches on the fly based entirely on audience suggestions.',
    'Comedy',
    now() + interval '7 hours',
    now() + interval '9 hours 30 minutes',
    'Asia/Kolkata',
    'The Mill Stage at Todi Mills',
    'Mathuradas Mill Compound, Senapati Bapat Marg, Lower Parel, Mumbai',
    st_point(72.8245, 18.9925)::geography,
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
    '₹499',
    false,
    '11111111-0000-0000-0000-000000000003',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000026',
    'Powai AI Founders & Systems Architecture',
    'Deep dive into local LLMs, edge inference and real-time state',
    'A focused architecture session with lead engineers and venture founders building agentic apps and distributed pipelines in Powai.',
    'Workshops',
    now() + interval '2 days 1 hour',
    now() + interval '2 days 6 hours',
    'Asia/Kolkata',
    'Hiranandani Tech Pavilion',
    'Central Avenue, Hiranandani Gardens, Powai, Mumbai',
    st_point(72.91, 19.117)::geography,
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000002',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000027',
    'Colaba Art Deco & Architectural Heritage Walk',
    'Historical discovery of Mumbai iconic 1930s Art Deco oceanfront',
    'Walk past the world second-largest collection of Art Deco residential buildings along the Arabian Sea waterfront. Led by architectural conservationists.',
    'Meetups',
    now() + interval '1 day 1 hour',
    now() + interval '1 day 4 hours',
    'Asia/Kolkata',
    'Regal Circle Precinct',
    'Colaba Causeway, Apollo Bandar, South Mumbai',
    st_point(72.829, 18.915)::geography,
    'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000005',
    'demo',
    'demo_sample',
    false,
    false,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000028',
    'Upvan Lakeside Sunset Jazz & Flute Ensemble',
    'Hypnotic Indian classical flute meets contemporary jazz rhythms',
    'Set against the tranquil waters of Upvan Lake beneath the Yeoor Hills. Bring blankets, warm chai, and experience mesmerizing open-air acoustics.',
    'Music',
    now() + interval '2 days 5 hours',
    now() + interval '2 days 9 hours',
    'Asia/Kolkata',
    'Upvan Lake Amphitheatre',
    'Upvan Lake Road, Pokhran 2, Thane West, Thane',
    st_point(72.965, 19.222)::geography,
    'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000007',
    'demo',
    'demo_sample',
    true,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000029',
    'Navi Mumbai Collegiate Design Sprint',
    'Inter-university UI/UX design & accessibility sprint',
    'Student designers craft accessible, inclusive digital experiences under the mentorship of top Mumbai product design leads.',
    'College',
    now() + interval '1 day 4 hours',
    now() + interval '1 day 10 hours',
    'Asia/Kolkata',
    'DY Patil University Campus',
    'Sector 7, Nerul, Navi Mumbai',
    st_point(73.025, 19.035)::geography,
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    true,
    true
  ),
  (
    '22222222-0000-0000-0000-000000000030',
    'Bhayandar Coastal Cycling & Dawn Stride',
    'Coastal sunrise bicycle ride with ocean breeze and marsh views',
    'Fast-rolling social cycling loop along the scenic Uttan-Bhayandar coastal fringe. Suitable for road bikes, hybrids, and fitness enthusiasts.',
    'Sports',
    now() + interval '2 days 11 hours',
    now() + interval '2 days 14 hours',
    'Asia/Kolkata',
    'Maxus Mall Waterfront Plaza',
    'Temba Hospital Rd, Bhayandar West, Mira-Bhayandar',
    st_point(72.845, 19.301)::geography,
    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=1000&auto=format&fit=crop&q=80',
    'Free',
    true,
    '11111111-0000-0000-0000-000000000008',
    'demo',
    'demo_sample',
    false,
    true,
    true
  )
on conflict (id) do update set
  title = excluded.title,
  tagline = excluded.tagline,
  description = excluded.description,
  category_id = excluded.category_id,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  venue_name = excluded.venue_name,
  address = excluded.address,
  location = excluded.location,
  image_url = excluded.image_url,
  price_display = excluded.price_display,
  is_free = excluded.is_free,
  moderation_status = excluded.moderation_status,
  verification_status = excluded.verification_status,
  is_demo = excluded.is_demo
where public.events.is_demo = true;

commit;

-- ==============================================================================
-- Migration: 20261024000004_realtime_publication.sql
-- Project: Social Buddy (VecnaVerse Hackathon)
-- Target: Supabase (PostgreSQL 15+)
-- Description: Enable Realtime replication and full replica identity for public.events
-- ==============================================================================

begin;

-- 1. Full replica identity allows Supabase Realtime to broadcast complete
-- old and new records on UPDATE and DELETE payloads to client listeners.
alter table public.events replica identity full;

-- 2. Add public.events to the default supabase_realtime publication
alter publication supabase_realtime add table public.events;

commit;


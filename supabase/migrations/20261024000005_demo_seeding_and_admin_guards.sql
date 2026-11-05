-- ==============================================================================
-- Migration: 20261024000005_demo_seeding_and_admin_guards.sql
-- Project: Social Buddy (Phase 4 Security & Seeding Compatibility)
-- Description:
--   Enables direct database administrator sessions (SQL Editor, psql, migrations
--   running as postgres or supabase_admin) to perform controlled operations such
--   as seeding demonstration datasets without being blocked by client-facing triggers.
--   Preserves all existing security invariants:
--   - Ordinary users (connecting via PostgREST / anon / authenticated roles)
--     CANNOT self-approve events or create demo records.
--   - Real user-submitted events remain strictly pending and unverified.
--   - Demonstrations records are explicitly scoped to moderation_status = 'demo'.
-- ==============================================================================

begin;

-- 1. GUARD PROFILES ROLE CHANGE
-- Allow service_role AND direct database administrator sessions (postgres/supabase_admin)
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin')
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'admin'
     )
  then
    raise exception 'Only an administrator can change profile roles'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 2. GUARD ORGANIZER VERIFICATION
-- Allow service_role AND direct database administrator sessions (postgres/supabase_admin)
create or replace function public.guard_organizer_verification()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (
    new.verification_tier is distinct from old.verification_tier
    or new.verification_evidence is distinct from old.verification_evidence
    or new.verified_by is distinct from old.verified_by
    or new.verified_at is distinct from old.verified_at
  )
  and coalesce(auth.role(), '') <> 'service_role'
  and session_user not in ('postgres', 'supabase_admin')
  and not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('moderator', 'admin')
  )
  then
    raise exception 'Only a moderator or administrator can change organizer verification'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 3. GUARD EVENT MODERATION FIELDS
-- Allow service_role, direct database administrator sessions (postgres/supabase_admin),
-- and in-app moderators/admins. Ordinary clients remain strictly prevented from
-- self-approving, bypassing pending moderation, or setting demo flags.
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

commit;


-- ==============================================================================
-- Migration: 20261024000008_fix_messaging_rls_recursion_patch.sql
-- Project: Social Buddy (Production Patch: Real-Time Private Messaging RLS)
-- Target: Supabase production project (zrbrsfxsumlwgaxkaecr)
-- Description:
--   1. Transactionally purges ALL existing policies on conversations,
--      conversation_members, and messages via a dynamic DO block querying
--      pg_catalog.pg_policies before touching function signatures.
--   2. Prevents PostgreSQL dependency errors and guarantees no legacy permissive
--      policies survive to combine with OR.
--   3. Safely drops legacy function overloads (e.g. 2-argument is_conversation_member).
--   4. Installs single-argument public.is_conversation_member(p_conv_id uuid)
--      which strictly inspects auth.uid() internally, preventing arbitrary probing.
--   5. Installs public.can_enroll_conversation_member(p_conv_id uuid, p_user_id uuid)
--      to safely authorize creator-based member enrollment without circular RLS deadlocks
--      or insecure time windows.
--   6. Hardens all SECURITY DEFINER functions with search_path = pg_catalog, pg_temp,
--      schema-qualified (select auth.uid()), fully qualified application table references,
--      and restricts EXECUTE privileges to authenticated and service_role.
--   7. Ensures public.conversations has created_by column and trigger to anchor ownership.
--   8. Recreates only the strictly scoped RLS policies on the three relations.
--   9. Configures REPLICA IDENTITY FULL and idempotently registers public.messages
--      in the supabase_realtime publication.
--  10. Provides a verification query to audit all active policies on the three tables.
-- ==============================================================================

begin;

-- ==============================================================================
-- STEP 1: DYNAMICALLY DROP ALL POLICIES ON MESSAGING TABLES FIRST
-- ==============================================================================
-- Queries pg_catalog.pg_policies to dynamically drop EVERY existing policy on
-- public.conversations, public.conversation_members, and public.messages.
-- This ensures:
--   a) No PostgreSQL 2BP01 dependency errors occur when functions are dropped in Step 2.
--   b) No intermediate or legacy permissive policies survive to bypass security via OR.
--   c) Policies on unrelated tables (profiles, events, etc.) are left untouched.

do $$
declare
  pol record;
begin
  for pol in (
    select schemaname, tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('conversations', 'conversation_members', 'messages')
  ) loop
    execute format('drop policy if exists %I on %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- ==============================================================================
-- STEP 2: DROP LEGACY HELPER FUNCTION SIGNATURES
-- ==============================================================================
-- With all referencing policies dropped dynamically, drop obsolete function overloads.
drop function if exists public.is_conversation_member(uuid, uuid);
drop function if exists public.is_conversation_member(uuid);
drop function if exists public.can_enroll_conversation_member(uuid, uuid);

-- ==============================================================================
-- STEP 3: CONVERSATION OWNERSHIP COLUMN & CREATOR TRIGGER
-- ==============================================================================

alter table public.conversations
  add column if not exists created_by uuid references auth.users(id) on delete set null default auth.uid();

-- Backfill legacy records if created_by is null from earliest conversation member
update public.conversations c
set created_by = (
  select cm.user_id
  from public.conversation_members cm
  where cm.conversation_id = c.id
  order by cm.joined_at asc
  limit 1
)
where c.created_by is null;

-- Trigger ensuring created_by is reliably populated with auth.uid() on insert
create or replace function public.handle_conversation_creator()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  if new.created_by is null or new.created_by <> (select auth.uid()) then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_set_conversation_creator on public.conversations;
create trigger trigger_set_conversation_creator
  before insert on public.conversations
  for each row execute function public.handle_conversation_creator();

-- ==============================================================================
-- STEP 4: RECREATE HARDENED SECURITY DEFINER HELPERS
-- ==============================================================================

-- 4A. Single-argument membership helper (strictly checks auth.uid(), prevents arbitrary probing)
create or replace function public.is_conversation_member(p_conv_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, pg_temp
stable
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = p_conv_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated, service_role;

-- 4B. Enrollment authorization helper (breaks circular RLS dependency without insecure time window)
-- Validates that the caller is the conversation creator AND is enrolling either
-- themselves or an attendee with a verified mutual accepted connection.
create or replace function public.can_enroll_conversation_member(p_conv_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, pg_temp
stable
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conv_id
      and c.created_by = (select auth.uid())
      and (
        p_user_id = (select auth.uid())
        or exists (
          select 1
          from public.buddy_connection_requests bcr
          where (
            (bcr.sender_id = (select auth.uid()) and bcr.receiver_id = p_user_id)
            or (bcr.receiver_id = (select auth.uid()) and bcr.sender_id = p_user_id)
          )
          and bcr.status = 'accepted'
        )
      )
  );
$$;

revoke all on function public.can_enroll_conversation_member(uuid, uuid) from public, anon;
grant execute on function public.can_enroll_conversation_member(uuid, uuid) to authenticated, service_role;

-- ==============================================================================
-- STEP 5: RECREATE INTENDED ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- Ensure RLS is active on all relations
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- ------------------------------------------------------------------------------
-- 5A. CONVERSATIONS POLICIES
-- ------------------------------------------------------------------------------
-- SELECT: Creator can always view (enables immediate .insert().select('id'));
--         confirmed members can view. Non-members/strangers get zero rows.
-- INSERT: Authenticated users can create conversations for themselves.

create policy "Members can view their own conversations"
  on public.conversations for select
  using (
    (
      auth.role() = 'authenticated'
      and (
        created_by = (select auth.uid())
        or public.is_conversation_member(id)
      )
    )
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert
  with check (
    (
      auth.role() = 'authenticated'
      and (created_by is null or created_by = (select auth.uid()))
    )
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- ------------------------------------------------------------------------------
-- 5B. CONVERSATION MEMBERS POLICIES
-- ------------------------------------------------------------------------------
-- SELECT: Users can only see members of conversations they belong to.
-- INSERT: Strictly governed by can_enroll_conversation_member (creator only, self or accepted buddy).
-- DELETE: Users can leave by deleting their own membership row.

create policy "Members can view conversation members"
  on public.conversation_members for select
  using (
    (
      auth.role() = 'authenticated'
      and (
        user_id = (select auth.uid())
        or public.is_conversation_member(conversation_id)
      )
    )
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

create policy "Creators can add self and accepted connection to conversation"
  on public.conversation_members for insert
  with check (
    coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
    or (
      auth.role() = 'authenticated'
      and public.can_enroll_conversation_member(conversation_id, user_id)
    )
  );

create policy "Members can remove themselves from conversations"
  on public.conversation_members for delete
  using (
    (auth.role() = 'authenticated' and user_id = (select auth.uid()))
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- ------------------------------------------------------------------------------
-- 5C. MESSAGES POLICIES
-- ------------------------------------------------------------------------------
-- SELECT: Only confirmed conversation members can read messages.
-- INSERT: Sender identity strictly enforced (sender_id = auth.uid()) AND caller
--         must be a confirmed conversation member.

create policy "Members can view messages"
  on public.messages for select
  using (
    (auth.role() = 'authenticated' and public.is_conversation_member(conversation_id))
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

create policy "Members can send messages as themselves"
  on public.messages for insert
  with check (
    auth.role() = 'authenticated'
    and sender_id = (select auth.uid())
    and (
      public.is_conversation_member(conversation_id)
      or coalesce(auth.role(), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin')
    )
  );

-- ==============================================================================
-- STEP 6: REALTIME REPLICATION FOR MESSAGES (IDEMPOTENT)
-- ==============================================================================

alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;

-- ==============================================================================
-- POST-MIGRATION VERIFICATION AUDIT QUERY
-- ==============================================================================
-- Execute this query immediately after migration to inspect the resulting policies.
-- Expected output: Exactly 7 policies total (2 on conversations, 3 on conversation_members, 2 on messages).
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('conversations', 'conversation_members', 'messages')
order by tablename, cmd, policyname;

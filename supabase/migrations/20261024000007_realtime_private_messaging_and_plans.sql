-- ==============================================================================
-- Migration: 20261024000007_realtime_private_messaging_and_plans.sql
-- Project: Social Buddy (Buddy Match 2.0: Private Messaging & Event Planning)
-- Description:
--   1. Creates public.conversations and public.conversation_members.
--   2. Creates public.messages with support for text and rich event_plan messages.
--   3. Enables Row Level Security (RLS) guaranteeing strict member-only visibility.
--   4. Uses a security definer helper to eliminate policy recursion on conversation_members.
--   5. Registers public.messages in supabase_realtime publication for instant delivery.
-- ==============================================================================

begin;

-- 1. CONVERSATIONS TABLE
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. CONVERSATION MEMBERS TABLE
create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

-- 3. MESSAGES TABLE
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) >= 1 and char_length(content) <= 2000),
  message_type text not null default 'text' check (message_type in ('text', 'event_plan', 'system')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

-- ==============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ==============================================================================

create index if not exists idx_conversation_members_user on public.conversation_members(user_id);
create index if not exists idx_conversation_members_conv on public.conversation_members(conversation_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender on public.messages(sender_id);

-- ==============================================================================
-- UPDATED_AT TRIGGER
-- ==============================================================================

drop trigger if exists trigger_conversations_updated_at on public.conversations;
create trigger trigger_conversations_updated_at
  before update on public.conversations
  for each row execute function public.handle_updated_at();

-- ==============================================================================
-- NON-RECURSIVE SECURITY DEFINER MEMBERSHIP HELPER
-- ==============================================================================

create or replace function public.is_conversation_member(p_conv_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, pg_temp
stable
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conv_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated, service_role;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- CONVERSATIONS: Only members of a conversation can see it
drop policy if exists "Members can view their own conversations" on public.conversations;
create policy "Members can view their own conversations"
  on public.conversations for select
  using (
    (auth.role() = 'authenticated' and public.is_conversation_member(id))
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- Authenticated users or administrators can create conversations
drop policy if exists "Authenticated users can create conversations" on public.conversations;
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

-- CONVERSATION MEMBERS:
-- A user can see members of conversations they belong to
drop policy if exists "Members can view conversation members" on public.conversation_members;
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

-- Enrolling members requires creator check and an accepted connection
drop policy if exists "Users or service role can add members" on public.conversation_members;
drop policy if exists "Users can add members to conversations" on public.conversation_members;
drop policy if exists "Creators can add self and accepted connection to conversation" on public.conversation_members;
create policy "Creators can add self and accepted connection to conversation"
  on public.conversation_members for insert
  with check (
    coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
    or (
      auth.role() = 'authenticated'
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_members.conversation_id
          and c.created_by = (select auth.uid())
      )
      and (
        user_id = (select auth.uid())
        or exists (
          select 1 from public.buddy_connection_requests bcr
          where (
            (bcr.sender_id = (select auth.uid()) and bcr.receiver_id = user_id)
            or (bcr.receiver_id = (select auth.uid()) and bcr.sender_id = user_id)
          )
          and bcr.status = 'accepted'
        )
      )
    )
  );

drop policy if exists "Members can remove themselves from conversations" on public.conversation_members;
create policy "Members can remove themselves from conversations"
  on public.conversation_members for delete
  using (
    (auth.role() = 'authenticated' and auth.uid() = user_id)
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- MESSAGES:
-- Only conversation members can view messages
drop policy if exists "Members can view messages" on public.messages;
create policy "Members can view messages"
  on public.messages for select
  using (
    (auth.role() = 'authenticated' and public.is_conversation_member(conversation_id))
    or coalesce(auth.role(), '') = 'service_role'
    or session_user in ('postgres', 'supabase_admin')
  );

-- Only authenticated sender who is also a conversation member can post
drop policy if exists "Members can send messages as themselves" on public.messages;
create policy "Members can send messages as themselves"
  on public.messages for insert
  with check (
    auth.role() = 'authenticated'
    and auth.uid() = sender_id
    and (
      public.is_conversation_member(conversation_id)
      or coalesce(auth.role(), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin')
    )
  );

-- ==============================================================================
-- REALTIME REPLICATION FOR MESSAGES
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

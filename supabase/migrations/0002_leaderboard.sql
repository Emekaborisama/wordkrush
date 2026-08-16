-- Global leaderboard.
--
-- ARCHITECTURAL NOTE: this is the first time Supabase becomes a RUNTIME
-- dependency of the app (STACK D-016). D-007 still holds for content — the
-- game data ships bundled and the game is fully playable with no network.
-- The leaderboard is strictly additive: if it is unreachable, the player still
-- plays and still keeps their local scores.
--
-- Apply after 0001_init.sql.

-- Players may be anonymous (Supabase anonymous auth) or signed in. Either way
-- they get a row here, so an anonymous player can later link an account
-- without losing their history.
create table if not exists players (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous'
    check (length(trim(display_name)) between 1 and 24),
  created_at   timestamptz not null default now()
);

create table if not exists leaderboard_entries (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  category_id text not null references categories(id),
  streak      integer not null check (streak >= 0 and streak <= 10000),
  -- The seed + the player's guesses. Because the engine is a pure, seeded
  -- reducer, a server can REPLAY the run from these and confirm the streak is
  -- real. Without this a leaderboard is just "whatever number the client sent".
  seed        bigint not null,
  guesses     text[] not null,
  -- unverified: accepted but not replayed | verified: replay matched
  -- rejected: replay disagreed (kept for abuse analysis, never displayed)
  status      text not null default 'unverified'
    check (status in ('unverified', 'verified', 'rejected')),
  -- Client-generated id, so a retry after a flaky network cannot double-post.
  client_entry_id text not null,
  played_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  unique (player_id, client_entry_id)
);

-- A streak of N needs exactly N correct guesses plus the one that ended the
-- run, so the array length is pinned to the claim. Cheap structural check that
-- rejects the laziest forgeries before any replay work happens.
alter table leaderboard_entries
  add constraint guesses_match_streak check (array_length(guesses, 1) = streak + 1);

create index if not exists idx_leaderboard_top
  on leaderboard_entries (category_id, streak desc, played_at asc)
  where status <> 'rejected';
create index if not exists idx_leaderboard_player on leaderboard_entries (player_id);

-- ---------------------------------------------------------------------------
-- Row Level Security. Without this, the publishable key shipped in the app
-- would let anyone rewrite the entire table.
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table leaderboard_entries enable row level security;

-- Anyone may read the board; only the owner may write their own row.
create policy players_read on players for select using (true);
create policy players_insert_self on players for insert with check (auth.uid() = id);
create policy players_update_self on players for update using (auth.uid() = id);

create policy entries_read on leaderboard_entries
  for select using (status <> 'rejected');
create policy entries_insert_self on leaderboard_entries
  for insert with check (auth.uid() = player_id);

-- Deliberately NO update or delete policy for players: an entry is immutable
-- once written. Editing your own score after the fact is the whole attack.
-- Verification status is changed only by a service-role job.

-- Public view of the board: best run per player, no internal columns exposed.
create or replace view leaderboard_top as
select distinct on (e.player_id)
  e.player_id,
  p.display_name,
  e.category_id,
  e.streak,
  e.played_at,
  e.status
from leaderboard_entries e
join players p on p.id = e.player_id
where e.status <> 'rejected'
order by e.player_id, e.streak desc, e.played_at asc;

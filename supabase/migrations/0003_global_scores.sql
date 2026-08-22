-- Cross-game global leaderboards.
--
-- Local score history remains the offline source of truth. This table receives
-- immutable, idempotent submissions from signed-in players and exposes each
-- player's best result per game. Scores from different games are never mixed:
-- their units and sort directions are not comparable.

create table if not exists global_scores (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references players(id) on delete cascade,
  game_id         text not null
    check (game_id in ('more-or-less', 'clueless', 'wordfall')),
  score           integer not null check (score >= 0 and score <= 1000000000),
  context_id      text not null,
  seed            bigint not null,
  duration_ms     integer check (duration_ms is null or duration_ms >= 0),
  client_entry_id text not null,
  played_at       timestamptz not null,
  created_at      timestamptz not null default now(),
  -- A future trusted replay worker can promote or reject a submission. The UI
  -- can distinguish that state without changing the public row shape.
  status          text not null default 'unverified'
    check (status in ('unverified', 'verified', 'rejected')),
  proof           jsonb,
  unique (player_id, client_entry_id)
);

create index if not exists idx_global_scores_game
  on global_scores (game_id, score, played_at)
  where status <> 'rejected';
create index if not exists idx_global_scores_player
  on global_scores (player_id, game_id);

alter table global_scores enable row level security;

create policy global_scores_read on global_scores
  for select using (status <> 'rejected');
create policy global_scores_insert_self on global_scores
  for insert with check (auth.uid() = player_id);

-- No client update/delete policies: a submitted score is immutable. A trusted
-- service-role verifier is the only actor allowed to change `status`.

create or replace view global_leaderboard
with (security_invoker = true)
as
with player_bests as (
  select
    s.id,
    s.player_id,
    p.display_name,
    s.game_id,
    s.score,
    s.context_id,
    s.duration_ms,
    s.played_at,
    s.status,
    row_number() over (
      partition by s.game_id, s.player_id
      order by
        case when s.game_id = 'clueless' then s.score end asc nulls last,
        case when s.game_id <> 'clueless' then s.score end desc nulls last,
        s.played_at asc
    ) as player_row
  from global_scores s
  join players p on p.id = s.player_id
  where s.status <> 'rejected'
),
ranked as (
  select
    id,
    player_id,
    display_name,
    game_id,
    score,
    context_id,
    duration_ms,
    played_at,
    status,
    rank() over (
      partition by game_id
      order by
        case when game_id = 'clueless' then score end asc nulls last,
        case when game_id <> 'clueless' then score end desc nulls last,
        played_at asc
    ) as global_rank
  from player_bests
  where player_row = 1
)
select * from ranked;

grant select on global_scores to anon, authenticated;
grant insert on global_scores to authenticated;
grant select on global_leaderboard to anon, authenticated;

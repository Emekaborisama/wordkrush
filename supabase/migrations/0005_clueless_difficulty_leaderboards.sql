-- Split Clueless ranks by difficulty while preserving one stable game id.

update global_scores
set context_id = 'standard'
where game_id = 'clueless' and context_id = 'clueless';

create or replace view global_leaderboard
with (security_invoker = true)
as
with contextual_scores as (
  select
    s.*,
    case when s.game_id = 'clueless' then s.context_id else '' end as board_context
  from global_scores s
  where s.status <> 'rejected'
),
player_bests as (
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
    s.board_context,
    row_number() over (
      partition by s.game_id, s.board_context, s.player_id
      order by
        case when s.game_id = 'clueless' then s.score end asc nulls last,
        case when s.game_id <> 'clueless' then s.score end desc nulls last,
        s.played_at asc
    ) as player_row
  from contextual_scores s
  join players p on p.id = s.player_id
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
      partition by game_id, board_context
      order by
        case when game_id = 'clueless' then score end asc nulls last,
        case when game_id <> 'clueless' then score end desc nulls last,
        played_at asc
    ) as global_rank
  from player_bests
  where player_row = 1
)
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
  global_rank
from ranked;

grant select on global_leaderboard to anon, authenticated;

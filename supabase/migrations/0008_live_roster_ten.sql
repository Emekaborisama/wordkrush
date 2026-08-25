-- Raise live-race lobby from 2–4 to 2–10 (D-053).
-- CREATE OR REPLACE so a project that already applied 0006 at the old cap
-- picks up the new roster without a reset. 0007 is team CRUD.
-- Apply after 0007_team_crud.sql.

create or replace function public.join_match(p_match_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
  roster int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.status <> 'lobby' or row_match.started_at is not null then
    raise exception 'Race already started';
  end if;
  if not public.is_team_member(row_match.team_id) then
    raise exception 'Not on this team';
  end if;

  select count(*) into roster from match_players where match_id = p_match_id;
  if roster >= 10 then
    raise exception 'Lobby is full';
  end if;

  insert into match_players (match_id, player_id, status)
  values (p_match_id, uid, 'lobby')
  on conflict do nothing;

  return public.match_snapshot(p_match_id);
end;
$$;

create or replace function public.start_match(p_match_id uuid, p_duration_ms integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
  roster int;
  unready int;
  duration int;
  assigned bigint;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.host_id <> uid then
    raise exception 'Only the host can start';
  end if;
  if row_match.status <> 'lobby' then
    raise exception 'Race already started';
  end if;

  select count(*) into roster from match_players where match_id = p_match_id;
  select count(*) into unready from match_players where match_id = p_match_id and ready = false;
  if roster < 2 or roster > 10 then
    raise exception 'Need 2–10 players';
  end if;
  if unready > 0 then
    raise exception 'Everyone must be ready';
  end if;

  duration := greatest(30000, least(coalesce(p_duration_ms, 180000), 600000));
  assigned := 1 + floor(random() * 2147483646)::bigint;

  update matches
  set status = 'racing',
      seed = assigned,
      started_at = now(),
      ends_at = now() + (duration * interval '1 millisecond')
  where id = p_match_id;

  update match_players
  set status = 'racing'
  where match_id = p_match_id;

  return public.match_snapshot(p_match_id);
end;
$$;

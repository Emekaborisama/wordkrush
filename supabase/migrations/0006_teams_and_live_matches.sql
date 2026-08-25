-- Teams and live races.
--
-- Private invite-only teams. Live races are 2–10 simultaneous players on one
-- numbered path row. Solo play stays offline; this layer is additive (D-016).
-- Live results never write global_leaderboard.
--
-- Apply after 0005_clueless_difficulty_leaderboards.sql.

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

create table if not exists teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null
    check (char_length(trim(name)) between 2 and 32),
  owner_id     uuid not null references players(id) on delete cascade,
  invite_code  text not null unique
    check (invite_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  created_at   timestamptz not null default now()
);

create table if not exists team_members (
  team_id    uuid not null references teams(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  role       text not null check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (team_id, player_id)
);

-- One team per player keeps the first live layer simple.
create unique index if not exists team_members_one_team
  on team_members (player_id);

create table if not exists team_progress (
  team_id   uuid not null references teams(id) on delete cascade,
  game_id   text not null check (game_id in ('more-or-less', 'clueless', 'wordfall')),
  unlocked  integer not null default 1 check (unlocked >= 1),
  primary key (team_id, game_id)
);

create table if not exists matches (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  game_id       text not null check (game_id in ('more-or-less', 'clueless', 'wordfall')),
  level_number  integer not null check (level_number >= 1),
  host_id       uuid not null references players(id),
  status        text not null check (status in ('lobby', 'racing', 'finished')),
  seed          bigint,
  started_at    timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now()
);

create unique index if not exists matches_one_active_per_team_game
  on matches (team_id, game_id)
  where status in ('lobby', 'racing');

create table if not exists match_players (
  match_id     uuid not null references matches(id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  ready        boolean not null default false,
  score        integer not null default 0 check (score >= 0),
  complete     boolean not null default false,
  status       text not null default 'lobby'
    check (status in ('lobby', 'racing', 'done')),
  placement    integer,
  finished_at  timestamptz,
  primary key (match_id, player_id)
);

create index if not exists idx_match_players_match on match_players (match_id);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_progress enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and player_id = auth.uid()
  );
$$;

create policy teams_select on teams
  for select using (public.is_team_member(id));
create policy team_members_select on team_members
  for select using (public.is_team_member(team_id));
create policy team_progress_select on team_progress
  for select using (public.is_team_member(team_id));
create policy matches_select on matches
  for select using (public.is_team_member(team_id));
create policy match_players_select on match_players
  for select using (
    exists (
      select 1 from matches m
      where m.id = match_id and public.is_team_member(m.team_id)
    )
  );

create or replace function public.team_snapshot(p_team_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'team', (
      select json_build_object(
        'id', t.id,
        'name', t.name,
        'owner_id', t.owner_id,
        'invite_code', t.invite_code,
        'created_at', t.created_at
      )
      from teams t where t.id = p_team_id
    ),
    'members', (
      select coalesce(json_agg(json_build_object(
        'team_id', m.team_id,
        'player_id', m.player_id,
        'username', p.display_name,
        'role', m.role,
        'joined_at', m.joined_at
      ) order by m.joined_at), '[]'::json)
      from team_members m
      join players p on p.id = m.player_id
      where m.team_id = p_team_id
    ),
    'progress', (
      select coalesce(json_agg(json_build_object(
        'team_id', g.team_id,
        'game_id', g.game_id,
        'unlocked', g.unlocked
      ) order by g.game_id), '[]'::json)
      from team_progress g
      where g.team_id = p_team_id
    )
  );
$$;

create or replace function public.match_snapshot(p_match_id uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'match', (
      select json_build_object(
        'id', m.id,
        'team_id', m.team_id,
        'game_id', m.game_id,
        'level_number', m.level_number,
        'host_id', m.host_id,
        'status', m.status,
        'seed', m.seed,
        'started_at', m.started_at,
        'ends_at', m.ends_at,
        'created_at', m.created_at
      )
      from matches m where m.id = p_match_id
    ),
    'players', (
      select coalesce(json_agg(json_build_object(
        'match_id', mp.match_id,
        'player_id', mp.player_id,
        'username', p.display_name,
        'ready', mp.ready,
        'score', mp.score,
        'complete', mp.complete,
        'status', mp.status,
        'placement', mp.placement,
        'finished_at', mp.finished_at
      ) order by p.display_name), '[]'::json)
      from match_players mp
      join players p on p.id = mp.player_id
      where mp.match_id = p_match_id
    )
  );
$$;

create or replace function public.create_team(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := btrim(p_name);
  new_id uuid;
  code text;
  attempt int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if char_length(cleaned) < 2 or char_length(cleaned) > 32 then
    raise exception 'Team name must be 2–32 characters';
  end if;
  if not exists (select 1 from players where id = uid) then
    raise exception 'Player profile missing';
  end if;
  if exists (select 1 from team_members where player_id = uid) then
    raise exception 'Already on a team';
  end if;

  for attempt in 1..8 loop
    code := public.generate_invite_code();
    begin
      insert into teams (name, owner_id, invite_code)
      values (cleaned, uid, code)
      returning id into new_id;
      exit;
    exception when unique_violation then
      if attempt = 8 then raise; end if;
    end;
  end loop;

  insert into team_members (team_id, player_id, role) values (new_id, uid, 'owner');
  insert into team_progress (team_id, game_id, unlocked) values
    (new_id, 'more-or-less', 1),
    (new_id, 'clueless', 1),
    (new_id, 'wordfall', 1);

  return public.team_snapshot(new_id);
end;
$$;

create or replace function public.join_team(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  code text := upper(btrim(p_code));
  found_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if not exists (select 1 from players where id = uid) then
    raise exception 'Player profile missing';
  end if;
  if exists (select 1 from team_members where player_id = uid) then
    raise exception 'Already on a team';
  end if;

  select id into found_id from teams where invite_code = code;
  if found_id is null then
    raise exception 'Invite code not found';
  end if;

  insert into team_members (team_id, player_id, role) values (found_id, uid, 'member');
  return public.team_snapshot(found_id);
end;
$$;

create or replace function public.my_team()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_id uuid;
begin
  if uid is null then
    return null;
  end if;
  select team_id into found_id from team_members where player_id = uid;
  if found_id is null then
    return null;
  end if;
  return public.team_snapshot(found_id);
end;
$$;

create or replace function public.create_match(p_game_id text, p_level_number integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_team uuid;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if p_game_id not in ('more-or-less', 'clueless', 'wordfall') then
    raise exception 'Unknown game';
  end if;
  if p_level_number < 1 then
    raise exception 'Invalid level';
  end if;

  select team_id into found_team from team_members where player_id = uid;
  if found_team is null then
    raise exception 'Join a team first';
  end if;

  insert into matches (team_id, game_id, level_number, host_id, status)
  values (found_team, p_game_id, p_level_number, uid, 'lobby')
  returning id into new_id;

  insert into match_players (match_id, player_id, status)
  values (new_id, uid, 'lobby');

  return public.match_snapshot(new_id);
exception when unique_violation then
  raise exception 'That game already has a live lobby';
end;
$$;

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

create or replace function public.leave_match(p_match_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.status <> 'lobby' then
    raise exception 'Race already started';
  end if;
  if row_match.host_id = uid then
    raise exception 'Host must cancel the lobby';
  end if;

  delete from match_players where match_id = p_match_id and player_id = uid;
  return public.match_snapshot(p_match_id);
end;
$$;

create or replace function public.cancel_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.host_id <> uid then
    raise exception 'Only the host can cancel';
  end if;
  if row_match.status <> 'lobby' then
    raise exception 'Race already started';
  end if;
  delete from matches where id = p_match_id;
end;
$$;

create or replace function public.set_ready(p_match_id uuid, p_ready boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.status <> 'lobby' then
    raise exception 'Race already started';
  end if;

  update match_players
  set ready = p_ready
  where match_id = p_match_id and player_id = uid;
  if not found then
    raise exception 'Not in this lobby';
  end if;

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

create or replace function public.post_match_score(
  p_match_id uuid,
  p_score integer,
  p_complete boolean,
  p_done boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if p_score < 0 then
    raise exception 'Invalid score';
  end if;

  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if row_match.status <> 'racing' then
    raise exception 'Race is not live';
  end if;

  update match_players
  set score = p_score,
      complete = complete or p_complete,
      status = case when p_done then 'done' else status end,
      finished_at = case when p_done then coalesce(finished_at, now()) else finished_at end
  where match_id = p_match_id and player_id = uid;
  if not found then
    raise exception 'Not in this race';
  end if;

  return public.match_snapshot(p_match_id);
end;
$$;

create or replace function public.finish_match(p_match_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row_match matches%rowtype;
  still_racing int;
  anyone_complete boolean;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into row_match from matches where id = p_match_id;
  if not found then
    raise exception 'Match not found';
  end if;
  if not public.is_team_member(row_match.team_id) then
    raise exception 'Not on this team';
  end if;
  if row_match.status = 'finished' then
    return public.match_snapshot(p_match_id);
  end if;
  if row_match.status <> 'racing' then
    raise exception 'Race has not started';
  end if;

  select count(*) into still_racing
  from match_players
  where match_id = p_match_id and status <> 'done';

  if still_racing > 0 and (row_match.ends_at is null or now() < row_match.ends_at) then
    raise exception 'Race still running';
  end if;

  update match_players mp
  set status = 'done',
      finished_at = coalesce(mp.finished_at, now())
  where mp.match_id = p_match_id and mp.status <> 'done';

  with ranked as (
    select
      player_id,
      row_number() over (
        order by
          case when row_match.game_id = 'clueless' then (not complete)::int end asc,
          case when row_match.game_id = 'clueless' then score end asc,
          case when row_match.game_id = 'wordfall' then (not complete)::int end asc,
          case when row_match.game_id <> 'clueless' then score end desc,
          player_id
      ) as place
    from match_players
    where match_id = p_match_id
  )
  update match_players mp
  set placement = ranked.place
  from ranked
  where mp.match_id = p_match_id and mp.player_id = ranked.player_id;

  select exists (
    select 1 from match_players where match_id = p_match_id and complete
  ) into anyone_complete;

  if anyone_complete then
    insert into team_progress (team_id, game_id, unlocked)
    values (row_match.team_id, row_match.game_id, row_match.level_number + 1)
    on conflict (team_id, game_id) do update
      set unlocked = greatest(team_progress.unlocked, excluded.unlocked);
  end if;

  update matches set status = 'finished' where id = p_match_id;
  return public.match_snapshot(p_match_id);
end;
$$;

create or replace function public.active_match_for_game(p_game_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_team uuid;
  found_id uuid;
begin
  if uid is null then
    return null;
  end if;
  select team_id into found_team from team_members where player_id = uid;
  if found_team is null then
    return null;
  end if;
  select id into found_id
  from matches
  where team_id = found_team
    and game_id = p_game_id
    and status in ('lobby', 'racing')
  limit 1;
  if found_id is null then
    return null;
  end if;
  return public.match_snapshot(found_id);
end;
$$;

grant execute on function public.generate_invite_code() to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.team_snapshot(uuid) to authenticated;
grant execute on function public.match_snapshot(uuid) to authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.join_team(text) to authenticated;
grant execute on function public.my_team() to authenticated;
grant execute on function public.create_match(text, integer) to authenticated;
grant execute on function public.join_match(uuid) to authenticated;
grant execute on function public.leave_match(uuid) to authenticated;
grant execute on function public.cancel_match(uuid) to authenticated;
grant execute on function public.set_ready(uuid, boolean) to authenticated;
grant execute on function public.start_match(uuid, integer) to authenticated;
grant execute on function public.post_match_score(uuid, integer, boolean, boolean) to authenticated;
grant execute on function public.finish_match(uuid) to authenticated;
grant execute on function public.active_match_for_game(text) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.match_players;
  exception when duplicate_object then null;
  end;
end $$;

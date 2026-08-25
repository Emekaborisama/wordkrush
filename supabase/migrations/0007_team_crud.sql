-- Team CRUD: rename, leave, disband.
-- Apply after 0006_teams_and_live_matches.sql.

create or replace function public.rename_team(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cleaned text := btrim(p_name);
  found_team uuid;
  found_role text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if char_length(cleaned) < 2 or char_length(cleaned) > 32 then
    raise exception 'Team name must be 2–32 characters';
  end if;

  select team_id, role into found_team, found_role
  from team_members
  where player_id = uid;
  if found_team is null then
    raise exception 'Join a team first';
  end if;
  if found_role <> 'owner' then
    raise exception 'Only the owner can rename the team';
  end if;

  update teams set name = cleaned where id = found_team;
  return public.team_snapshot(found_team);
end;
$$;

create or replace function public.leave_team()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_team uuid;
  found_role text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select team_id, role into found_team, found_role
  from team_members
  where player_id = uid;
  if found_team is null then
    raise exception 'Not on a team';
  end if;
  if found_role = 'owner' then
    raise exception 'Owner must disband the team';
  end if;

  delete from team_members where team_id = found_team and player_id = uid;
  return null;
end;
$$;

create or replace function public.disband_team()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_team uuid;
  found_role text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select team_id, role into found_team, found_role
  from team_members
  where player_id = uid;
  if found_team is null then
    raise exception 'Not on a team';
  end if;
  if found_role <> 'owner' then
    raise exception 'Only the owner can disband the team';
  end if;

  delete from teams where id = found_team;
  return null;
end;
$$;

grant execute on function public.rename_team(text) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.disband_team() to authenticated;

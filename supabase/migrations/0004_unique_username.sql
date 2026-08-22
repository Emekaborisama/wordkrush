-- One claimed leaderboard name per player (D-037).
--
-- display_name is public identity, not a login identifier. Email magic link
-- remains the only sign-in channel; uniqueness here stops two accounts from
-- posting as the same name.
--
-- Apply after 0002_leaderboard.sql (and 0003 if that is already live).

-- Collapse whitespace the same way the client does (normalizeUsername), then
-- compare case-insensitively so "Boris" and "boris" cannot both exist.
create or replace function public.username_key(raw text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(raw, '')), '\s+', ' ', 'g'));
$$;

-- Existing test rows may already share a name. Keep the oldest; suffix the rest
-- so the unique index can apply without failing the migration.
with ranked as (
  select
    id,
    row_number() over (
      partition by public.username_key(display_name)
      order by created_at, id
    ) as rn
  from public.players
)
update public.players p
set display_name = left(
  regexp_replace(trim(p.display_name), '\s+', ' ', 'g')
    || '-'
    || substr(replace(p.id::text, '-', ''), 1, 4),
  24
)
from ranked r
where p.id = r.id and r.rn > 1;

create unique index if not exists players_display_name_unique
  on public.players (public.username_key(display_name));

create or replace function public.username_taken(raw text, except_id uuid default null)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.players
    where public.username_key(display_name) = public.username_key(raw)
      and (except_id is null or id <> except_id)
  );
$$;

revoke all on function public.username_key(text) from public;
revoke all on function public.username_taken(text, uuid) from public;
grant execute on function public.username_key(text) to anon, authenticated;
grant execute on function public.username_taken(text, uuid) to anon, authenticated;

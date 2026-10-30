-- A flag beside a player's name on leaderboards and in live races (D-073).
--
-- OWNER DECISION: applying this starts storing a country for each signed-in
-- player who has not hidden their flag, and `players_read` makes it public
-- alongside their username. Migrations are owner-only (D-064). The client
-- already copes with this column being missing: boards show no flags.
--
-- No view or function changes: the app reads this with its own small query, so
-- the leaderboard keeps working whether or not this has been applied.
--
-- Apply after 0008_live_roster_ten.sql.

alter table public.players
  add column if not exists country_code text
    check (country_code is null or country_code ~ '^[A-Z]{2}$');

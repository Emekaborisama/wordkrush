-- Content pipeline schema. The DB is the content FACTORY, not a runtime
-- dependency of the game client: the app ships a bundled JSON snapshot
-- exported from here (see docs/BRAINSTORM.md §12, docs/STACK.md D-007).
--
-- Apply via the Supabase SQL editor, or: supabase db push

create table if not exists categories (
  id           text primary key,              -- "google-search"
  name         text not null,                 -- "Search Popularity"
  metric_label text not null,                 -- "monthly Google searches"
  unit         text not null default 'count' check (unit in ('count', 'currency', 'percent')),
  created_at   timestamptz not null default now()
);

create table if not exists items (
  id          text primary key,               -- "google-search.pizza"
  category_id text not null references categories(id),
  label       text not null,                  -- "Pizza"
  -- The exact query string sent to the data source (may differ from label)
  query_term  text not null,
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- One snapshot = one batch fetch of a whole category from one source at one time.
-- Correctness in the game is always "as of snapshot X from source Y" — never absolute.
create table if not exists snapshots (
  id          uuid primary key default gen_random_uuid(),
  category_id text not null references categories(id),
  source      text not null,                  -- "mock" | "dataforseo" | "google-ads" | ...
  captured_at timestamptz not null default now(),
  -- pending: just fetched | validated: passed checks | published: exported to the app
  status      text not null default 'pending' check (status in ('pending', 'validated', 'published')),
  notes       text
);

create table if not exists item_values (
  snapshot_id uuid not null references snapshots(id) on delete cascade,
  item_id     text not null references items(id),
  value       numeric not null check (value > 0),
  raw         jsonb,                          -- untouched source response, for audit
  flagged     boolean not null default false, -- failed a sanity check; excluded from export
  flag_reason text,
  primary key (snapshot_id, item_id)
);

create index if not exists idx_items_category on items(category_id);
create index if not exists idx_snapshots_category_status on snapshots(category_id, status, captured_at desc);

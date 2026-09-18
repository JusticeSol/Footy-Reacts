-- Footy Reacts — Postgres/Supabase schema.
--
-- Paste this whole file into the Supabase SQL editor and run it. It is
-- idempotent: re-running it is safe and changes nothing.
--
-- Mirrors src/lib/types.ts field for field; src/lib/repo/supabase.ts is the
-- only place that knows these columns are snake_case.

-- Enum types, guarded so a second run does not error.
do $$ begin
  create type fixture_status as enum ('scheduled', 'live', 'finished', 'postponed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type take_phase as enum ('pre', 'post');
exception when duplicate_object then null; end $$;

do $$ begin
  create type take_source as enum ('youtube', 'x');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tagged_by as enum ('heuristic', 'agent', 'manual');
exception when duplicate_object then null; end $$;

create table if not exists competition (
  id   text primary key,
  code text not null,
  name text not null
);

create table if not exists team (
  id         text primary key,
  name       text not null,
  short_name text not null,
  abbr       text not null check (char_length(abbr) <= 4),
  crest_url  text
);

create table if not exists fixture (
  id             text primary key,
  slug           text not null unique,
  competition_id text,
  home_team_id   text not null references team (id),
  away_team_id   text not null references team (id),
  kickoff_utc    timestamptz not null,
  status         fixture_status not null default 'scheduled',
  matchday       int,
  score_home     int,
  score_away     int,
  -- Provider's own id, so re-syncs de-duplicate without touching our id.
  external_id    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists fixture_kickoff_idx on fixture (kickoff_utc);

create table if not exists creator (
  id                   text primary key,
  name                 text not null,
  handle               text not null,
  youtube_channel_id   text unique,
  -- Resolved once, then polled at 1 quota unit per poll. See docs/SPEC.md §4.2.
  uploads_playlist_id  text,
  avatar_url           text,
  -- Team ids this creator covers: the tagging pre-filter's strongest signal.
  club_affinity        text[] not null default '{}',
  claimed              boolean not null default false,
  payout_address       text,
  created_at           timestamptz not null default now()
);

create table if not exists take (
  id            text primary key,
  fixture_id    text not null references fixture (id) on delete cascade,
  creator_id    text not null references creator (id) on delete cascade,
  phase         take_phase not null,
  source        take_source not null default 'youtube',
  external_id   text not null,
  title         text not null,
  url           text not null,
  thumbnail_url text,
  published_at  timestamptz not null,
  duration_sec  int,
  confidence    real not null default 0,
  tagged_by     tagged_by not null default 'heuristic',
  unmatched     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (source, external_id)
);

-- The match page's only query: one fixture, one phase, newest first.
create index if not exists take_fixture_phase_idx
  on take (fixture_id, phase, published_at desc);

-- The vidiprinter: newest published takes across all fixtures.
create index if not exists take_published_idx on take (published_at desc);

-- --- Row level security ------------------------------------------------------
--
-- RLS is enabled with NO policies, which denies every anon and authenticated
-- request outright. That is deliberate: all reads happen in server components
-- and jobs using the service-role key, which bypasses RLS. Nothing should ever
-- reach these tables straight from a browser.
--
-- If a future feature needs client-side reads, add explicit `for select`
-- policies here rather than turning RLS off.

alter table competition enable row level security;
alter table team        enable row level security;
alter table fixture     enable row level security;
alter table creator     enable row level security;
alter table take        enable row level security;

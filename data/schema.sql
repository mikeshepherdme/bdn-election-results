-- BDN Election Results — Supabase schema
-- Run once in Supabase SQL editor

create table if not exists races (
  race_id            text primary key,
  election_id        text,
  office             text,
  district           text,
  party              text,
  state              text default 'ME',
  slug               text unique,
  called             boolean default false,
  test_data          boolean default false,
  reporting_type     text default 'precincts',
  precincts_reporting integer default 0,
  precincts_total     integer default 0,
  total_votes         integer default 0,
  candidate_votes     jsonb,   -- { "cand_id": vote_count, ... }
  last_updated        timestamptz
);

create table if not exists candidates (
  cand_id    text,
  race_id    text references races(race_id),
  first_name text,
  last_name  text,
  incumbent  boolean default false,
  party      text,
  primary key (cand_id, race_id)
);

create table if not exists vcu_results (
  vcu_id       text,
  race_id      text references races(race_id),
  vcu_name     text,
  county_name  text,
  votes        jsonb,   -- { "cand_id": vote_count, ... }
  last_updated timestamptz,
  primary key (vcu_id, race_id)
);

-- Snapshots for the margin/momentum chart
create table if not exists race_snapshots (
  id               bigserial primary key,
  race_id          text references races(race_id),
  ts               timestamptz,
  pct_reporting    numeric(5,2),
  candidate_votes  jsonb
);

-- Email alert subscriptions
create table if not exists alert_subscriptions (
  id         bigserial primary key,
  email      text not null,
  race_id    text references races(race_id),
  created_at timestamptz default now(),
  notified   boolean default false,
  unique (email, race_id)
);

-- Realtime: enable for races and vcu_results so Next.js can subscribe
alter publication supabase_realtime add table races;
alter publication supabase_realtime add table vcu_results;

-- Index town lookups
create index if not exists vcu_results_vcu_name on vcu_results(lower(vcu_name));

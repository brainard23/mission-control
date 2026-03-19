-- Mission Control initial PostgreSQL schema
-- First pass: enough structure to move beyond in-memory mock state while preserving the current domain model.

create extension if not exists pgcrypto;

create table if not exists rooms (
  id text primary key,
  name text not null,
  kind text not null,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agents (
  id text primary key,
  name text not null,
  type text not null,
  role text,
  capabilities jsonb not null default '[]'::jsonb,
  status text not null,
  room_id text references rooms(id) on delete set null,
  current_session_id text,
  current_task_id text,
  last_activity_at timestamptz not null,
  runtime_source text not null default 'openclaw',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  label text,
  agent_id text not null references agents(id) on delete cascade,
  runtime text not null,
  model text,
  state text not null,
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  current_task_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text,
  status text not null,
  priority text not null,
  assigned_agent_id text references agents(id) on delete set null,
  session_id text references sessions(id) on delete set null,
  blocker_reason text,
  tags jsonb not null default '[]'::jsonb,
  source text not null,
  created_by text,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists placements (
  id text primary key,
  room_id text not null references rooms(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  x integer not null,
  y integer not null,
  w integer not null,
  h integer not null,
  z_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, agent_id)
);

create table if not exists events (
  id text primary key,
  ts timestamptz not null,
  kind text not null,
  severity text not null,
  message text not null,
  agent_id text references agents(id) on delete set null,
  session_id text references sessions(id) on delete set null,
  task_id text references tasks(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists task_history (
  id text primary key,
  task_id text not null references tasks(id) on delete cascade,
  from_status text,
  to_status text,
  message text,
  actor text,
  event_kind text not null,
  created_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_agents_room_id on agents(room_id);
create index if not exists idx_sessions_agent_id on sessions(agent_id);
create index if not exists idx_tasks_assigned_agent_id on tasks(assigned_agent_id);
create index if not exists idx_tasks_session_id on tasks(session_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_events_ts on events(ts desc);
create index if not exists idx_events_task_id on events(task_id);
create index if not exists idx_task_history_task_id on task_history(task_id, created_at desc);

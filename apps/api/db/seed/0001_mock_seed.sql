-- Seed data aligned with the current mock repository.

insert into rooms (id, name, kind, sort_order)
values
  ('room_eng', 'Engineering', 'team', 1),
  ('room_auto', 'Automation Bay', 'workflow', 2)
on conflict (id) do update set
  name = excluded.name,
  kind = excluded.kind,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into agents (id, name, type, role, capabilities, status, room_id, current_session_id, current_task_id, last_activity_at)
values
  ('agent_reviewer', 'Reviewer', 'subagent', 'Code Review', '["review","debug"]'::jsonb, 'working', 'room_eng', 'sess_review_1', 'task_review_pr', '2026-03-19T07:30:00Z'),
  ('agent_builder', 'Builder', 'acp', 'Implementation', '["build","refactor"]'::jsonb, 'blocked', 'room_eng', 'sess_build_1', 'task_auth_fix', '2026-03-19T07:28:00Z'),
  ('agent_cron', 'Cron Runner', 'system', 'Scheduled Automation', '["schedule"]'::jsonb, 'idle', 'room_auto', null, null, '2026-03-19T07:15:00Z')
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  role = excluded.role,
  capabilities = excluded.capabilities,
  status = excluded.status,
  room_id = excluded.room_id,
  current_session_id = excluded.current_session_id,
  current_task_id = excluded.current_task_id,
  last_activity_at = excluded.last_activity_at,
  updated_at = now();

insert into sessions (id, label, agent_id, runtime, model, state, started_at, last_activity_at, current_task_id, summary)
values
  ('sess_review_1', 'review-pr-123', 'agent_reviewer', 'subagent', 'claude', 'active', '2026-03-19T07:00:00Z', '2026-03-19T07:30:00Z', 'task_review_pr', 'Reviewing API and schema updates'),
  ('sess_build_1', 'fix-auth-edge-case', 'agent_builder', 'acp', 'codex', 'active', '2026-03-19T07:02:00Z', '2026-03-19T07:28:00Z', 'task_auth_fix', 'Blocked on missing browser login state')
on conflict (id) do update set
  label = excluded.label,
  agent_id = excluded.agent_id,
  runtime = excluded.runtime,
  model = excluded.model,
  state = excluded.state,
  started_at = excluded.started_at,
  last_activity_at = excluded.last_activity_at,
  current_task_id = excluded.current_task_id,
  summary = excluded.summary,
  updated_at = now();

insert into tasks (id, title, description, status, priority, assigned_agent_id, session_id, blocker_reason, tags, source, created_at, updated_at)
values
  ('task_review_pr', 'Review PR #123', 'Review API contract changes for Mission Control', 'in_progress', 'high', 'agent_reviewer', 'sess_review_1', null, '["review","api"]'::jsonb, 'manual', '2026-03-19T06:58:00Z', '2026-03-19T07:30:00Z'),
  ('task_auth_fix', 'Fix auth edge case', 'Investigate auth flow issue in browser relay setup', 'blocked', 'urgent', 'agent_builder', 'sess_build_1', 'Awaiting browser login state', '["auth","browser"]'::jsonb, 'manual', '2026-03-19T07:00:00Z', '2026-03-19T07:28:00Z'),
  ('task_floor_ui', 'Design Office View cards', 'Create first pass on Office View table cards', 'queued', 'normal', null, null, null, '["ui","office"]'::jsonb, 'manual', '2026-03-19T07:10:00Z', '2026-03-19T07:10:00Z')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  assigned_agent_id = excluded.assigned_agent_id,
  session_id = excluded.session_id,
  blocker_reason = excluded.blocker_reason,
  tags = excluded.tags,
  updated_at = excluded.updated_at;

insert into placements (id, room_id, agent_id, x, y, w, h, z_index)
values
  ('place_1', 'room_eng', 'agent_reviewer', 0, 0, 1, 1, 0),
  ('place_2', 'room_eng', 'agent_builder', 1, 0, 1, 1, 0),
  ('place_3', 'room_auto', 'agent_cron', 0, 0, 1, 1, 0)
on conflict (id) do update set
  room_id = excluded.room_id,
  agent_id = excluded.agent_id,
  x = excluded.x,
  y = excluded.y,
  w = excluded.w,
  h = excluded.h,
  z_index = excluded.z_index,
  updated_at = now();

insert into events (id, ts, kind, severity, message, agent_id, session_id, task_id)
values
  ('evt_1', '2026-03-19T07:30:00Z', 'task.updated', 'info', 'Review PR #123 is in progress', 'agent_reviewer', 'sess_review_1', 'task_review_pr'),
  ('evt_2', '2026-03-19T07:28:00Z', 'task.blocked', 'warning', 'Fix auth edge case blocked: Awaiting browser login state', 'agent_builder', 'sess_build_1', 'task_auth_fix')
on conflict (id) do update set
  ts = excluded.ts,
  kind = excluded.kind,
  severity = excluded.severity,
  message = excluded.message,
  agent_id = excluded.agent_id,
  session_id = excluded.session_id,
  task_id = excluded.task_id;

insert into task_history (id, task_id, from_status, to_status, message, actor, event_kind, created_at)
values
  ('hist_1', 'task_review_pr', 'queued', 'in_progress', 'Assigned to Reviewer', 'operator', 'task.assigned', '2026-03-19T07:00:00Z'),
  ('hist_2', 'task_auth_fix', 'in_progress', 'blocked', 'Browser login state missing', 'agent_builder', 'task.blocked', '2026-03-19T07:28:00Z')
on conflict (id) do update set
  task_id = excluded.task_id,
  from_status = excluded.from_status,
  to_status = excluded.to_status,
  message = excluded.message,
  actor = excluded.actor,
  event_kind = excluded.event_kind,
  created_at = excluded.created_at;

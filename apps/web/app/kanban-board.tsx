'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Task, AgentCard } from '@mission-control/contracts'
import {
  createTask,
  updateTaskStatus,
  assignTask,
  retryTask,
} from '../lib/api'
import type { ChatAgent } from '../lib/api'

type KanbanColumn = {
  id: string
  title: string
  statuses: string[]
  color: string
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'queued', title: 'Queued', statuses: ['queued'], color: '#5c6cfc' },
  { id: 'in_progress', title: 'In Progress', statuses: ['in_progress'], color: '#40d680' },
  { id: 'blocked', title: 'Blocked', statuses: ['blocked', 'waiting'], color: '#f0c040' },
  { id: 'done', title: 'Done', statuses: ['done'], color: '#888' },
]

const COLUMN_COLORS = ['#5c6cfc', '#40d680', '#f0c040', '#e05050', '#b060e0', '#3cb7e0', '#f0a030', '#fc5c8c', '#888']

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const PRIORITY_COLORS: Record<string, string> = {
  low: '#7a7a9a', normal: '#5c6cfc', high: '#f0c040', urgent: '#e05050',
}

type TaskModalData = { task: Task | null; mode: 'view' | 'create' }

function loadColumns(): KanbanColumn[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS
  try {
    const saved = localStorage.getItem('mc_kanban_columns')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_COLUMNS
}

function saveColumns(cols: KanbanColumn[]) {
  try { localStorage.setItem('mc_kanban_columns', JSON.stringify(cols)) } catch {}
}

// ===== Task Card =====

function TaskCard({ task, agents, onDragStart, onClick }: {
  task: Task; agents: AgentCard[]
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onClick: () => void
}) {
  const assigned = agents.find((a) => a.agent.id === task.assignedAgentId)
  return (
    <div className="kb-card" draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={onClick}>
      <div className="kb-card__header">
        <span className="kb-card__priority" style={{ background: PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal }} />
        <span className="kb-card__priority-label">{task.priority}</span>
      </div>
      <h4 className="kb-card__title">{task.title}</h4>
      {task.description && <p className="kb-card__desc">{task.description}</p>}
      {task.blockerReason && <p className="kb-card__blocker">{task.blockerReason}</p>}
      <div className="kb-card__footer">
        {assigned ? <span className="kb-card__agent">{assigned.agent.name.split(' ')[0]}</span> : <span className="kb-card__unassigned">Unassigned</span>}
        {task.tags && task.tags.length > 0 && (
          <div className="kb-card__tags">{task.tags.slice(0, 3).map((t) => <span key={t} className="kb-card__tag">{t}</span>)}</div>
        )}
      </div>
    </div>
  )
}

// ===== Column =====

function KanbanColumnView({ column, tasks, agents, onDrop, onDragOver, onDragStart, onTaskClick, count, onEdit, onDelete }: {
  column: KanbanColumn; tasks: Task[]; agents: AgentCard[]
  onDrop: (e: React.DragEvent, targetStatus: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onTaskClick: (task: Task) => void
  count: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  return (
    <div
      className={`kb-column${dragOver ? ' kb-column--dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); onDragOver(e) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e, column.statuses[0]) }}
    >
      <div className="kb-column__header">
        <span className="kb-column__dot" style={{ background: column.color }} />
        <h3>{column.title}</h3>
        <span className="kb-column__count">{count}</span>
        <div className="kb-column__actions">
          <button className="kb-column__btn" onClick={onEdit} title="Edit column">✎</button>
          <button className="kb-column__btn" onClick={onDelete} title="Delete column">✕</button>
        </div>
      </div>
      <div className="kb-column__cards">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} agents={agents} onDragStart={onDragStart} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && <div className="kb-column__empty">Drop tasks here</div>}
      </div>
    </div>
  )
}

// ===== Column Editor Modal =====

function ColumnEditorModal({ column, onSave, onClose }: {
  column: KanbanColumn | null // null = new
  onSave: (col: KanbanColumn) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(column?.title || '')
  const [statuses, setStatuses] = useState(column?.statuses.join(', ') || '')
  const [color, setColor] = useState(column?.color || COLUMN_COLORS[0])

  const handleSave = () => {
    if (!title.trim()) return
    const statusList = statuses.split(',').map((s) => s.trim()).filter(Boolean)
    if (statusList.length === 0) statusList.push(title.toLowerCase().replace(/\s+/g, '_'))
    onSave({
      id: column?.id || title.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      title: title.trim(),
      statuses: statusList,
      color,
    })
    onClose()
  }

  return (
    <div className="kb-modal-overlay" onClick={onClose}>
      <div className="kb-modal kb-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal__header">
          <h2>{column ? 'Edit Column' : 'New Column'}</h2>
          <button className="kb-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="kb-modal__body">
          <label className="kb-field">
            <span>Column Name</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review, Testing" autoFocus />
          </label>
          <label className="kb-field">
            <span>Status Mapping (comma separated)</span>
            <input value={statuses} onChange={(e) => setStatuses(e.target.value)} placeholder="e.g. review, testing — tasks with these statuses go here" />
            <small style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
              When you drag a task here, it gets the first status. Leave empty to auto-generate from the name.
            </small>
          </label>
          <label className="kb-field">
            <span>Color</span>
            <div className="kb-color-picker">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  className={`kb-color-swatch${color === c ? ' kb-color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </label>
        </div>
        <div className="kb-modal__footer">
          <div style={{ flex: 1 }} />
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="action-btn action-btn--primary" onClick={handleSave} disabled={!title.trim()}>
            {column ? 'Save' : 'Add Column'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Task Modal =====

function TaskModal({ data, agents, chatAgents, columns, apiBaseUrl, onClose, onSaved }: {
  data: TaskModalData; agents: AgentCard[]; chatAgents: ChatAgent[]
  columns: KanbanColumn[]
  apiBaseUrl: string; onClose: () => void; onSaved: () => void
}) {
  const isCreate = data.mode === 'create'
  const [title, setTitle] = useState(data.task?.title || '')
  const [description, setDescription] = useState(data.task?.description || '')
  const [priority, setPriority] = useState<string>(data.task?.priority || 'normal')
  const [status, setStatus] = useState<string>(data.task?.status || 'queued')
  const [assignedAgentId, setAssignedAgentId] = useState(data.task?.assignedAgentId || '')
  const [tags, setTags] = useState(data.task?.tags?.join(', ') || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // All unique statuses from columns
  const allStatuses = [...new Set(columns.flatMap((c) => c.statuses))]

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setError(null)
    try {
      if (isCreate) {
        await createTask(apiBaseUrl, { title: title.trim(), description: description.trim() || undefined, priority, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
      } else if (data.task) {
        await updateTaskStatus(apiBaseUrl, data.task.id, { title: title.trim(), description: description.trim() || null, priority, status, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
        if (assignedAgentId && assignedAgentId !== data.task.assignedAgentId) await assignTask(apiBaseUrl, data.task.id, assignedAgentId)
      }
      onSaved(); onClose()
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const handleRetry = async () => {
    if (!data.task) return
    setSaving(true)
    try { await retryTask(apiBaseUrl, data.task.id, 'Retried from Kanban'); onSaved(); onClose() }
    catch { setError('Failed to retry') }
    finally { setSaving(false) }
  }

  return (
    <div className="kb-modal-overlay" onClick={onClose}>
      <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal__header">
          <h2>{isCreate ? 'New Task' : 'Edit Task'}</h2>
          <button className="kb-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="kb-modal__body">
          <label className="kb-field"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus /></label>
          <label className="kb-field"><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What needs to be done?" rows={3} /></label>
          <div className="kb-field-row">
            <label className="kb-field"><span>Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </label>
            {!isCreate && (
              <label className="kb-field"><span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {allStatuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="kb-field"><span>Assign Agent</span>
            <select value={assignedAgentId} onChange={(e) => setAssignedAgentId(e.target.value)}>
              <option value="">Unassigned</option>
              {chatAgents.map((a) => (
                <option key={a.id} value={agents.find((ag) => ag.agent.name.toLowerCase().startsWith(a.id))?.agent.id || a.id}>{a.emoji || '🤖'} {a.name}</option>
              ))}
              {agents.filter((a) => !chatAgents.find((ca) => a.agent.name.toLowerCase().startsWith(ca.id))).map((a) => (
                <option key={a.agent.id} value={a.agent.id}>{a.agent.name}</option>
              ))}
            </select>
          </label>
          <label className="kb-field"><span>Tags (comma separated)</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. bug, frontend" /></label>
          {data.task?.blockerReason && <div className="kb-blocker-info"><strong>Blocker:</strong> {data.task.blockerReason}</div>}
          {error && <div className="kb-error">{error}</div>}
        </div>
        <div className="kb-modal__footer">
          {!isCreate && (data.task?.status === 'blocked' || data.task?.status === 'failed') && <button className="action-btn" onClick={handleRetry} disabled={saving}>Retry</button>}
          <div style={{ flex: 1 }} />
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="action-btn action-btn--primary" onClick={handleSave} disabled={saving || !title.trim()}>{saving ? 'Saving...' : isCreate ? 'Create' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}

// ===== Kanban Board =====

export function KanbanBoard({ tasks, agents, chatAgents, apiBaseUrl }: {
  tasks: Task[]; agents: AgentCard[]; chatAgents: ChatAgent[]; apiBaseUrl: string
}) {
  const [columns, setColumns] = useState<KanbanColumn[]>(loadColumns)
  const [modal, setModal] = useState<TaskModalData | null>(null)
  const [columnModal, setColumnModal] = useState<{ column: KanbanColumn | null } | null>(null)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)

  // Persist columns
  useEffect(() => { saveColumns(columns) }, [columns])

  const handleDragStart = useCallback((_e: React.DragEvent, taskId: string) => setDragTaskId(taskId), [])

  const handleDrop = useCallback(async (_e: React.DragEvent, targetStatus: string) => {
    if (!dragTaskId) return
    const task = tasks.find((t) => t.id === dragTaskId)
    if (!task || task.status === targetStatus) { setDragTaskId(null); return }
    try { await updateTaskStatus(apiBaseUrl, dragTaskId, { status: targetStatus }) } catch {}
    setDragTaskId(null)
  }, [dragTaskId, tasks, apiBaseUrl])

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  const handleSaveColumn = useCallback((col: KanbanColumn) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === col.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = col; return next }
      return [...prev, col]
    })
  }, [])

  const handleDeleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId))
  }, [])

  // Tasks that don't match any column
  const allMappedStatuses = columns.flatMap((c) => c.statuses)
  const unmapped = tasks.filter((t) => !allMappedStatuses.includes(t.status))

  return (
    <div className="kb-board">
      <div className="kb-board__header">
        <h2>Task Board</h2>
        <div className="kb-board__actions">
          <button className="action-btn" onClick={() => setColumnModal({ column: null })}>+ Column</button>
          <button className="action-btn action-btn--primary" onClick={() => setModal({ task: null, mode: 'create' })}>+ Task</button>
        </div>
      </div>

      <div className="kb-columns">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => col.statuses.includes(t.status))
          return (
            <KanbanColumnView
              key={col.id} column={col} tasks={colTasks} agents={agents} count={colTasks.length}
              onDrop={handleDrop} onDragOver={handleDragOver} onDragStart={handleDragStart}
              onTaskClick={(task) => setModal({ task, mode: 'view' })}
              onEdit={() => setColumnModal({ column: col })}
              onDelete={() => handleDeleteColumn(col.id)}
            />
          )
        })}
      </div>

      {unmapped.length > 0 && (
        <div className="kb-unmapped">
          <span>Unmapped tasks ({unmapped.length}):</span>
          {unmapped.map((t) => <span key={t.id} className="kb-unmapped__tag">{t.title} ({t.status})</span>)}
        </div>
      )}

      {modal && <TaskModal data={modal} agents={agents} chatAgents={chatAgents} columns={columns} apiBaseUrl={apiBaseUrl} onClose={() => setModal(null)} onSaved={() => {}} />}
      {columnModal && <ColumnEditorModal column={columnModal.column} onSave={handleSaveColumn} onClose={() => setColumnModal(null)} />}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task, AgentCard } from '@mission-control/contracts'
import {
  createTask,
  updateTaskStatus,
  deleteTask,
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

// ===== Toast System =====

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' }

let toastId = 0

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="kb-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`kb-toast kb-toast--${t.type}`} onClick={() => onDismiss(t.id)}>
          <span className="kb-toast__icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'i'}
          </span>
          <span className="kb-toast__msg">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      timers.current.delete(id)
    }, type === 'error' ? 6000 : 3000)
    timers.current.set(id, timer)
    return id
  }, [])

  useEffect(() => {
    return () => { timers.current.forEach((t) => clearTimeout(t)) }
  }, [])

  return { toasts, show, dismiss }
}

// ===== Spinner =====

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span className="kb-spinner" style={{ width: size, height: size }} />
  )
}

// ===== Task Card =====

function TaskCard({ task, agents, onDragStart, onClick, loading }: {
  task: Task; agents: AgentCard[]
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onClick: () => void
  loading?: boolean
}) {
  const assigned = agents.find((a) => a.agent.id === task.assignedAgentId)
  return (
    <div className={`kb-card${loading ? ' kb-card--loading' : ''}`} draggable={!loading} onDragStart={(e) => onDragStart(e, task.id)} onClick={onClick}>
      {loading && <div className="kb-card__spinner"><Spinner /></div>}
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

function KanbanColumnView({ column, tasks, agents, onDrop, onDragOver, onDragStart, onTaskClick, count, onEdit, onDelete, onColumnDragStart, onColumnDragOver, onColumnDrop, columnDragOver, loadingTaskIds }: {
  column: KanbanColumn; tasks: Task[]; agents: AgentCard[]
  onDrop: (e: React.DragEvent, targetStatus: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, taskId: string) => void
  onTaskClick: (task: Task) => void
  count: number
  onEdit: () => void
  onDelete: () => void
  onColumnDragStart: (e: React.DragEvent, colId: string) => void
  onColumnDragOver: (e: React.DragEvent, colId: string) => void
  onColumnDrop: (e: React.DragEvent, colId: string) => void
  columnDragOver: boolean
  loadingTaskIds: Set<string>
}) {
  const [cardDragOver, setCardDragOver] = useState(false)
  return (
    <div
      className={`kb-column${cardDragOver ? ' kb-column--dragover' : ''}${columnDragOver ? ' kb-column--col-dragover' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (e.dataTransfer.types.includes('text/task-id')) setCardDragOver(true)
        onDragOver(e)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setCardDragOver(false)
      }}
      onDrop={(e) => {
        setCardDragOver(false)
        if (e.dataTransfer.types.includes('text/task-id')) {
          onDrop(e, column.statuses[0])
        } else if (e.dataTransfer.types.includes('text/column-id')) {
          onColumnDrop(e, column.id)
        }
      }}
    >
      <div
        className="kb-column__header"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/column-id', column.id)
          e.dataTransfer.effectAllowed = 'move'
          onColumnDragStart(e, column.id)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          if (e.dataTransfer.types.includes('text/column-id')) {
            onColumnDragOver(e, column.id)
          }
        }}
        style={{ cursor: 'grab' }}
      >
        <span className="kb-column__grip" title="Drag to reorder">⠿</span>
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
          <TaskCard key={task.id} task={task} agents={agents} loading={loadingTaskIds.has(task.id)} onDragStart={(e, id) => { e.dataTransfer.setData('text/task-id', id); onDragStart(e, id) }} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && <div className="kb-column__empty">Drop tasks here</div>}
      </div>
    </div>
  )
}

// ===== Column Editor Modal =====

function ColumnEditorModal({ column, onSave, onClose }: {
  column: KanbanColumn | null
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

function TaskModal({ data, agents, chatAgents, columns, apiBaseUrl, onClose, onSaved, toast }: {
  data: TaskModalData; agents: AgentCard[]; chatAgents: ChatAgent[]
  columns: KanbanColumn[]
  apiBaseUrl: string; onClose: () => void; onSaved: () => void
  toast: (msg: string, type: Toast['type']) => void
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

  const allStatuses = [...new Set(columns.flatMap((c) => c.statuses))]

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setError(null)
    try {
      if (isCreate) {
        await createTask(apiBaseUrl, { title: title.trim(), description: description.trim() || undefined, priority, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
        toast('Task created', 'success')
      } else if (data.task) {
        await updateTaskStatus(apiBaseUrl, data.task.id, { title: title.trim(), description: description.trim() || null, priority, status, assignedAgentId: assignedAgentId || null, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) })
        toast('Task updated', 'success')
      }
      onSaved(); onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      setError(msg)
      toast(`Save failed: ${msg}`, 'error')
    } finally { setSaving(false) }
  }

  const handleRetry = async () => {
    if (!data.task) return
    setSaving(true)
    try {
      await retryTask(apiBaseUrl, data.task.id, 'Retried from Kanban')
      toast('Task queued for retry', 'success')
      onSaved(); onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to retry'
      setError(msg)
      toast(`Retry failed: ${msg}`, 'error')
    } finally { setSaving(false) }
  }

  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDeleteConfirmed = async () => {
    if (!data.task) return
    setDeleting(true); setError(null)
    try {
      await deleteTask(apiBaseUrl, data.task.id)
      toast('Task deleted', 'success')
      onSaved(); onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete'
      setError(msg)
      toast(`Delete failed: ${msg}`, 'error')
      setShowDeleteConfirm(false)
    } finally { setDeleting(false) }
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
              {agents.map((a) => (
                <option key={a.agent.id} value={a.agent.id}>{a.agent.name}</option>
              ))}
            </select>
          </label>
          <label className="kb-field"><span>Tags (comma separated)</span><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. bug, frontend" /></label>
          {data.task?.blockerReason && <div className="kb-blocker-info"><strong>Blocker:</strong> {data.task.blockerReason}</div>}
          {error && <div className="kb-error">{error}</div>}
        </div>
        <div className="kb-modal__footer">
          {!isCreate && <button className="action-btn action-btn--danger" onClick={() => setShowDeleteConfirm(true)} disabled={deleting || saving}>{deleting ? <><Spinner size={14} /> Deleting...</> : 'Delete'}</button>}
          {!isCreate && (data.task?.status === 'blocked' || data.task?.status === 'failed') && <button className="action-btn" onClick={handleRetry} disabled={saving}>{saving ? <><Spinner size={14} /> Retrying...</> : 'Retry'}</button>}
          <div style={{ flex: 1 }} />
          <button className="action-btn" onClick={onClose}>Cancel</button>
          <button className="action-btn action-btn--primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <><Spinner size={14} /> {isCreate ? 'Creating...' : 'Saving...'}</> : isCreate ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {showDeleteConfirm && data.task && (
        <div className="kb-modal-overlay kb-modal-overlay--top" onClick={() => setShowDeleteConfirm(false)}>
          <div className="kb-modal kb-modal--sm kb-modal--danger" onClick={(e) => e.stopPropagation()}>
            <div className="kb-modal__header">
              <h2>Delete Task</h2>
              <button className="kb-modal__close" onClick={() => setShowDeleteConfirm(false)}>✕</button>
            </div>
            <div className="kb-modal__body">
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>&ldquo;{data.task.title}&rdquo;</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="kb-modal__footer">
              <div style={{ flex: 1 }} />
              <button className="action-btn" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
              <button className="action-btn action-btn--danger" onClick={handleDeleteConfirmed} disabled={deleting}>
                {deleting ? <><Spinner size={14} /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [dragColumnId, setDragColumnId] = useState<string | null>(null)
  const [columnDropTarget, setColumnDropTarget] = useState<string | null>(null)
  const [loadingTaskIds, setLoadingTaskIds] = useState<Set<string>>(new Set())
  const { toasts, show: showToast, dismiss: dismissToast } = useToast()

  useEffect(() => { saveColumns(columns) }, [columns])

  const handleDragStart = useCallback((_e: React.DragEvent, taskId: string) => setDragTaskId(taskId), [])

  const handleDrop = useCallback(async (_e: React.DragEvent, targetStatus: string) => {
    if (!dragTaskId) return
    const task = tasks.find((t) => t.id === dragTaskId)
    if (!task || task.status === targetStatus) { setDragTaskId(null); return }
    const taskId = dragTaskId
    setDragTaskId(null)
    setLoadingTaskIds((prev) => new Set(prev).add(taskId))
    try {
      await updateTaskStatus(apiBaseUrl, taskId, { status: targetStatus })
      showToast(`Moved to ${targetStatus.replace(/_/g, ' ')}`, 'success')
    } catch (e: unknown) {
      showToast(`Move failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error')
    } finally {
      setLoadingTaskIds((prev) => { const next = new Set(prev); next.delete(taskId); return next })
    }
  }, [dragTaskId, tasks, apiBaseUrl, showToast])

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  const handleColumnDragStart = useCallback((_e: React.DragEvent, colId: string) => {
    setDragColumnId(colId)
  }, [])

  const handleColumnDragOver = useCallback((_e: React.DragEvent, colId: string) => {
    if (dragColumnId && dragColumnId !== colId) {
      setColumnDropTarget(colId)
    }
  }, [dragColumnId])

  const handleColumnDrop = useCallback((_e: React.DragEvent, targetColId: string) => {
    if (!dragColumnId || dragColumnId === targetColId) {
      setDragColumnId(null)
      setColumnDropTarget(null)
      return
    }
    setColumns((prev) => {
      const fromIdx = prev.findIndex((c) => c.id === dragColumnId)
      const toIdx = prev.findIndex((c) => c.id === targetColId)
      if (fromIdx < 0 || toIdx < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    setDragColumnId(null)
    setColumnDropTarget(null)
  }, [dragColumnId])

  const handleSaveColumn = useCallback((col: KanbanColumn) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.id === col.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = col; return next }
      return [...prev, col]
    })
    showToast('Column saved', 'success')
  }, [showToast])

  const handleDeleteColumn = useCallback((colId: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== colId))
    showToast('Column deleted', 'success')
  }, [showToast])

  const allMappedStatuses = columns.flatMap((c) => c.statuses)
  const unmapped = tasks.filter((t) => !allMappedStatuses.includes(t.status))

  return (
    <div className="kb-board">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

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
              onColumnDragStart={handleColumnDragStart}
              onColumnDragOver={handleColumnDragOver}
              onColumnDrop={handleColumnDrop}
              columnDragOver={columnDropTarget === col.id}
              loadingTaskIds={loadingTaskIds}
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

      {modal && <TaskModal data={modal} agents={agents} chatAgents={chatAgents} columns={columns} apiBaseUrl={apiBaseUrl} onClose={() => setModal(null)} onSaved={() => {}} toast={showToast} />}
      {columnModal && <ColumnEditorModal column={columnModal.column} onSave={handleSaveColumn} onClose={() => setColumnModal(null)} />}
    </div>
  )
}

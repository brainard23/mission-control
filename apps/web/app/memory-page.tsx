'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchChatAgents, type ChatAgent } from '../lib/api'

type MemoryFile = { name: string; path: string; date: string }

export function MemoryPage({ apiBaseUrl }: { apiBaseUrl: string }) {
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [originalContent, setOriginalContent] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ file?: string; chunk?: string; score?: number }[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load agents
  useEffect(() => {
    fetchChatAgents(apiBaseUrl).then((list) => {
      setAgents(list)
      if (list.length) setSelectedAgent(list[0].id)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [apiBaseUrl])

  // Load files when agent changes
  const loadFiles = useCallback(async (agentId: string) => {
    if (!agentId) return
    try {
      const r = await fetch(`${apiBaseUrl}/api/v1/memory/${agentId}/files`)
      const d = await r.json()
      setFiles(d.data?.files || [])
    } catch { setFiles([]) }
  }, [apiBaseUrl])

  useEffect(() => { if (selectedAgent) { loadFiles(selectedAgent); setSelectedFile(null); setContent('') } }, [selectedAgent, loadFiles])

  // Load file content
  const loadFile = useCallback(async (filename: string) => {
    setSelectedFile(filename)
    setEditing(false)
    try {
      const r = await fetch(`${apiBaseUrl}/api/v1/memory/${selectedAgent}/file/${filename}`)
      const d = await r.json()
      setContent(d.data?.content || '')
      setOriginalContent(d.data?.content || '')
    } catch { setContent('Failed to load file') }
  }, [apiBaseUrl, selectedAgent])

  // Save
  const handleSave = async () => {
    if (!selectedFile) return
    setSaving(true)
    try {
      await fetch(`${apiBaseUrl}/api/v1/memory/${selectedAgent}/file/${selectedFile}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setOriginalContent(content)
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const r = await fetch(`${apiBaseUrl}/api/v1/memory/search?q=${encodeURIComponent(searchQuery)}&agent=${selectedAgent}`)
      const d = await r.json()
      setSearchResults(d.data?.results || [])
    } catch { setSearchResults([]) }
    setSearching(false)
  }

  // Reindex
  const handleReindex = async () => {
    try { await fetch(`${apiBaseUrl}/api/v1/memory/reindex`, { method: 'POST' }) } catch {}
  }

  const hasChanges = content !== originalContent

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="memory-page">
      <div className="mem-header">
        <h2>Agent Memory</h2>
        <div className="mem-header__actions">
          <button className="action-btn" onClick={handleReindex} title="Reindex memory for search">Reindex</button>
        </div>
      </div>

      {/* Agent selector */}
      <div className="mem-agents">
        {agents.map((a) => (
          <button key={a.id} className={`mem-agent-btn${selectedAgent === a.id ? ' mem-agent-btn--active' : ''}`} onClick={() => setSelectedAgent(a.id)}>
            {a.emoji || '🤖'} {a.name}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="mem-search">
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search memory..." onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        <button className="action-btn" onClick={handleSearch} disabled={searching}>{searching ? '...' : 'Search'}</button>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mem-results">
          <h3>Search Results</h3>
          {searchResults.map((r, i) => (
            <div key={i} className="mem-result">
              {r.file && <span className="mem-result__file">{r.file}</span>}
              {r.chunk && <p>{r.chunk}</p>}
              {r.score != null && <span className="mem-result__score">{(r.score * 100).toFixed(0)}%</span>}
            </div>
          ))}
        </div>
      )}

      <div className="mem-layout">
        {/* File list */}
        <div className="mem-sidebar">
          <h3>Journal Entries ({files.length})</h3>
          <div className="mem-file-list">
            {files.map((f) => (
              <button key={f.name} className={`mem-file${selectedFile === f.name ? ' mem-file--active' : ''}`} onClick={() => loadFile(f.name)}>
                {f.name}
              </button>
            ))}
            {files.length === 0 && <p className="muted-sm">No memory files for this agent</p>}
          </div>
        </div>

        {/* Content viewer/editor */}
        <div className="mem-content">
          {!selectedFile && <div className="mem-empty">Select a journal entry to view</div>}
          {selectedFile && (
            <>
              <div className="mem-content__header">
                <h3>{selectedFile}</h3>
                <div className="mem-content__actions">
                  {!editing && <button className="action-btn" onClick={() => setEditing(true)}>Edit</button>}
                  {editing && (
                    <>
                      <button className="action-btn" onClick={() => { setEditing(false); setContent(originalContent) }}>Cancel</button>
                      <button className="action-btn action-btn--primary" onClick={handleSave} disabled={saving || !hasChanges}>{saving ? 'Saving...' : 'Save'}</button>
                    </>
                  )}
                </div>
              </div>
              {editing ? (
                <textarea className="mem-editor" value={content} onChange={(e) => setContent(e.target.value)} />
              ) : (
                <div className="mem-viewer">{content}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

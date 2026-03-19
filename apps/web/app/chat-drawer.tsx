'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatAgent, ChatMessage, ChatReply } from '../lib/api'
import {
  fetchChatAgents,
  fetchChatHistory,
  sendChatMessage,
} from '../lib/api'

type ChatDrawerProps = {
  apiBaseUrl: string
  open: boolean
  onClose: () => void
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`chat-msg chat-msg--${msg.role}`}>
      <div className="chat-msg__bubble">
        <p>{msg.text}</p>
      </div>
      <div className="chat-msg__meta">
        <span>{formatTime(msg.ts)}</span>
        {msg.model && <span>{msg.model}</span>}
        {msg.durationMs != null && <span>{(msg.durationMs / 1000).toFixed(1)}s</span>}
      </div>
    </div>
  )
}

export function ChatDrawer({ apiBaseUrl, open, onClose }: ChatDrawerProps) {
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loadingAgents, setLoadingAgents] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load agents when drawer opens
  useEffect(() => {
    if (!open) return
    setLoadingAgents(true)
    fetchChatAgents(apiBaseUrl)
      .then((list) => {
        setAgents(list)
        if (!selectedAgent && list.length) {
          const defaultAgent = list.find((a) => a.isDefault) || list[0]
          setSelectedAgent(defaultAgent.id)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingAgents(false))
  }, [open, apiBaseUrl])

  // Load history when agent changes
  useEffect(() => {
    if (!open || !selectedAgent) return
    fetchChatHistory(apiBaseUrl, selectedAgent)
      .then((history) => {
        setMessages(history)
        // Restore sessionId from last assistant message
        const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant')
        if (lastAssistant?.sessionId) setSessionId(lastAssistant.sessionId)
      })
      .catch(() => setMessages([]))
  }, [open, selectedAgent, apiBaseUrl])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, selectedAgent])

  const handleSend = useCallback(async () => {
    if (!input.trim() || !selectedAgent || sending) return
    const text = input.trim()
    setInput('')
    setError(null)
    setSending(true)

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      text,
      ts: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const result: ChatReply = await sendChatMessage(apiBaseUrl, selectedAgent, text, sessionId || undefined)
      if (result.sessionId) setSessionId(result.sessionId)

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        text: result.reply,
        ts: new Date().toISOString(),
        sessionId: result.sessionId,
        model: result.model,
        provider: result.provider,
        durationMs: result.durationMs,
        usage: result.usage,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }, [input, selectedAgent, sending, sessionId, apiBaseUrl])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const selectedAgentObj = agents.find((a) => a.id === selectedAgent)

  if (!open) return null

  return (
    <div className="chat-overlay" onClick={onClose}>
      <aside className="chat-drawer panel" onClick={(e) => e.stopPropagation()}>
        <header className="chat-drawer__header">
          <div>
            <span className="eyebrow">Chat with agent</span>
            <h2>
              {selectedAgentObj?.emoji || '🦞'}{' '}
              {selectedAgentObj?.name || selectedAgent || 'Select agent'}
            </h2>
          </div>
          <button className="chat-drawer__close" onClick={onClose} aria-label="Close chat">
            ✕
          </button>
        </header>

        {agents.length > 1 && (
          <div className="chat-drawer__agents">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={`pill${selectedAgent === agent.id ? ' pill--active' : ''}`}
                onClick={() => {
                  setSelectedAgent(agent.id)
                  setSessionId(null)
                  setError(null)
                }}
              >
                {agent.emoji || ''} {agent.name}
              </button>
            ))}
          </div>
        )}

        {sessionId && (
          <div className="chat-drawer__session">
            <span className="eyebrow">Session</span>
            <span>{sessionId.slice(0, 8)}…</span>
            {selectedAgentObj?.model && <span className="badge badge--ghost">{selectedAgentObj.model}</span>}
          </div>
        )}

        <div className="chat-drawer__messages">
          {loadingAgents && <p className="muted">Loading agents…</p>}
          {!loadingAgents && messages.length === 0 && (
            <p className="muted">
              No messages yet. Send a message to start chatting with{' '}
              {selectedAgentObj?.name || 'the agent'}.
            </p>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {sending && (
            <div className="chat-msg chat-msg--assistant">
              <div className="chat-msg__bubble chat-msg__bubble--thinking">
                <p>Thinking…</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="chat-drawer__error">
            {error}
          </div>
        )}

        <form className="chat-drawer__composer" onSubmit={(e) => { e.preventDefault(); handleSend() }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sending ? 'Waiting for reply…' : `Message ${selectedAgentObj?.name || 'agent'}…`}
            disabled={sending || !selectedAgent}
            rows={2}
          />
          <button
            type="submit"
            className="action-btn action-btn--primary"
            disabled={sending || !input.trim() || !selectedAgent}
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </aside>
    </div>
  )
}

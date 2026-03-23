import { openclawExec } from './lib/openclaw-exec.js'

const AGENT_TIMEOUT = Number(process.env.OPENCLAW_AGENT_TIMEOUT || 180)

// In-memory chat history per agent (persists across requests, not across restarts)
const chatHistory = new Map()

function getHistory(agentId) {
  if (!chatHistory.has(agentId)) chatHistory.set(agentId, [])
  return chatHistory.get(agentId)
}

export async function listAvailableAgents() {
  const agents = await openclawExec('openclaw agents list --json')
  return agents.map((a) => ({
    id: a.id,
    name: a.name || a.id,
    emoji: a.identityEmoji || null,
    model: a.model || null,
    isDefault: a.isDefault || false,
  }))
}

export async function sendAgentMessage(agentId, message, sessionId, { deliver, channel, replyTo } = {}) {
  const history = getHistory(agentId)

  // Record user message
  const userEntry = {
    id: `msg_${Date.now()}_user`,
    role: 'user',
    text: message,
    ts: new Date().toISOString(),
  }
  history.push(userEntry)

  const safeMsg = message.replace(/'/g, "'\\''")
  let cmd = `openclaw agent --agent ${agentId} --message '${safeMsg}' --json`
  if (sessionId) cmd += ` --session-id ${sessionId}`

  let result
  try {
    result = await openclawExec(cmd, { timeout: (AGENT_TIMEOUT + 10) * 1000, retries: 0 })
  } catch (err) {
    // If the command produced output but JSON parsing failed, return the raw text
    const rawOut = err.stdout || err.message || 'Agent did not return a valid response'
    const fallbackText = rawOut
      .replace(/^[\s\S]*?(?=\S)/, '') // trim leading whitespace
      .slice(0, 2000)
    const errorEntry = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      text: `⚠️ ${fallbackText}`,
      ts: new Date().toISOString(),
      sessionId: sessionId || null,
      model: null,
      provider: null,
      usage: null,
      durationMs: null,
    }
    history.push(errorEntry)
    return {
      reply: errorEntry.text,
      sessionId: sessionId || null,
      model: null,
      provider: null,
      durationMs: null,
      usage: null,
    }
  }

  const replyText = result.result?.payloads
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('\n') || result.summary || '(no response)'

  const meta = result.result?.meta?.agentMeta || {}

  // If deliver is on, send the agent's reply directly to the channel via `message send`
  // This is more reliable than --deliver because it sends the actual reply content
  let delivered = false
  if (deliver && channel && replyTo && replyText && replyText !== '(no response)') {
    try {
      await sendDirectMessage(channel, replyTo, replyText)
      delivered = true
    } catch (deliveryErr) {
      console.error('[chat] delivery failed:', deliveryErr.message || deliveryErr)
      delivered = 'failed'
    }
  }

  const assistantEntry = {
    id: `msg_${Date.now()}_assistant`,
    role: 'assistant',
    text: replyText,
    ts: new Date().toISOString(),
    sessionId: meta.sessionId || sessionId || null,
    model: meta.model || null,
    provider: meta.provider || null,
    usage: meta.usage || null,
    durationMs: result.result?.meta?.durationMs || null,
    delivered,
  }
  history.push(assistantEntry)

  return {
    reply: replyText,
    sessionId: meta.sessionId || sessionId || null,
    model: meta.model || null,
    provider: meta.provider || null,
    durationMs: result.result?.meta?.durationMs || null,
    usage: meta.usage || null,
    delivered,
  }
}

// Direct message send to a channel (bypasses agent entirely)
export async function sendDirectMessage(channel, target, message) {
  const safeMsg = message.replace(/'/g, "'\\''")
  const result = await openclawExec(
    `openclaw message send --channel ${channel} --target "${target}" --message '${safeMsg}' --json`,
    { timeout: 30000, retries: 1 }
  )
  return result
}

export function getChatHistory(agentId) {
  return getHistory(agentId)
}

export function clearChatHistory(agentId) {
  chatHistory.set(agentId, [])
}

// --- Skills & Agent detail ---

let skillsCache = null
let skillsCacheAt = 0
const SKILLS_CACHE_TTL = 60000 // 1 minute

export async function listSkills() {
  if (skillsCache && Date.now() - skillsCacheAt < SKILLS_CACHE_TTL) return skillsCache

  const data = await openclawExec('openclaw skills list --json', { timeout: 45000 })
  const result = (data.skills || []).map((s) => ({
    name: s.name,
    description: s.description || '',
    emoji: s.emoji || null,
    eligible: s.eligible || false,
    disabled: s.disabled || false,
    source: s.source || null,
    bundled: s.bundled || false,
    homepage: s.homepage || null,
    missing: s.missing || null,
  }))

  skillsCache = result
  skillsCacheAt = Date.now()
  return result
}

export async function listAgentSessions() {
  const data = await openclawExec('openclaw sessions --all-agents --json')
  return (data.sessions || []).map((s) => ({
    key: s.key,
    agentId: s.agentId || null,
    sessionId: s.sessionId || null,
    model: s.model || null,
    modelProvider: s.modelProvider || null,
    kind: s.kind || null,
    totalTokens: s.totalTokens ?? null,
    inputTokens: s.inputTokens ?? null,
    outputTokens: s.outputTokens ?? null,
    ageMs: s.ageMs ?? null,
    updatedAt: s.updatedAt ?? null,
  }))
}

export async function getOneAgentDetail(agentId) {
  const data = await openclawExec(`openclaw sessions --agent ${agentId} --json`)
  const sessions = (data.sessions || []).map((s) => ({
    key: s.key,
    agentId: s.agentId || agentId,
    sessionId: s.sessionId || null,
    model: s.model || null,
    modelProvider: s.modelProvider || null,
    kind: s.kind || null,
    totalTokens: s.totalTokens ?? null,
    inputTokens: s.inputTokens ?? null,
    outputTokens: s.outputTokens ?? null,
  }))

  const mainSession = sessions.find((s) => s.key?.includes(':main')) || null
  const subSessions = sessions.filter((s) => !s.key?.includes(':main'))

  return {
    agentId,
    sessions,
    mainSession,
    subAgents: subSessions.map((s) => ({
      key: s.key,
      kind: s.kind,
      model: s.model,
      totalTokens: s.totalTokens,
    })),
    totalTokens: sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
  }
}

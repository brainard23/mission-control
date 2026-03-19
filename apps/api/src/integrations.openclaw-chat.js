import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const OPENCLAW_CONTAINER = process.env.OPENCLAW_CONTAINER || 'openclaw-openclaw-gateway-1'
const AGENT_TIMEOUT = Number(process.env.OPENCLAW_AGENT_TIMEOUT || 120)

// In-memory chat history per agent (persists across requests, not across restarts)
const chatHistory = new Map()

function getHistory(agentId) {
  if (!chatHistory.has(agentId)) chatHistory.set(agentId, [])
  return chatHistory.get(agentId)
}

export async function listAvailableAgents() {
  const { stdout } = await execFileAsync('docker', [
    'exec', OPENCLAW_CONTAINER, 'openclaw', 'agents', 'list', '--json',
  ], { timeout: 15000, maxBuffer: 1024 * 1024 })

  const agents = JSON.parse(stdout)
  return agents.map((a) => ({
    id: a.id,
    name: a.name || a.id,
    emoji: a.identityEmoji || null,
    model: a.model || null,
    isDefault: a.isDefault || false,
  }))
}

export async function sendAgentMessage(agentId, message, sessionId) {
  const history = getHistory(agentId)

  // Record user message
  const userEntry = {
    id: `msg_${Date.now()}_user`,
    role: 'user',
    text: message,
    ts: new Date().toISOString(),
  }
  history.push(userEntry)

  const args = [
    'exec', OPENCLAW_CONTAINER, 'openclaw', 'agent',
    '--agent', agentId,
    '--message', message,
    '--json',
  ]
  if (sessionId) {
    args.push('--session-id', sessionId)
  }

  const { stdout } = await execFileAsync('docker', args, {
    timeout: (AGENT_TIMEOUT + 10) * 1000,
    maxBuffer: 2 * 1024 * 1024,
  })

  const result = JSON.parse(stdout)

  const replyText = result.result?.payloads
    ?.map((p) => p.text)
    .filter(Boolean)
    .join('\n') || '(no response)'

  const meta = result.result?.meta?.agentMeta || {}

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
  }
  history.push(assistantEntry)

  return {
    reply: replyText,
    sessionId: meta.sessionId || sessionId || null,
    model: meta.model || null,
    provider: meta.provider || null,
    durationMs: result.result?.meta?.durationMs || null,
    usage: meta.usage || null,
  }
}

export function getChatHistory(agentId) {
  return getHistory(agentId)
}

export function clearChatHistory(agentId) {
  chatHistory.set(agentId, [])
}

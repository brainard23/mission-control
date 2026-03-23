import { sendJson } from '../lib/http.js'
import {
  getAgentView,
  getAgentsView,
  getEventsView,
  getHealth,
  getOverview,
  getRoomsView,
  getSessionView,
  getSessionsView,
  getTaskView,
  getTasksView,
} from '../domain/services.js'
import { assignTask, createTaskView, retryTask, sendSessionMessage, stopSession, updateTask } from '../domain/commands.js'
import {
  agentIdParamSchema,
  assignTaskBodySchema,
  chatMessageBodySchema,
  createTaskBodySchema,
  idParamSchema,
  retryTaskBodySchema,
  sessionMessageBodySchema,
  sessionStopBodySchema,
  updateTaskBodySchema,
} from './schemas.js'
import {
  clearChatHistory,
  getChatHistory,
  getOneAgentDetail,
  listAgentSessions,
  listAvailableAgents,
  sendAgentMessage,
  sendDirectMessage,
} from '../integrations.openclaw-chat.js'
import {
  addCronJob, disableCronJob, editCronJob, enableCronJob,
  getCronRuns, getCronStatus, listCronJobs, removeCronJob, runCronJob,
} from '../integrations.openclaw-cron.js'
import { getContainerStats, runDiagnostics, reconnectChannel } from '../integrations.docker-stats.js'
import { listMemoryFiles, readMemoryFile, writeMemoryFile, getMemoryStatus, searchMemory, reindexMemory } from '../integrations.openclaw-memory.js'
import { listChannels, getChannelStatus, getChannelLogs, loginChannel, logoutChannel } from '../integrations.openclaw-channels.js'

export function registerRoutes(app) {
  app.get('/health', async (_request, reply) => {
    return sendJson(reply, 200, { ok: true, service: 'mission-control-api' })
  })

  app.get('/api/v1/health', async (_request, reply) => {
    return sendJson(reply, 200, { data: getHealth() })
  })

  app.get('/api/v1/overview', async (_request, reply) => {
    return sendJson(reply, 200, { data: await getOverview() })
  })

  app.get('/api/v1/agents', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getAgentsView() } })
  })

  app.get('/api/v1/agents/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getAgentView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'AGENT_NOT_FOUND', message: `Agent ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/sessions', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getSessionsView() } })
  })

  app.get('/api/v1/sessions/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getSessionView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/tasks', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getTasksView() } })
  })

  app.get('/api/v1/tasks/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    const view = await getTaskView(request.params.id)
    if (!view) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: view })
  })

  app.get('/api/v1/events', async (_request, reply) => {
    return sendJson(reply, 200, { data: { items: await getEventsView() } })
  })

  app.get('/api/v1/rooms', async (_request, reply) => {
    return sendJson(reply, 200, { data: await getRoomsView() })
  })

  app.post('/api/v1/tasks', { schema: { body: createTaskBodySchema } }, async (request, reply) => {
    const task = await createTaskView(request.body || {})
    return sendJson(reply, 201, { data: { task } })
  })

  app.patch('/api/v1/tasks/:id', { schema: { params: idParamSchema, body: updateTaskBodySchema } }, async (request, reply) => {
    const task = await updateTask(request.params.id, request.body || {})
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/assign', { schema: { params: idParamSchema, body: assignTaskBodySchema } }, async (request, reply) => {
    const task = await assignTask(request.params.id, request.body?.agentId)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/tasks/:id/retry', { schema: { params: idParamSchema, body: retryTaskBodySchema } }, async (request, reply) => {
    const task = await retryTask(request.params.id, request.body?.reason)
    if (!task) {
      return sendJson(reply, 404, { error: { code: 'TASK_NOT_FOUND', message: `Task ${request.params.id} was not found` } })
    }
    return sendJson(reply, 200, { data: { task } })
  })

  app.post('/api/v1/sessions/:id/message', { schema: { params: idParamSchema, body: sessionMessageBodySchema } }, async (request, reply) => {
    const result = await sendSessionMessage(request.params.id, request.body?.message)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })

  app.post('/api/v1/sessions/:id/stop', { schema: { params: idParamSchema, body: sessionStopBodySchema } }, async (request, reply) => {
    const result = await stopSession(request.params.id, request.body?.reason)
    if (!result) {
      return sendJson(reply, 404, { error: { code: 'SESSION_NOT_FOUND', message: `Session ${request.params.id} was not found` } })
    }
    return sendJson(reply, 202, { data: result })
  })

  // --- Chat routes ---

  app.get('/api/v1/chat/agents', async (_request, reply) => {
    try {
      const agents = await listAvailableAgents()
      return sendJson(reply, 200, { data: { agents } })
    } catch (error) {
      return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message || 'Failed to list agents' } })
    }
  })

  app.get('/api/v1/chat/:agentId/history', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    const messages = getChatHistory(request.params.agentId)
    return sendJson(reply, 200, { data: { messages } })
  })

  app.post('/api/v1/chat/:agentId/message', { schema: { params: agentIdParamSchema, body: chatMessageBodySchema } }, async (request, reply) => {
    try {
      const { message, sessionId, deliver, channel, replyTo } = request.body
      const result = await sendAgentMessage(
        request.params.agentId, message, sessionId,
        { deliver, channel, replyTo }
      )
      return sendJson(reply, 200, { data: result })
    } catch (error) {
      return sendJson(reply, 502, { error: { code: 'AGENT_ERROR', message: error.message || 'Agent failed to respond' } })
    }
  })

  app.delete('/api/v1/chat/:agentId/history', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    clearChatHistory(request.params.agentId)
    return sendJson(reply, 200, { data: { cleared: true } })
  })

  // --- Agent detail route (per agent) ---

  app.get('/api/v1/openclaw/agent/:agentId', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    try {
      const detail = await getOneAgentDetail(request.params.agentId)
      return sendJson(reply, 200, { data: detail })
    } catch (error) {
      console.error('Agent detail error:', error.message)
      return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message || 'Failed to get agent detail' } })
    }
  })

  // --- Usage ---

  app.get('/api/v1/usage/summary', async (_request, reply) => {
    try {
      const sessions = await listAgentSessions()
      const byAgent = {}
      const byModel = {}
      let totalTokens = 0; let totalInput = 0; let totalOutput = 0

      for (const s of sessions) {
        const agent = s.agentId || 'unknown'
        const model = s.model || 'unknown'
        const tokens = s.totalTokens || 0
        const input = s.inputTokens || 0
        const output = s.outputTokens || 0

        totalTokens += tokens; totalInput += input; totalOutput += output

        if (!byAgent[agent]) byAgent[agent] = { agentId: agent, totalTokens: 0, inputTokens: 0, outputTokens: 0, sessions: 0 }
        byAgent[agent].totalTokens += tokens; byAgent[agent].inputTokens += input; byAgent[agent].outputTokens += output; byAgent[agent].sessions++

        if (!byModel[model]) byModel[model] = { model, provider: s.modelProvider || 'unknown', totalTokens: 0, sessions: 0 }
        byModel[model].totalTokens += tokens; byModel[model].sessions++
      }

      return sendJson(reply, 200, { data: {
        totalTokens, totalInput, totalOutput,
        estimatedCostUsd: +(totalTokens * 0.000003).toFixed(4),
        byAgent: Object.values(byAgent),
        byModel: Object.values(byModel),
        sessionCount: sessions.length,
      }})
    } catch (error) {
      return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } })
    }
  })

  // --- Cron ---

  app.get('/api/v1/cron', async (_request, reply) => {
    try { return sendJson(reply, 200, { data: { jobs: await listCronJobs() } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/cron/status', async (_request, reply) => {
    try { return sendJson(reply, 200, { data: await getCronStatus() }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/cron', async (request, reply) => {
    try { return sendJson(reply, 201, { data: await addCronJob(request.body || {}) }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.patch('/api/v1/cron/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    try { return sendJson(reply, 200, { data: await editCronJob(request.params.id, request.body || {}) }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/cron/:id/toggle', { schema: { params: idParamSchema } }, async (request, reply) => {
    try {
      const enable = request.body?.enabled !== false
      const result = enable ? await enableCronJob(request.params.id) : await disableCronJob(request.params.id)
      return sendJson(reply, 200, { data: result })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/cron/:id/run', { schema: { params: idParamSchema } }, async (request, reply) => {
    try { return sendJson(reply, 200, { data: await runCronJob(request.params.id) }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.delete('/api/v1/cron/:id', { schema: { params: idParamSchema } }, async (request, reply) => {
    try { await removeCronJob(request.params.id); return sendJson(reply, 200, { data: { removed: true } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/cron/:id/runs', { schema: { params: idParamSchema } }, async (request, reply) => {
    try { return sendJson(reply, 200, { data: { runs: await getCronRuns(request.params.id) } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  // --- Diagnostics ---

  app.get('/api/v1/diagnostics', async (_request, reply) => {
    try {
      const [checks, container] = await Promise.all([runDiagnostics(), getContainerStats().catch(() => null)])
      return sendJson(reply, 200, { data: { checks, container } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'DIAGNOSTIC_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/diagnostics/container', async (_request, reply) => {
    try { return sendJson(reply, 200, { data: await getContainerStats() }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'DOCKER_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/diagnostics/reconnect', async (request, reply) => {
    try {
      const { channel, account } = request.body || {}
      if (!channel) return sendJson(reply, 400, { error: { code: 'BAD_REQUEST', message: 'channel is required' } })
      const result = await reconnectChannel(channel, account)
      return sendJson(reply, 200, { data: { message: result } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'RECONNECT_ERROR', message: error.message } }) }
  })

  // --- Agent Tree ---

  app.get('/api/v1/agents/tree', async (_request, reply) => {
    try {
      const [agents, sessions] = await Promise.all([listAvailableAgents(), listAgentSessions()])
      const tree = agents.map((agent) => {
        const agentSessions = sessions.filter((s) => s.agentId === agent.id)
        const main = agentSessions.find((s) => s.key?.includes(':main'))
        const children = agentSessions.filter((s) => !s.key?.includes(':main')).map((s) => ({
          key: s.key,
          label: s.key.replace(`agent:${agent.id}:`, ''),
          kind: s.kind,
          model: s.model,
          totalTokens: s.totalTokens || 0,
        }))
        return {
          id: agent.id,
          name: agent.name,
          emoji: agent.emoji,
          model: agent.model,
          isDefault: agent.isDefault,
          mainSession: main ? { key: main.key, model: main.model, totalTokens: main.totalTokens || 0 } : null,
          children,
          totalTokens: agentSessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
        }
      })
      return sendJson(reply, 200, { data: { tree } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'OPENCLAW_ERROR', message: error.message } }) }
  })

  // --- Memory ---

  app.get('/api/v1/memory/:agentId/files', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    try { return sendJson(reply, 200, { data: { files: await listMemoryFiles(request.params.agentId) } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/memory/:agentId/file/:filename', async (request, reply) => {
    try {
      const content = await readMemoryFile(request.params.agentId, request.params.filename)
      if (content === null) return sendJson(reply, 404, { error: { code: 'NOT_FOUND', message: 'File not found' } })
      return sendJson(reply, 200, { data: { filename: request.params.filename, content } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  app.put('/api/v1/memory/:agentId/file/:filename', async (request, reply) => {
    try {
      await writeMemoryFile(request.params.agentId, request.params.filename, request.body?.content || '')
      return sendJson(reply, 200, { data: { saved: true } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/memory/:agentId/status', { schema: { params: agentIdParamSchema } }, async (request, reply) => {
    try { return sendJson(reply, 200, { data: await getMemoryStatus(request.params.agentId) }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/memory/search', async (request, reply) => {
    try {
      const q = request.query?.q || ''
      const agent = request.query?.agent || 'anthropic'
      return sendJson(reply, 200, { data: { results: await searchMemory(agent, q) } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/memory/reindex', async (_request, reply) => {
    try { return sendJson(reply, 200, { data: { success: await reindexMemory() } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'MEMORY_ERROR', message: error.message } }) }
  })

  // --- Channels ---

  app.get('/api/v1/channels', async (_request, reply) => {
    try {
      const [channels, status] = await Promise.all([listChannels(), getChannelStatus()])
      return sendJson(reply, 200, { data: { channels, status } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'CHANNEL_ERROR', message: error.message } }) }
  })

  app.get('/api/v1/channels/logs', async (_request, reply) => {
    try { return sendJson(reply, 200, { data: { logs: await getChannelLogs() } }) }
    catch (error) { return sendJson(reply, 502, { error: { code: 'CHANNEL_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/channels/login', async (request, reply) => {
    try {
      const { channel, account } = request.body || {}
      if (!channel) return sendJson(reply, 400, { error: { code: 'BAD_REQUEST', message: 'channel is required' } })
      const result = await loginChannel(channel, account)
      return sendJson(reply, 200, { data: result })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'CHANNEL_ERROR', message: error.message } }) }
  })

  app.post('/api/v1/channels/logout', async (request, reply) => {
    try {
      const { channel, account } = request.body || {}
      if (!channel) return sendJson(reply, 400, { error: { code: 'BAD_REQUEST', message: 'channel is required' } })
      const result = await logoutChannel(channel, account)
      return sendJson(reply, 200, { data: { message: result } })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'CHANNEL_ERROR', message: error.message } }) }
  })

  // --- Direct message send (bypasses agent, sends directly to channel) ---
  app.post('/api/v1/message/send', async (request, reply) => {
    try {
      const { channel, target, message } = request.body || {}
      if (!channel || !target || !message) {
        return sendJson(reply, 400, { error: { code: 'BAD_REQUEST', message: 'channel, target, and message are required' } })
      }
      const result = await sendDirectMessage(channel, target, message)
      return sendJson(reply, 200, { data: result })
    } catch (error) { return sendJson(reply, 502, { error: { code: 'SEND_ERROR', message: error.message } }) }
  })
}

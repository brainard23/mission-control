import { exec, execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)
const OPENCLAW_CONTAINER = process.env.OPENCLAW_CONTAINER || 'openclaw-openclaw-gateway-1'
const MAX_BUF = 10 * 1024 * 1024

// Run an openclaw CLI command inside the container using execFile (no shell quoting issues)
async function dockerExecJson(cmd, { timeout = 15000 } = {}) {
  const { stdout } = await execFileAsync(
    'docker',
    ['exec', '-e', 'NO_COLOR=1', OPENCLAW_CONTAINER, 'sh', '-c', cmd],
    { timeout, maxBuffer: MAX_BUF }
  )
  const trimmed = stdout.trim()
  const i = trimmed.indexOf('{')
  const j = trimmed.indexOf('[')
  const start = i >= 0 && j >= 0 ? Math.min(i, j) : Math.max(i, j)
  if (start < 0) throw new Error('No JSON found in output')
  return JSON.parse(trimmed.slice(start))
}

async function dockerExecRaw(cmd, { timeout = 15000 } = {}) {
  const { stdout } = await execFileAsync(
    'docker',
    ['exec', '-e', 'NO_COLOR=1', OPENCLAW_CONTAINER, 'sh', '-c', cmd],
    { timeout, maxBuffer: MAX_BUF }
  )
  return stdout.trim()
}

export async function getContainerStats() {
  // docker stats uses --format which needs shell, but it's a direct docker command not openclaw
  const { stdout } = await execFileAsync(
    'docker',
    ['stats', OPENCLAW_CONTAINER, '--no-stream', '--format', '{{json .}}'],
    { timeout: 10000 }
  )
  return JSON.parse(stdout.trim())
}

export async function getContainerState() {
  const { stdout } = await execFileAsync(
    'docker',
    ['inspect', OPENCLAW_CONTAINER, '--format', '{{json .State}}'],
    { timeout: 10000 }
  )
  return JSON.parse(stdout.trim())
}

export async function runDiagnostics() {
  const checks = []

  // Check 1: Container running
  try {
    const state = await getContainerState()
    checks.push({
      name: 'Container Running',
      status: state.Running ? 'pass' : 'fail',
      message: state.Running ? `Up since ${state.StartedAt}` : 'Container is not running',
      detail: { restartCount: state.RestartCount, health: state.Health?.Status },
    })
  } catch (e) {
    checks.push({ name: 'Container Running', status: 'fail', message: e.message })
  }

  // Check 2: Resource usage
  try {
    const stats = await getContainerStats()
    const cpuPct = parseFloat(stats.CPUPerc) || 0
    const memPct = parseFloat(stats.MemPerc) || 0
    checks.push({
      name: 'CPU Usage',
      status: cpuPct > 90 ? 'warn' : 'pass',
      message: `${stats.CPUPerc} CPU`,
      detail: stats,
    })
    checks.push({
      name: 'Memory Usage',
      status: memPct > 85 ? 'warn' : memPct > 95 ? 'fail' : 'pass',
      message: `${stats.MemUsage} (${stats.MemPerc})`,
      detail: stats,
    })
  } catch (e) {
    checks.push({ name: 'Resources', status: 'fail', message: e.message })
  }

  // Check 3: Gateway reachable (via probe)
  try {
    const probe = await dockerExecJson('openclaw gateway probe --json')
    const target = probe.targets?.[0]
    checks.push({
      name: 'Gateway',
      status: probe.ok ? 'pass' : 'fail',
      message: probe.ok
        ? `Reachable (${target?.connect?.latencyMs || '?'}ms latency)`
        : 'Gateway not reachable',
      detail: { url: target?.url, latencyMs: target?.connect?.latencyMs, warnings: probe.warnings },
    })
  } catch (e) {
    checks.push({ name: 'Gateway', status: 'fail', message: e.message })
  }

  // Check 4: Channel health (WhatsApp etc.)
  try {
    const status = await dockerExecJson('openclaw channels status --json')
    const channels = status.channels || {}

    for (const [id, ch] of Object.entries(channels)) {
      const label = status.channelLabels?.[id] || id
      const connected = ch.connected && ch.linked
      const lastDisconnect = ch.lastDisconnect?.at
        ? new Date(ch.lastDisconnect.at).toLocaleString()
        : null

      checks.push({
        name: `${label} Channel`,
        status: connected ? 'pass' : ch.configured ? 'warn' : 'fail',
        message: connected
          ? `Connected${ch.self?.e164 ? ` (${ch.self.e164})` : ''} · ${ch.reconnectAttempts || 0} reconnects`
          : ch.configured
            ? `Disconnected${lastDisconnect ? ` (last: ${lastDisconnect})` : ''} — needs re-login`
            : 'Not configured',
        detail: {
          configured: ch.configured,
          linked: ch.linked,
          connected: ch.connected,
          running: ch.running,
          lastConnectedAt: ch.lastConnectedAt,
          lastDisconnect: ch.lastDisconnect,
          reconnectAttempts: ch.reconnectAttempts,
          lastError: ch.lastError,
          self: ch.self,
        },
      })
    }

    if (Object.keys(channels).length === 0) {
      checks.push({ name: 'Channels', status: 'warn', message: 'No channels configured' })
    }
  } catch (e) {
    checks.push({ name: 'Channels', status: 'fail', message: e.message })
  }

  // Check 5: Security audit
  try {
    const audit = await dockerExecJson('openclaw security audit --json')
    const summary = audit.summary || {}
    const critCount = summary.critical || 0
    const warnCount = summary.warn || 0

    checks.push({
      name: 'Security Audit',
      status: critCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
      message: critCount > 0
        ? `${critCount} critical findings`
        : warnCount > 0
          ? `${warnCount} warnings`
          : 'No issues found',
      detail: {
        summary,
        findings: (audit.findings || []).map((f) => ({
          title: f.title,
          severity: f.severity,
          detail: f.detail,
          remediation: f.remediation,
        })),
      },
    })
  } catch (e) {
    checks.push({ name: 'Security Audit', status: 'fail', message: e.message })
  }

  // Check 6: Update available
  try {
    const update = await dockerExecJson('openclaw update status --json')
    const hasUpdate = update.updateAvailable || update.available
    checks.push({
      name: 'Updates',
      status: hasUpdate ? 'warn' : 'pass',
      message: hasUpdate
        ? `Update available: ${update.latestVersion || update.latest || 'newer version'}`
        : `Up to date (${update.currentVersion || update.current || 'latest'})`,
      detail: update,
    })
  } catch (e) {
    // Non-critical — update status --json may not be supported
    checks.push({ name: 'Updates', status: 'pass', message: 'Could not check for updates' })
  }

  return checks
}

// Reconnect a channel (e.g. WhatsApp)
export async function reconnectChannel(channel, account) {
  const acct = account || 'default'
  return dockerExecRaw(`openclaw channels login --channel ${channel} --account ${acct} 2>&1`, { timeout: 30000 })
}

// Get channel health status (lightweight — just WhatsApp connection check)
export async function getChannelHealth() {
  return dockerExecJson('openclaw channels status --json', { timeout: 10000 })
}

// --- Auto-reconnect watchdog ---
// Polls channel health every 60s and auto-reconnects if WhatsApp drops

let watchdogInterval = null
let watchdogReconnecting = false
const WATCHDOG_INTERVAL_MS = 60_000  // check every 60s
const MAX_AUTO_RECONNECTS = 5        // stop after 5 consecutive auto-reconnects
let consecutiveReconnects = 0

async function watchdogTick() {
  if (watchdogReconnecting) return
  try {
    const status = await getChannelHealth()
    const channels = status.channels || {}

    for (const [id, ch] of Object.entries(channels)) {
      // Only auto-reconnect if: configured + linked (auth exists) + not connected
      if (ch.configured && ch.linked && !ch.connected && !ch.loggedOut) {
        if (consecutiveReconnects >= MAX_AUTO_RECONNECTS) {
          console.warn(`[watchdog] ${id}: skipping auto-reconnect — ${MAX_AUTO_RECONNECTS} consecutive attempts reached. Manual intervention needed.`)
          continue
        }
        console.log(`[watchdog] ${id}: disconnected (error: ${ch.lastError || 'unknown'}). Auto-reconnecting...`)
        watchdogReconnecting = true
        try {
          await reconnectChannel(id)
          consecutiveReconnects++
          console.log(`[watchdog] ${id}: reconnect triggered (attempt ${consecutiveReconnects})`)
        } catch (e) {
          console.error(`[watchdog] ${id}: reconnect failed:`, e.message)
          consecutiveReconnects++
        } finally {
          watchdogReconnecting = false
        }
      } else if (ch.connected) {
        // Reset counter when connection is healthy
        if (consecutiveReconnects > 0) {
          console.log(`[watchdog] ${id}: connected again — resetting reconnect counter`)
          consecutiveReconnects = 0
        }
      }
    }
  } catch (e) {
    // Silently ignore — container might be restarting
  }
}

export function startChannelWatchdog() {
  if (watchdogInterval) return
  console.log('[watchdog] Channel auto-reconnect watchdog started (checking every 60s)')
  watchdogInterval = setInterval(watchdogTick, WATCHDOG_INTERVAL_MS)
  // Run first check after 10s to let the server finish starting
  setTimeout(watchdogTick, 10_000)
}

export function stopChannelWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval)
    watchdogInterval = null
    console.log('[watchdog] Channel watchdog stopped')
  }
}

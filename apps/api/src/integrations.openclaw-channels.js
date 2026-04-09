import { spawn } from 'node:child_process'
import { openclawExec, openclawExecRaw, OPENCLAW_CONTAINER } from './lib/openclaw-exec.js'

let channelsCache = null
let channelsCacheAt = 0
const CACHE_TTL = 30000 // 30s

export async function listChannels() {
  if (channelsCache && Date.now() - channelsCacheAt < CACHE_TTL) return channelsCache
  try {
    const result = await openclawExec('openclaw channels list --json', { timeout: 60000, retries: 1 })
    channelsCache = result
    channelsCacheAt = Date.now()
    return result
  } catch (err) {
    // Return cached data if available, even if stale
    if (channelsCache) return channelsCache
    throw err
  }
}

let statusCache = null
let statusCacheAt = 0

export async function getChannelStatus() {
  if (statusCache && Date.now() - statusCacheAt < CACHE_TTL) return statusCache
  try {
    const result = await openclawExec('openclaw channels status --json', { timeout: 60000, retries: 1 })
    statusCache = result
    statusCacheAt = Date.now()
    return result
  } catch {
    if (statusCache) return statusCache
    return null
  }
}

export async function getChannelLogs() {
  try {
    return await openclawExecRaw('openclaw channels logs 2>/dev/null | tail -30')
  } catch {
    return ''
  }
}

export function loginChannel(channel, account) {
  return new Promise((resolve) => {
    const output = []
    const proc = spawn('docker', [
      'exec', OPENCLAW_CONTAINER, 'openclaw', 'channels', 'login',
      '--channel', channel,
      ...(account ? ['--account', account] : []),
      '--verbose',
    ], { timeout: 35000 })

    proc.stdout.on('data', (data) => output.push(data.toString()))
    proc.stderr.on('data', (data) => output.push(data.toString()))

    const timer = setTimeout(() => {
      proc.kill()
      resolve({ output: output.join(''), status: 'timeout', message: 'Login process running — check your phone to scan QR if WhatsApp' })
    }, 30000)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ output: output.join(''), status: code === 0 ? 'success' : 'error', message: code === 0 ? 'Login completed' : 'Login process ended' })
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      resolve({ output: output.join(''), status: 'error', message: err.message })
    })
  })
}

export async function logoutChannel(channel, account) {
  return openclawExecRaw(`openclaw channels logout --channel ${channel}${account ? ` --account ${account}` : ''}`)
}

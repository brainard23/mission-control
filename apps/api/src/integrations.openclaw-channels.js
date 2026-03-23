import { spawn } from 'node:child_process'
import { openclawExec, openclawExecRaw, OPENCLAW_CONTAINER } from './lib/openclaw-exec.js'

export async function listChannels() {
  return openclawExec('openclaw channels list --json', { timeout: 45000 })
}

export async function getChannelStatus() {
  try {
    return await openclawExec('openclaw channels status --json', { timeout: 45000 })
  } catch {
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

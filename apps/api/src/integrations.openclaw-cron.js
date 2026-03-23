import { openclawExec } from './lib/openclaw-exec.js'

export async function listCronJobs() {
  const data = await openclawExec('openclaw cron list --json')
  return data.jobs || []
}

export async function getCronStatus() {
  return openclawExec('openclaw cron status --json')
}

export async function addCronJob({ name, agent, message, cron, every, description, disabled, announce, channel, to }) {
  const parts = ['openclaw cron add --json']
  if (name) parts.push(`--name "${name}"`)
  if (agent) parts.push(`--agent ${agent}`)
  if (message) parts.push(`--message "${message.replace(/"/g, '\\"')}"`)
  if (cron) parts.push(`--cron "${cron}"`)
  if (every) parts.push(`--every ${every}`)
  if (description) parts.push(`--description "${description.replace(/"/g, '\\"')}"`)
  if (disabled) parts.push('--disabled')
  if (announce) parts.push('--announce')
  if (channel) parts.push(`--channel ${channel}`)
  if (to) parts.push(`--to ${to}`)
  return openclawExec(parts.join(' '), { retries: 0 })
}

export async function editCronJob(id, patch) {
  const parts = [`openclaw cron edit ${id} --json`]
  if (patch.name) parts.push(`--name "${patch.name}"`)
  if (patch.message) parts.push(`--message "${patch.message.replace(/"/g, '\\"')}"`)
  if (patch.cron) parts.push(`--cron "${patch.cron}"`)
  if (patch.every) parts.push(`--every ${patch.every}`)
  if (patch.description) parts.push(`--description "${patch.description.replace(/"/g, '\\"')}"`)
  return openclawExec(parts.join(' '), { retries: 0 })
}

export async function enableCronJob(id) {
  return openclawExec(`openclaw cron enable ${id} --json`, { retries: 0 })
}

export async function disableCronJob(id) {
  return openclawExec(`openclaw cron disable ${id} --json`, { retries: 0 })
}

export async function removeCronJob(id) {
  return openclawExec(`openclaw cron rm ${id} --json`, { retries: 0 })
}

export async function runCronJob(id) {
  return openclawExec(`openclaw cron run ${id} --json`, { timeout: 120000, retries: 0 })
}

export async function getCronRuns(id) {
  try {
    const data = await openclawExec(`openclaw cron runs ${id} --json`)
    return Array.isArray(data) ? data : data.runs || []
  } catch {
    return []
  }
}

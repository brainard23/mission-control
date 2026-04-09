import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
})

export async function query(text, params) {
  const result = await pool.query(text, params)
  return result
}

export async function initDb() {
  try {
    await pool.query('SELECT 1')
    console.log('Database connected')

    // Drop agent FK constraints — agents can come from runtime, not just the DB
    await pool.query(`
      ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_agent_id_fkey;
      ALTER TABLE events DROP CONSTRAINT IF EXISTS events_agent_id_fkey;
      ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_agent_id_fkey;
      ALTER TABLE placements DROP CONSTRAINT IF EXISTS placements_agent_id_fkey
    `).catch(() => {})
  } catch (error) {
    console.error('Database connection failed:', error.message)
    throw error
  }
}

export default pool

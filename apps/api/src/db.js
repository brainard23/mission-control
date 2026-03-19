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
  } catch (error) {
    console.error('Database connection failed:', error.message)
    throw error
  }
}

export default pool

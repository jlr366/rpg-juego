const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function clean() {
  try {
    console.log('🗑️  Limpiando BD...')
    
    // Mostrar usuarios antes
    const before = await pool.query('SELECT * FROM users')
    console.log(`📊 Usuarios antes: ${before.rows.length}`)
    before.rows.forEach(u => console.log(`   - ${u.id}: ${u.username}`))
    
    // Limpiar
    await pool.query('TRUNCATE TABLE users CASCADE')
    console.log('✅ TRUNCATE ejecutado')
    
    // Mostrar después
    const after = await pool.query('SELECT * FROM users')
    console.log(`📊 Usuarios después: ${after.rows.length}`)
    
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

clean()
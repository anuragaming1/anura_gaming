import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectToDatabase() {
  try {
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Test query để kiểm tra kết nối
    await client.query('SELECT NOW()');
    console.log('✅ Database test query successful');
    
    // Tạo tables nếu chưa tồn tại
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        script_name VARCHAR(100) NOT NULL,
        curl_content TEXT,
        web_content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, script_name)
      );
    `);
    
    console.log('✅ Database tables ready');
    return { client, pool };
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// db.js - Optimized untuk FreeDB dengan connection limit
const mysql = require('mysql2/promise');

// Singleton pattern untuk reuse connection
let pool = null;

const createPool = () => {
  if (pool) {
    return pool;
  }
  
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    
    // Optimized untuk FreeDB limits
    connectionLimit: 1,          // Hanya 1 koneksi aktif
    acquireTimeout: 60000,       // 60 detik timeout
    timeout: 30000,              // 30 detik query timeout
    reconnect: true,             // Auto reconnect
    idleTimeout: 300000,         // 5 menit idle timeout
    
    // Connection management
    waitForConnections: true,
    queueLimit: 10,              // Max 10 queued requests
    
    // SSL configuration
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Error handling untuk pool
  pool.on('connection', (connection) => {
    console.log('📡 New database connection established as id ' + connection.threadId);
  });

  pool.on('error', (err) => {
    console.error('💥 Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 Attempting to reconnect to database...');
    }
  });

  return pool;
};

// Export function yang return pool
const getPool = () => {
  return createPool();
};

// Test connection dengan retry mechanism
const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const currentPool = getPool();
      const connection = await currentPool.getConnection();
      console.log(`✅ Database connected successfully (attempt ${i + 1})`);
      console.log('Host:', process.env.DB_HOST);
      console.log('Database:', process.env.DB_NAME);
      connection.release(); // IMPORTANT: Release connection!
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        console.error('🚫 All connection attempts failed');
        return;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Jalankan test connection saat startup
testConnection();

module.exports = getPool();
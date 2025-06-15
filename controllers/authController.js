// controllers/authController.js - Optimized untuk FreeDB
const pool = require("../db");

const loginAdmin = async (req, res) => {
  console.log('=== LOGIN ADMIN START ===');
  
  let connection = null;
  
  try {
    const { username, password } = req.body;
    
    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ 
        message: "Username dan password harus diisi"
      });
    }

    console.log('Getting database connection...');
    
    // Get connection from pool
    connection = await pool.getConnection();
    console.log('✅ Connection acquired');
    
    // Execute query
    const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";
    const [results] = await connection.execute(sql, [username, password]);
    
    console.log('Query executed, results count:', results.length);

    if (results.length === 0) {
      return res.status(401).json({ 
        message: "Username atau password salah"
      });
    }

    console.log('✅ Login successful');
    return res.status(200).json({ 
      message: "Login berhasil",
      user: {
        id: results[0].id,
        username: results[0].username
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    console.error('Error code:', error.code);
    
    // Handle specific FreeDB errors
    if (error.message.includes('max_connections_per_hour')) {
      return res.status(429).json({ 
        message: "Terlalu banyak koneksi database. Silakan coba lagi dalam beberapa menit.",
        error: "Database connection limit exceeded",
        retryAfter: 3600 // 1 hour in seconds
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: "Database sedang tidak tersedia",
        error: "Service unavailable"
      });
    }
    
    return res.status(500).json({ 
      message: "Terjadi kesalahan server", 
      error: "Internal server error"
    });
    
  } finally {
    // ALWAYS release connection back to pool
    if (connection) {
      console.log('🔄 Releasing connection...');
      connection.release();
      console.log('✅ Connection released');
    }
  }
};

const healthCheck = (req, res) => {
  console.log('Health check called');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Auth service is running'
  });
};

const testDbConnection = async (req, res) => {
  let connection = null;
  
  try {
    console.log('Testing database connection...');
    
    // Get connection
    connection = await pool.getConnection();
    console.log('✅ Connection acquired for test');
    
    // Simple test query
    const [results] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Test query successful');
    
    res.status(200).json({ 
      status: 'Database connected', 
      result: results[0],
      message: 'Connection test successful'
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    
    if (error.message.includes('max_connections_per_hour')) {
      res.status(429).json({ 
        status: 'Connection limit exceeded', 
        error: 'Database hourly connection limit reached',
        retryAfter: 3600
      });
    } else {
      res.status(500).json({ 
        status: 'Database connection failed', 
        error: error.message
      });
    }
    
  } finally {
    if (connection) {
      console.log('🔄 Releasing test connection...');
      connection.release();
    }
  }
};

module.exports = { 
  loginAdmin,
  healthCheck,
  testDbConnection
};
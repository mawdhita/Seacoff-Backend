// controllers/authController.js
const pool = require("../db"); // Pastikan menggunakan pool bukan db

const loginAdmin = async (req, res) => {
  console.log('Login attempt started');
  console.log('Request body:', req.body);
  
  try {
    const { username, password } = req.body;

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ 
        message: "Username dan password harus diisi" 
      });
    }

    console.log('Attempting database query...');
    
    // Gunakan pool.query dengan Promise (bukan callback)
    const sql = "SELECT * FROM admins WHERE username = ? AND password = ?";
    
    // Tambahkan timeout untuk database query
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout after 15 seconds')), 15000)
    );
    
    const queryPromise = pool.query(sql, [username, password]);
    
    const [results] = await Promise.race([queryPromise, timeoutPromise]);
    
    console.log('Database query completed, results count:', results.length);

    if (results.length === 0) {
      console.log('Invalid credentials for username:', username);
      return res.status(401).json({ 
        message: "Username atau password salah" 
      });
    }

    console.log('Login successful for username:', username);
    return res.status(200).json({ 
      message: "Login berhasil",
      user: {
        id: results[0].id,
        username: results[0].username
      }
    });

  } catch (error) {
    console.error('Login error details:', error);
    
    // Handle different types of errors
    if (error.message.includes('timeout')) {
      return res.status(504).json({ 
        message: "Database connection timeout",
        error: "Server sedang mengalami masalah koneksi database"
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        message: "Database connection refused",
        error: "Tidak dapat terhubung ke database"
      });
    }
    
    return res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Tambahkan health check function
const healthCheck = (req, res) => {
  console.log('Health check called');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Auth service is running'
  });
};

// Test database connection
const testDbConnection = async (req, res) => {
  try {
    console.log('Testing database connection...');
    const [results] = await pool.query('SELECT 1 as test');
    console.log('Database connection test successful');
    res.status(200).json({ 
      status: 'Database connected', 
      result: results[0] 
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: error.message 
    });
  }
};

module.exports = { 
  loginAdmin,
  healthCheck,
  testDbConnection
};
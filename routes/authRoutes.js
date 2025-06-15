// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// CORS headers untuk semua auth routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://seacoff-frontend.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  next();
});

// Health check endpoint (tambahkan jika ada di controller)
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Auth service is running'
  });
});

// Database connection test endpoint
router.get('/test-db', async (req, res) => {
  try {
    const pool = require('../db');
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
});

// Login endpoint
router.post('/login', authController.loginAdmin);

module.exports = router;
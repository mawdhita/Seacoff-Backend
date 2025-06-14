const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Import routes dengan error handling
let orderRoutes, cartRoutes, authRoutes, dashboardRoutes;

try {
  orderRoutes = require('./routes/orderRoutes');
  cartRoutes = require('./routes/cartRoutes');
  authRoutes = require('./routes/authRoutes');
  dashboardRoutes = require('./routes/dashboardRoutes');
} catch (error) {
  console.error('Error loading routes:', error);
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('uploads'));

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://seacoff-backend.vercel.app';

// Utility functions
function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}/uploads/placeholder.png`;
  }
  return `${BASE_URL}/uploads/${foto_menu}`;
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint (harus di atas semua route lain)
app.get('/', (req, res) => {
  res.json({
    message: 'API Seacoff sudah jalan!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    status: 'OK'
  });
});

// Favicon handler
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/favicon.png', (req, res) => {
  res.status(204).end();
});

// PUBLIC ROUTES

// Route: Get all menu
app.get('/menus', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      limit = 50, 
      offset = 0, 
      sort_by = 'id_menu',
      sort_order = 'DESC'
    } = req.query;

    let query = 'SELECT * FROM menu WHERE 1=1';
    const params = [];

    // Filter by category
    if (category) {
      query += ' AND kategori = ?';
      params.push(category);
    }

    // Search functionality
    if (search) {
      query += ' AND (nama_menu LIKE ? OR deskripsi LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    const allowedSortFields = ['id_menu', 'nama_menu', 'harga', 'kategori'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    if (allowedSortFields.includes(sort_by) && allowedSortOrders.includes(sort_order.toUpperCase())) {
      query += ` ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
    } else {
      query += ' ORDER BY id_menu DESC';
    }

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [results] = await pool.query(query, params);

    const menus = results.map((menu) => ({
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
    }));

    res.json({
      success: true,
      data: menus,
      count: menus.length
    });
  } catch (err) {
    console.error('Error ambil data menu:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal ambil data menu'
    });
  }
});

// Route: Get detail menu by ID
app.get('/DetailMenu/:id', async (req, res) => {
  const { id } = req.params;
  
  // Validate ID
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID menu tidak valid'
    });
  }

  try {
    const [results] = await pool.query(
      'SELECT * FROM menu WHERE id_menu = ?',
      [parseInt(id)]
    );
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu tidak ditemukan'
      });
    }
    
    const menu = results[0];
    const menuWithUrl = {
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
    };
    
    res.json({
      success: true,
      data: menuWithUrl
    });
  } catch (err) {
    console.error('Gagal ambil detail menu:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal ambil data menu'
    });
  }
});

// Route: Get menu categories
app.get('/menu-categories', async (req, res) => {
  try {
    const [results] = await pool.query(
      'SELECT DISTINCT kategori, COUNT(*) as count FROM menu GROUP BY kategori ORDER BY kategori'
    );
    
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error('Error ambil kategori menu:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal ambil kategori menu'
    });
  }
});

// ROUTE HANDLERS dengan error handling
if (authRoutes) {
  app.use('/api/auth', authRoutes);
}

if (dashboardRoutes) {
  app.use('/api/dashboard', dashboardRoutes);
}

if (cartRoutes) {
  app.use('/api', cartRoutes);
}

if (orderRoutes) {
  app.use('/api', orderRoutes);
}

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    title: 'Seacoff API Documentation',
    version: '2.0.0',
    base_url: BASE_URL,
    endpoints: {
      public: [
        'GET / - Health check',
        'GET /menus - Get all menu items',
        'GET /DetailMenu/:id - Get menu detail by ID',
        'GET /menu-categories - Get menu categories',
        'POST /api/auth/login - Admin login'
      ],
      protected: [
        'GET /api/dashboard/* - Dashboard endpoints (requires auth)',
        'GET /api/orders/* - Order endpoints (requires auth)'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint tidak ditemukan',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
  });
}

module.exports = app;

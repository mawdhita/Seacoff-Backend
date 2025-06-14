const express = require('express');
const cors = require('cors');
const pool = require('./db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
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

// Validation middleware
const validateMenuId = (req, res, next) => {
  const { id } = req.params;
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: 'ID menu tidak valid'
    });
  }
  next();
};

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Token akses diperlukan'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key', (err, admin) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token tidak valid'
      });
    }
    req.admin = admin;
    next();
  });
};

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// PUBLIC ROUTES

// Route: Get all menu with filtering and pagination
app.get('/menus', async (req, res) => {
  try {
    const { 
      category, 
      search, 
      limit = 50, 
      offset = 0, 
      sort_by = 'id_menu',
      sort_order = 'DESC',
      status = 'active'
    } = req.query;

    let query = 'SELECT * FROM menu WHERE 1=1';
    const params = [];

    // Filter by status
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

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
    const allowedSortFields = ['id_menu', 'nama_menu', 'harga', 'kategori', 'created_at'];
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
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM menu WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (category) {
      countQuery += ' AND kategori = ?';
      countParams.push(category);
    }
    if (search) {
      countQuery += ' AND (nama_menu LIKE ? OR deskripsi LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await pool.query(countQuery, countParams);
    const totalItems = countResult[0].total;

    const menus = results.map((menu) => ({
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
    }));

    res.json({
      success: true,
      data: menus,
      pagination: {
        current_page: Math.floor(offset / limit) + 1,
        per_page: parseInt(limit),
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit),
        has_next: (parseInt(offset) + parseInt(limit)) < totalItems,
        has_prev: parseInt(offset) > 0
      }
    });
  } catch (err) {
    console.error('Error ambil data menu:', err);
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
      'SELECT DISTINCT kategori, COUNT(*) as count FROM menu WHERE status = "active" GROUP BY kategori ORDER BY kategori'
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

// Route: Get detail menu by ID
app.get('/DetailMenu/:id', validateMenuId, async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await pool.query(
      'SELECT * FROM menu WHERE id_menu = ? AND status = "active"',
      [id]
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

// PROTECTED ROUTES (require authentication)

// Route: Get all orders (protected)
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const { 
      status, 
      limit = 50, 
      offset = 0, 
      start_date, 
      end_date,
      customer_name 
    } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    // Filter by status
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Filter by date range
    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    // Filter by customer name
    if (customer_name) {
      query += ' AND nama_pelanggan LIKE ?';
      params.push(`%${customer_name}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [results] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const countParams = [];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    if (start_date) {
      countQuery += ' AND DATE(created_at) >= ?';
      countParams.push(start_date);
    }
    if (end_date) {
      countQuery += ' AND DATE(created_at) <= ?';
      countParams.push(end_date);
    }
    if (customer_name) {
      countQuery += ' AND nama_pelanggan LIKE ?';
      countParams.push(`%${customer_name}%`);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const totalItems = countResult[0].total;

    res.json({
      success: true,
      data: results,
      pagination: {
        current_page: Math.floor(offset / limit) + 1,
        per_page: parseInt(limit),
        total_items: totalItems,
        total_pages: Math.ceil(totalItems / limit)
      }
    });
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal ambil data orders'
    });
  }
});

// Route: Get order statistics (protected)
app.get('/order-stats', authenticateToken, async (req, res) => {
  try {
    const [statusStats] = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_pesanan) as total_value
      FROM orders 
      GROUP BY status
    `);

    const [todayStats] = await pool.query(`
      SELECT 
        COUNT(*) as today_orders,
        COALESCE(SUM(total_pesanan), 0) as today_revenue
      FROM orders 
      WHERE DATE(created_at) = CURDATE()
    `);

    const [monthStats] = await pool.query(`
      SELECT 
        COUNT(*) as month_orders,
        COALESCE(SUM(total_pesanan), 0) as month_revenue
      FROM orders 
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
    `);

    res.json({
      success: true,
      data: {
        status_breakdown: statusStats,
        today: todayStats[0],
        this_month: monthStats[0]
      }
    });
  } catch (err) {
    console.error('Gagal ambil statistik orders:', err);
    res.status(500).json({
      success: false,
      error: 'Gagal ambil statistik orders'
    });
  }
});

// ROUTE HANDLERS
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'API Seacoff sudah jalan!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      public: [
        'GET /menus - Get all menu items',
        'GET /menu-categories - Get menu categories',
        'GET /DetailMenu/:id - Get menu detail by ID',
        'POST /api/auth/login - Admin login'
      ],
      protected: [
        'GET /orders - Get all orders (requires auth)',
        'GET /order-stats - Get order statistics (requires auth)',
        'GET /api/dashboard/* - Dashboard endpoints (requires auth)'
      ]
    }
  });
});

// API documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    title: 'Seacoff API Documentation',
    version: '2.0.0',
    base_url: BASE_URL,
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      login_endpoint: '/api/auth/login'
    },
    endpoints: {
      menu: {
        'GET /menus': {
          description: 'Get all menu items with filtering and pagination',
          parameters: {
            category: 'Filter by category',
            search: 'Search in name and description',
            limit: 'Items per page (default: 50)',
            offset: 'Pagination offset (default: 0)',
            sort_by: 'Sort field (default: id_menu)',
            sort_order: 'Sort order ASC/DESC (default: DESC)'
          }
        },
        'GET /DetailMenu/:id': {
          description: 'Get menu item details by ID',
          parameters: {
            id: 'Menu ID (required)'
          }
        },
        'GET /menu-categories': {
          description: 'Get all menu categories with count'
        }
      },
      orders: {
        'GET /orders': {
          description: 'Get orders with filtering (requires auth)',
          parameters: {
            status: 'Filter by order status',
            start_date: 'Filter from date (YYYY-MM-DD)',
            end_date: 'Filter to date (YYYY-MM-DD)',
            customer_name: 'Filter by customer name',
            limit: 'Items per page',
            offset: 'Pagination offset'
          }
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint tidak ditemukan',
    available_endpoints: [
      'GET /',
      'GET /api-docs',
      'GET /menus',
      'GET /DetailMenu/:id',
      'POST /api/auth/login'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token tidak valid'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token sudah expired'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File terlalu besar'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Terjadi kesalahan server',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  app.close(() => {
    console.log('Closed all connections.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  app.close(() => {
    console.log('Closed all connections.');
    process.exit(0);
  });
});

app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
});

module.exports = app;
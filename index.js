const express = require('express');
const cors = require('cors');
const pool = require('./db');  
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 8000;

// Import routes
const menuRoutes = require('./routes/menuRoutes');
const salesRoutes = require('./routes/salesRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://seacoff-frontend.vercel.app'], // Specific origins for security
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Constants
const BASE_URL = 'https://raw.githubusercontent.com/mawdhita/Seacoff-Backend/main/uploads/';

// Helper function
function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}placeholder.png`;
  }
  // Ensure no double slashes
  const cleanPath = foto_menu.startsWith('/') ? foto_menu.substring(1) : foto_menu;
  return `${BASE_URL}${cleanPath}`;
}

// Database connection test
async function testDatabaseConnection() {
  try {
    const [results] = await pool.query('SELECT 1 as test');
    console.log('✅ Database connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// Multer setup untuk upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ===== API ROUTES =====

// Health check
app.get('/health', async (req, res) => {
  const dbStatus = await testDatabaseConnection();
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: dbStatus ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// Route: Get all menu
app.get('/menus', async (req, res) => {
  try {
    const { category, search, limit, offset } = req.query;
    let query = 'SELECT * FROM menu WHERE 1=1';
    const params = [];

    // Add filters
    if (category) {
      query += ' AND kategori = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (nama_menu LIKE ? OR deskripsi LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add ordering
    query += ' ORDER BY created_at DESC';

    // Add pagination
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const [results] = await pool.query(query, params);
    
    const menus = results.map((menu) => ({
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
      // Format price to ensure it's a number
      harga: parseFloat(menu.harga) || 0,
      // Format dates
      created_at: menu.created_at ? new Date(menu.created_at).toISOString() : null,
      updated_at: menu.updated_at ? new Date(menu.updated_at).toISOString() : null
    }));

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM menu WHERE 1=1';
    const countParams = [];
    
    if (category) {
      countQuery += ' AND kategori = ?';
      countParams.push(category);
    }
    
    if (search) {
      countQuery += ' AND (nama_menu LIKE ? OR deskripsi LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      data: menus,
      pagination: {
        total,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0,
        hasMore: limit && offset ? (parseInt(offset) + parseInt(limit)) < total : false
      }
    });
  } catch (err) {
    console.error('Error ambil data menu:', err);
    res.status(500).json({ 
      error: 'Gagal ambil data menu',
      message: err.message 
    });
  }
});

// Route: Get detail menu by ID
app.get('/DetailMenu/:id', async (req, res) => {
  const { id } = req.params;
  
  // Validate ID
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID menu tidak valid' });
  }

  try {
    const [results] = await pool.query('SELECT * FROM menu WHERE id_menu = ?', [parseInt(id)]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }
    
    const menu = results[0];
    const menuWithUrl = {
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
      harga: parseFloat(menu.harga) || 0,
      created_at: menu.created_at ? new Date(menu.created_at).toISOString() : null,
      updated_at: menu.updated_at ? new Date(menu.updated_at).toISOString() : null
    };
    
    res.json(menuWithUrl);
  } catch (err) {
    console.error('Gagal ambil detail menu:', err);
    res.status(500).json({ 
      error: 'Gagal ambil data menu',
      message: err.message 
    });
  }
});

// Route: Get all orders
app.get('/orders', async (req, res) => {
  try {
    const { status, limit, offset, customer_name } = req.query;
    let query = `
      SELECT 
        o.*,
        COUNT(oi.id) as item_count,
        GROUP_CONCAT(oi.nama_produk) as products
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    // Add filters
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    
    if (customer_name) {
      query += ' AND o.customer_name LIKE ?';
      params.push(`%${customer_name}%`);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    // Add pagination
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
      
      if (offset) {
        query += ' OFFSET ?';
        params.push(parseInt(offset));
      }
    }

    const [results] = await pool.query(query, params);
    
    const orders = results.map(order => ({
      ...order,
      total_pesanan: parseFloat(order.total_pesanan) || 0,
      created_at: order.created_at ? new Date(order.created_at).toISOString() : null,
      updated_at: order.updated_at ? new Date(order.updated_at).toISOString() : null,
      products: order.products ? order.products.split(',') : []
    }));

    res.json({
      data: orders,
      total: orders.length
    });
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ 
      error: 'Gagal ambil data orders',
      message: err.message 
    });
  }
});

// Endpoint upload (POST /api/upload)
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname);
    const fileName = `${timestamp}${ext}`;
    
    // In production, you would save this to a cloud storage service
    // For now, we'll just return the expected URL
    const imageUrl = `${BASE_URL}${fileName}`;
    
    res.json({ 
      message: 'Upload berhasil', 
      imageUrl,
      fileName,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ 
      error: 'Upload gagal',
      message: err.message 
    });
  }
});

// Register routes with proper prefixes
app.use('/api/menu', menuRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes); // Fixed: should have dashboard prefix
app.use('/api/cart', cartRoutes); // Fixed: should have cart prefix
app.use('/api/orders', orderRoutes); // Fixed: should have orders prefix

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'API Seacoff sudah jalan!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      menus: '/menus',
      dashboard: '/api/dashboard/*',
      auth: '/api/auth/*',
      orders: '/api/orders/*',
      cart: '/api/cart/*',
      sales: '/api/sales/*'
    },
    documentation: 'https://docs.seacoff.com'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Handle specific error types
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (pool) {
    pool.end(() => {
      console.log('Database connections closed.');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  if (pool) {
    pool.end(() => {
      console.log('Database connections closed.');
      process.exit(0);
    });
  }
});

// Start server
app.listen(port, async () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access at: http://localhost:${port}`);
  
  // Test database connection on startup
  await testDatabaseConnection();
});

module.exports = app;
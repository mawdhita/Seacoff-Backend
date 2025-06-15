const express = require('express');
const cors = require('cors');
const pool = require('./db');  
const multer = require('multer');
const path = require('path');

const app = express();
const port = 8000;

// Import routes
const menuRoutes = require('./routes/menuRoutes');
const salesRoutes = require('./routes/salesRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

// Middleware
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware untuk tracking
app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'] || 'default-session';
  req.sessionId = sessionId;
  next();
});

const BASE_URL = 'https://raw.githubusercontent.com/mawdhita/Seacoff-Backend/main/uploads/';

function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}placeholder.png`;
  }
  return `${BASE_URL}${foto_menu}`;
}

// Basic routes (keep existing ones)
app.get('/menus', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM menu');
    const menus = results.map((menu) => ({
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
    }));
    res.json(menus);
  } catch (err) {
    console.error('Error ambil data menu:', err);
    res.status(500).json({ error: 'Gagal ambil data menu' });
  }
});

app.get('/DetailMenu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await pool.query('SELECT * FROM menu WHERE id_menu = ?', [id]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }
    const menu = results[0];
    const menuWithUrl = {
      ...menu,
      foto_menu_url: buildFotoMenuUrl(menu.foto_menu),
    };
    res.json(menuWithUrl);
  } catch (err) {
    console.error('Gagal ambil detail menu:', err);
    res.status(500).json({ error: 'Gagal ambil data menu' });
  }
});

// Fixed: Add /api prefix to orders endpoint
app.get('/api/orders', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        o.*,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') as orderDate,
        'Guest' as customerName,
        o.total_harga as total,
        'completed' as status
      FROM orders o 
      ORDER BY o.created_at DESC
    `);
    res.json(results);
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ error: 'Gagal ambil data orders' });
  }
});

// Add missing dashboard endpoints
app.get('/api/dashboard', async (req, res) => {
  try {
    // Get total orders
    const [totalOrdersResult] = await pool.query('SELECT COUNT(*) as total FROM orders');
    const totalOrders = totalOrdersResult[0].total;

    // Get total revenue
    const [totalRevenueResult] = await pool.query('SELECT SUM(total_harga) as total FROM orders');
    const totalRevenue = totalRevenueResult[0].total || 0;

    // Get popular items (mock data for now)
    const popularItems = [
      { name: 'Americano', sold: 45 },
      { name: 'Cappuccino', sold: 38 },
      { name: 'Latte', sold: 32 },
      { name: 'Espresso', sold: 25 }
    ];

    // Get recent orders
    const [recentOrdersResult] = await pool.query(`
      SELECT 
        id_order as id,
        'Guest' as customerName,
        total_harga as total,
        CONCAT(TIMESTAMPDIFF(MINUTE, created_at, NOW()), ' menit lalu') as time
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const dashboardData = {
      totalSales: totalOrders,
      totalOrders: totalOrders,
      totalRevenue: totalRevenue,
      popularItems: popularItems,
      recentOrders: recentOrdersResult
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Gagal ambil data dashboard' });
  }
});

// Add sales per week endpoint
app.get('/api/sales-per-week', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT 
        CONCAT('Minggu ', WEEK(created_at) - WEEK(DATE_SUB(created_at, INTERVAL DAYOFMONTH(created_at)-1 DAY)) + 1) as week,
        SUM(total_harga) as sales
      FROM orders 
      WHERE MONTH(created_at) = MONTH(CURDATE()) 
        AND YEAR(created_at) = YEAR(CURDATE())
      GROUP BY WEEK(created_at)
      ORDER BY WEEK(created_at)
    `);

    // If no data, return dummy data
    if (results.length === 0) {
      const dummyData = [
        { week: 'Minggu 1', sales: 320000 },
        { week: 'Minggu 2', sales: 450000 },
        { week: 'Minggu 3', sales: 380000 },
        { week: 'Minggu 4', sales: 520000 }
      ];
      return res.json(dummyData);
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching weekly sales:', err);
    // Return dummy data on error
    const dummyData = [
      { week: 'Minggu 1', sales: 320000 },
      { week: 'Minggu 2', sales: 450000 },
      { week: 'Minggu 3', sales: 380000 },
      { week: 'Minggu 4', sales: 520000 }
    ];
    res.json(dummyData);
  }
});

// Multer setup untuk upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    message: 'Upload berhasil', 
    imageUrl: `${BASE_URL}${req.file.originalname}` 
  });
});

// Use routes with proper error handling
app.use('/api/menu', menuRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'API Seacoff sudah jalan cuy!',
    endpoints: [
      'GET /menus',
      'GET /DetailMenu/:id',
      'GET /api/orders',
      'GET /api/dashboard',
      'GET /api/sales-per-week',
      'POST /api/upload'
    ]
  });
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
  console.log(`Available at: http://localhost:${port}`);
});

module.exports = app;
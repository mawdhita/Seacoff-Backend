const express = require('express');
const cors = require('cors');
const pool = require('./db');  
const multer = require('multer');
const path = require('path');

const app = express();
const port = 8000;

const menuRoutes = require('./routes/menuRoutes');
const salesRoutes = require('./routes/salesRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

const allowedOrigins = [
  'https://seacoff-frontend.vercel.app'
];

app.use(cors({
  origin: '*', // 👈 sementara izinkan semua (untuk testing, bisa dibatasi nanti)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BASE_URL = 'https://raw.githubusercontent.com/mawdhita/Seacoff-Backend/main/uploads/';

function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}placeholder.png`;
  }
  return `${BASE_URL}${foto_menu}`;
}

// Route: Get all menu
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

// Route: Get detail menu by ID
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

// Route: Get all orders
app.get('/orders', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM orders');
    res.json(results);
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ error: 'Gagal ambil data orders' });
  }
});

// Multer setup untuk upload
const storage = multer.memoryStorage(); // Simpan di memory
const upload = multer({ storage });

// Endpoint upload (POST /api/upload)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Proses upload ke API atau simpan di tempat lain
  // Misalnya, Anda bisa menggunakan axios untuk mengupload ke server lain
  res.json({ message: 'Upload berhasil', imageUrl: `${BASE_URL}${req.file.originalname}` });
});

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
});

module.exports = app;

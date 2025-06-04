const express = require('express');
const cors = require('cors');
const pool = require('./db');  // pool sudah pakai mysql2/promise

const app = express();
const port = 8000;

const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hardcoded BASE_URL (tanpa .env)
const BASE_URL = 'https://seacoff-backend.vercel.app';

// Helper function buat build URL foto_menu
function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}/placeholder.png`;  // sesuaikan lokasi placeholder tanpa folder uploads
  }

  // Cek apakah foto_menu sudah berupa URL lengkap (http/https)
  if (foto_menu.startsWith('http://') || foto_menu.startsWith('https://')) {
    return foto_menu;
  }

  // Kalau foto_menu hanya path relatif, anggap BASE_URL + path
  if (foto_menu.startsWith('/')) {
    return BASE_URL + foto_menu;
  }

  // Kalau hanya nama file, anggap BASE_URL + / + nama file
  return `${BASE_URL}/${foto_menu}`;
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
app.get('/menus/:id', async (req, res) => {
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

// Pakai route order & cart
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
});

module.exports = app;

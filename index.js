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

app.use('frrontend/uploads', express.static('uploads'));

// ✅ Route: Get all menu
app.get('/menus', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM menu');
    const menus = results.map((menu) => ({
      ...menu,
      foto_menu_url: menu.foto_menu
        ? `${BASE_URL}/uploads/${menu.foto_menu}`
        : `${BASE_URL}/uploads/placeholder.png`,
    }));
    res.json(menus);
  } catch (err) {
    console.error('Error ambil data menu:', err);
    res.status(500).json({ error: 'Gagal ambil data menu' });
  }
});



// ✅ Route: Get detail menu by ID
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
      foto_menu_url: menu.foto_menu
        ? `${BASE_URL}/uploads/${menu.foto_menu}`
        : `${BASE_URL}/uploads/placeholder.png`,
    };
    res.json(menuWithUrl);
  } catch (err) {
    console.error('Gagal ambil detail menu:', err);
    res.status(500).json({ error: 'Gagal ambil data menu' });
  }
});

// ✅ Route: Get all orders
app.get('/orders', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM orders');
    res.json(results);
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ error: 'Gagal ambil data orders' });
  }
});

// ✅ Pakai rute order & cart
app.use('/api', orderRoutes);
app.use('/api/cart', cartRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

module.exports = app;

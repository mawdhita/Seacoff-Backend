const express = require('express');
const cors = require('cors');
const db = require('./db'); // koneksi MySQL

const app = express();
const port = 8000;

const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hardcoded BASE_URL (tanpa .env)
const BASE_URL = 'https://seacoff-backend.vercel.app';

// ✅ Route: Get all menu
app.get('/menus', (req, res) => {
  db.query('SELECT * FROM menu', (err, results) => {
    if (err) {
      console.error('Error ambil data menu:', err);
      res.status(500).json({ error: 'Gagal ambil data menu' });
    } else {
      const menus = results.map((menu) => ({
        ...menu,
        foto_menu_url: menu.foto_menu
          ? `${BASE_URL}/uploads/${menu.foto_menu}`
          : `${BASE_URL}/uploads/placeholder.png`,
      }));
      res.json(menus);
    }
  });
});

// ✅ Route: Get detail menu by ID
app.get('/menus/:id', (req, res) => {
  const { id } = req.params;
  db.query('SELECT * FROM menu WHERE id_menu = ?', [id], (err, results) => {
    if (err) {
      console.error('Gagal ambil detail menu:', err.sqlMessage || err);
      return res.status(500).json({ error: 'Gagal ambil data menu' });
    }
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
  });
});

// ✅ Route: Get all orders
app.get('/orders', (req, res) => {
  db.query('SELECT * FROM orders', (err, results) => {
    if (err) {
      console.error('Gagal ambil data orders:', err);
      return res.status(500).json({ error: 'Gagal ambil data orders' });
    }
    res.json(results);
  });
});

// ✅ Pakai rute order & cart
app.use('/api', orderRoutes);
app.use('/api/cart', cartRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

module.exports = app;

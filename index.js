const express = require('express');
const cors = require('cors');
const pool = require('./db');  


const app = express();
const port = 8000;

const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads')); 

const BASE_URL = 'https://seacoff-backend.vercel.app';

function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}/uploads/placeholder.png`;
  }
  return `${BASE_URL}/uploads/${foto_menu}`;
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


app.use('/api', cartRoutes);

app.use('/Api', orderRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
});

module.exports = app;

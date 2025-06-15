const express = require('express');
const cors = require('cors');
const pool = require('./db');  


const app = express();
const port = 8000;

const menuRoutes = require('./routes/menuRoutes');           // Route untuk menu
const salesRoutes = require('./routes/salesRoutes');         // Route untuk sales
const authRoutes = require('./routes/authRoutes');           // Route untuk login/registrasi
const dashboardRoutes = require('./routes/dashboardRoutes'); // Route untuk dashboard
const uploadRoutes = require("./uploads");
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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));


// Multer setup langsung di sini
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
     cb(null, "public/images");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Endpoint upload langsung (POST /api/upload)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ message: 'Upload berhasil', imageUrl });
});

// Routes
app.use('/api/menu', menuRoutes);        // Route untuk menu
app.use('/api/sales', salesRoutes);      // Route untuk sales
app.use('/api/auth', authRoutes);        // Route untuk login dan registrasi
app.use('/api', dashboardRoutes);        // Route untuk dashboard
app.use("/uploads", express.static('uploads')); // buat akses gambar




app.use('/api', cartRoutes);

app.use('/Api', orderRoutes);

app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
});

module.exports = app;

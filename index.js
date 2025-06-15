const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const pool = require('./db');

const app = express();
const port = 8000;

// BASE URL production
const BASE_URL = 'https://seacoff-backend.vercel.app';

// ==== Middleware ====
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve folder uploads agar bisa diakses publik
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==== Konfigurasi Multer ====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // ✅ Simpan ke folder 'uploads/'
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ==== Endpoint Upload ====
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;
  res.json({ message: 'Upload berhasil', imageUrl });
});

// ==== URL Builder ====
function buildFotoMenuUrl(foto_menu) {
  if (!foto_menu) {
    return `${BASE_URL}/uploads/placeholder.png`;
  }
  return `${BASE_URL}/uploads/${foto_menu}`;
}

// ==== Routes ====
const menuRoutes = require('./routes/menuRoutes');
const salesRoutes = require('./routes/salesRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.use('/api/menu', menuRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', cartRoutes);
app.use('/Api', orderRoutes); // optional: sesuaikan kapitalisasi konsisten

// ==== Endpoint Sample ====
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

// ==== Root ====
app.get('/', (req, res) => {
  res.send('API Seacoff sudah jalan cuy!');
});

app.listen(port, () => {
  console.log(`Server jalan di port ${port}`);
});

module.exports = app;

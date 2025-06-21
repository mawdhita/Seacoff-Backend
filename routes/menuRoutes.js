const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise pool
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage untuk multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'menu_images',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});
const upload = multer({ storage });

/**
 * Ambil semua menu
 */
router.get('/menu', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu');
    res.json(rows);
  } catch (error) {
    console.error('Error ambil menu:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Tambah menu baru
 */
router.post('/menu', upload.single('foto_menu'), async (req, res) => {
  const { nama_menu, deskripsi, harga, kategori } = req.body;
  const foto_menu = req.file ? req.file.path : null; // Cloudinary URL

  try {
    const [result] = await pool.query(
      'INSERT INTO menu (nama_menu, deskripsi, harga, kategori, foto_menu) VALUES (?, ?, ?, ?, ?)',
      [nama_menu, deskripsi, harga, kategori, foto_menu]
    );

    res.status(201).json({
      id_menu: result.insertId,
      nama_menu,
      deskripsi,
      harga,
      kategori,
      foto_menu,
    });
  } catch (error) {
    console.error('Error tambah menu:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Update menu
 */
router.put('/menu/:id', upload.single('foto_menu'), async (req, res) => {
  const { id } = req.params;
  const { nama_menu, deskripsi, harga, kategori } = req.body;

  try {
    // Ambil data lama
    const [rows] = await pool.query('SELECT foto_menu FROM menu WHERE id_menu = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Menu tidak ditemukan' });

    let newFoto = rows[0].foto_menu;

    // Jika ada file baru diupload
    if (req.file) {
      newFoto = req.file.path;
      const oldUrl = rows[0].foto_menu;
      if (oldUrl) {
        // Hapus file lama di Cloudinary
        const publicId = oldUrl.split('/').slice(-1)[0].split('.')[0]; // ambil public_id
        cloudinary.uploader.destroy(`menu_images/${publicId}`, (err) => {
          if (err) {
            console.warn('Gagal hapus file lama:', err.message);
          }
        });
      }
    }

    await pool.query(
      'UPDATE menu SET nama_menu=?, deskripsi=?, harga=?, kategori=?, foto_menu=? WHERE id_menu=?',
      [nama_menu, deskripsi, harga, kategori, newFoto, id]
    );

    res.json({ success: true, foto_menu: newFoto });
  } catch (error) {
    console.error('Error update menu:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Hapus menu
 */
router.delete('/menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT foto_menu FROM menu WHERE id_menu = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Menu tidak ditemukan' });

    const oldUrl = rows[0].foto_menu;
    if (oldUrl) {
      const publicId = oldUrl.split('/').slice(-1)[0].split('.')[0];
      cloudinary.uploader.destroy(`menu_images/${publicId}`, (err) => {
        if (err) {
          console.warn('Gagal hapus file lama:', err.message);
        }
      });
    }

    await pool.query('DELETE FROM menu WHERE id_menu = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error hapus menu:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

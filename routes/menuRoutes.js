const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise pool
const multer = require('multer');
const cloudinary = require('../cloudinary');

// pakai memoryStorage untuk ambil buffer file
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// GET semua menu
router.get('/menu', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM menu');
    res.json(results);
  } catch (err) {
    console.error('Error saat mengambil data menu:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// POST tambah menu baru
router.post('/menu', upload.single('foto_menu'), async (req, res) => {
  const { nama_menu, deskripsi, harga, kategori } = req.body;

  try {
    let foto_menu_url = null;

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'menus' },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer); // kirim buffer file
      });

      foto_menu_url = uploadResult.secure_url;
    }

    const [results] = await pool.query(
      'INSERT INTO menu (nama_menu, deskripsi, harga, kategori, foto_menu) VALUES (?, ?, ?, ?, ?)',
      [nama_menu, deskripsi, harga, kategori, foto_menu_url]
    );

    res.status(201).json({ id_menu: results.insertId, nama_menu, deskripsi, harga, kategori, foto_menu: foto_menu_url });
  } catch (err) {
    console.error('Error saat menambah menu:', err);
    res.status(500).send('Internal Server Error');
  }
});


// PUT update menu
router.put('/menu/:id', upload.single('foto_menu'), async (req, res) => {
  const { id } = req.params;
  const { nama_menu, deskripsi, harga, kategori } = req.body;

  try {
    const [rows] = await pool.query('SELECT foto_menu FROM menu WHERE id_menu = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Menu tidak ditemukan' });

    let newFoto = rows[0].foto_menu;
    if (req.file) {
      // Upload baru ke cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'menus' },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer);
      });
      newFoto = uploadResult.secure_url;
    }

    await pool.query(
      'UPDATE menu SET nama_menu=?, deskripsi=?, harga=?, kategori=?, foto_menu=? WHERE id_menu=?',
      [nama_menu, deskripsi, harga, kategori, newFoto, id]
    );

    res.json({ success: true, foto_menu: newFoto });
  } catch (error) {
    console.error('Error saat update menu:', error);
    res.status(500).send('Internal Server Error');
  }
});


// DELETE menu
router.delete('/menu/:id', async (req, res) => {
  const id_menu = req.params.id;

  try {
    await pool.query('DELETE FROM menu WHERE id_menu = ?', [id_menu]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saat menghapus menu:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

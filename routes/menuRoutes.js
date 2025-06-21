const express = require('express');
const router = express.Router();
const pool = require('../db'); // ini harus mysql2/promise pool
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup multer untuk upload file ke folder 'uploads'
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
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
  const foto_menu = req.file ? req.file.filename : null;

  try {
    const [results] = await pool.query(
      'INSERT INTO menu (nama_menu, deskripsi, harga, kategori, foto_menu) VALUES (?, ?, ?, ?, ?)',
      [nama_menu, deskripsi, harga, kategori, foto_menu]
    );

    res.status(201).json({ id_menu: results.insertId, nama_menu, deskripsi, harga, kategori, foto_menu });
  } catch (err) {
    console.error('Error saat menambah menu:', err);
    res.status(500).send('Internal Server Error');
  }
});

// PUT update menu
router.put('/menu/:id', upload.single('foto_menu'), async (req, res) => {
  const { nama_menu, deskripsi, harga, kategori } = req.body;
  const id_menu = req.params.id;

  console.log('Request PUT:', { id_menu, body: req.body, file: req.file });

  try {
    const [rows] = await pool.query(
      'SELECT foto_menu FROM menu WHERE id_menu = ?',
      [id_menu]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Menu tidak ditemukan' });

    let newFoto = rows[0].foto_menu;
    if (req.file) {
      newFoto = req.file.filename;
      if (rows[0].foto_menu) {
        const oldPath = path.join(__dirname, '../uploads/', rows[0].foto_menu);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.warn('Gagal hapus file lama:', err.message);
          }
        });
      }
    }

    await pool.query(
      'UPDATE menu SET nama_menu=?, deskripsi=?, harga=?, kategori=?, foto_menu=? WHERE id_menu=?',
      [nama_menu, deskripsi, harga, kategori, newFoto, id_menu]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saat update menu:', error);
    res.status(500).send('Internal Server Error');
  }
});

// DELETE menu
router.delete('/menu/:id', async (req, res) => {
  const id_menu = req.params.id;

  try {
    const [oldData] = await pool.query('SELECT foto_menu FROM menu WHERE id_menu = ?', [id_menu]);
    if (oldData.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    const oldFoto = oldData[0].foto_menu;

    await pool.query('DELETE FROM menu WHERE id_menu = ?', [id_menu]);

    if (oldFoto) {
      const oldPath = path.join(__dirname, '../uploads/', oldFoto);
      fs.unlink(oldPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn('Gagal hapus file lama:', err.message);
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error saat menghapus menu:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

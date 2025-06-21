const express = require('express');
const router = express.Router();
const db = require('../db'); // <- sekarang ini adalah POOL
const multer = require('multer');
const path = require('path');
const fs = require('fs');



// Setup multer untuk upload file ke folder 'uploads'
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET semua menu
router.get('/menu', (req, res) => {
  const query = 'SELECT * FROM menu';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error saat mengambil data menu:', err.stack || err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    res.json(results);
  });
});

// POST tambah menu baru
router.post('/menu', upload.single('foto_menu'), (req, res) => {
  const { nama_menu, deskripsi, harga, kategori } = req.body;
  const foto_menu = req.file ? req.file.filename : null;

  const query = 'INSERT INTO menu (nama_menu, deskripsi, harga, kategori, foto_menu) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [nama_menu, deskripsi, harga, kategori, foto_menu], (err, results) => {
    if (err) {
      console.error('Error saat menambah menu:', err.stack || err);
      return res.status(500).send('Internal Server Error');
    }
    res.status(201).json({ id_menu: results.insertId, nama_menu, deskripsi, harga, kategori, foto_menu });
  });
});

// PUT update menu
router.put('/menu:id', upload.single('foto_menu'), (req, res) => {
  const { nama_menu, deskripsi, harga, kategori } = req.body;
  const id_menu = req.params.id;

  const selectQuery = 'SELECT foto_menu FROM menu WHERE id_menu = ?';
  db.query(selectQuery, [id_menu], (err, result) => {
    if (err) {
      console.error('Error saat ambil foto menu lama:', err.stack || err);
      return res.status(500).send('Internal Server Error');
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    const oldFoto = result[0].foto_menu;
    let newFoto = oldFoto;

    if (req.file) {
      newFoto = req.file.filename;
      if (oldFoto) {
        const oldPath = path.join(__dirname, '../uploads/', oldFoto);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.warn('Gagal hapus file lama:', err.message);
          }
        });
      }
    }

    const updateQuery = `
      UPDATE menu
      SET nama_menu = ?, deskripsi = ?, harga = ?, kategori = ?, foto_menu = ?
      WHERE id_menu = ?
    `;
    db.query(updateQuery, [nama_menu, deskripsi, harga, kategori, newFoto, id_menu], (err) => {
      if (err) {
        console.error('Error saat update menu:', err.stack || err);
        return res.status(500).send('Internal Server Error');
      }
      res.json({ success: true });
    });
  });
});

// DELETE menu
router.delete('/menu:id', (req, res) => {
  const id_menu = req.params.id;
  const selectQuery = 'SELECT foto_menu FROM menu WHERE id_menu = ?';
  db.query(selectQuery, [id_menu], (err, results) => {
    if (err) {
      console.error('Error saat ambil data menu:', err.stack || err);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Menu tidak ditemukan' });
    }

    const oldFoto = results[0].foto_menu;

    const deleteQuery = 'DELETE FROM menu WHERE id_menu = ?';
    db.query(deleteQuery, [id_menu], (err) => {
      if (err) {
        console.error('Error saat menghapus menu:', err.stack || err);
        return res.status(500).send('Internal Server Error');
      }

      if (oldFoto) {
        const oldPath = path.join(__dirname, '../uploads/', oldFoto);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.warn('Gagal hapus file lama:', err.message);
          }
        });
      }

      res.json({ success: true });
    });
  });
});

module.exports = router;

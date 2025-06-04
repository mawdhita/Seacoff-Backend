// cartRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Tambah item ke keranjang
router.post('/', (req, res) => {      // <-- Hilangkan '/api/cart' di sini
  const { id_menu, quantity } = req.body;

  if (!id_menu || !quantity) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  // Cek apakah item sudah ada di keranjang
  const checkCartSql = `SELECT id FROM cart WHERE id_menu = ? LIMIT 1`;
  db.query(checkCartSql, [id_menu], (err, results) => {
    if (err) {
      console.error('Gagal cek cart:', err);
      return res.status(500).json({ message: 'Gagal cek cart' });
    }

    if (results.length > 0) {
      // Kalau sudah ada, update quantity
      const updateCartSql = `UPDATE cart SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?`;
      db.query(updateCartSql, [quantity, results[0].id], (err2) => {
        if (err2) {
          console.error('Gagal update cart:', err2);
          return res.status(500).json({ message: 'Gagal update cart' });
        }
        res.json({ message: 'Item di cart berhasil diupdate' });
      });
    } else {
      // Kalau belum ada, insert baru
      const insertCartSql = `INSERT INTO cart (id_menu, quantity, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`;
      db.query(insertCartSql, [id_menu, quantity], (err2) => {
        if (err2) {
          console.error('Gagal tambah cart:', err2);
          return res.status(500).json({ message: 'Gagal tambah cart' });
        }
        res.status(201).json({ message: 'Item berhasil ditambahkan ke cart' });
      });
    }
  });
});

module.exports = router;

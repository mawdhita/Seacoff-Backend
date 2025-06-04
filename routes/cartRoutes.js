const express = require('express');
const router = express.Router();
const db = require('../db');

// Tambah item ke keranjang
router.post('/api/cart', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  const { id_menu, quantity } = req.body;

  if (!sessionId || !id_menu || !quantity) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const checkCartSql = `SELECT id FROM cart WHERE session_id = ? AND id_menu = ? LIMIT 1`;
  db.query(checkCartSql, [sessionId, id_menu], (err, results) => {
    if (err) {
      console.error('Gagal cek cart:', err);
      return res.status(500).json({ message: 'Gagal cek cart' });
    }

    if (results.length > 0) {
      // Jika menu sudah ada di cart, update quantity
      const updateCartSql = `UPDATE cart SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?`;
      db.query(updateCartSql, [quantity, results[0].id], (err2) => {
        if (err2) {
          console.error('Gagal update cart:', err2);
          return res.status(500).json({ message: 'Gagal update cart' });
        }
        res.json({ message: 'Item di cart berhasil diupdate' });
      });
    } else {
      // Jika belum ada, insert baru
      const insertCartSql = `INSERT INTO cart (session_id, id_menu, quantity, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`;
      db.query(insertCartSql, [sessionId, id_menu, quantity], (err2) => {
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

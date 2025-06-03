// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Endpoint untuk memproses pemesanan
router.post('/orders', (req, res) => {
  const { nama_user, total_pesanan, status, produk } = req.body;

  // Validasi input
  if (!nama_user || !total_pesanan || !status || !Array.isArray(produk)) {
    return res.status(400).json({ message: "Data pesanan tidak lengkap" });
  }

  // Cek apakah user sudah ada
  const checkUserSql = `SELECT id_user FROM users WHERE nama_user = ? LIMIT 1`;
  db.query(checkUserSql, [nama_user], (err, userResults) => {
    if (err) return res.status(500).json({ message: 'Gagal cek user' });

    if (userResults.length > 0) {
      // User sudah ada
      insertOrder(userResults[0].id_user);
    } else {
      // Tambah user baru
      const insertUserSql = `INSERT INTO users (nama_user, created_at, update_at) VALUES (?, NOW(), NOW())`;
      db.query(insertUserSql, [nama_user], (err2, result) => {
        if (err2) return res.status(500).json({ message: 'Gagal tambah user' });
        insertOrder(result.insertId); // insert order pakai id_user baru
      });
    }
  });

  // Fungsi untuk insert order dan item
  function insertOrder(id_user) {
    const sql = `INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, NOW(), NOW())`;

    db.query(sql, [id_user, nama_user, total_pesanan, status], (err, result) => {
      if (err) {
        console.error('Gagal menyimpan pesanan:', err);
        return res.status(500).json({ message: 'Gagal menyimpan pesanan' });
      }

      const orderId = result.insertId;

      const itemSql = `INSERT INTO order_items (id_order, nama_produk, jumlah, harga, total_harga, created_at, updated_at)
                       VALUES ?`;

      const values = produk.map(item => [
        orderId,
        item.nama_produk,
        item.jumlah,
        item.harga,
        item.harga * item.jumlah,
        new Date(),
        new Date()
      ]);

      db.query(itemSql, [values], (err2) => {
        if (err2) {
          console.error('Gagal menyimpan item pesanan:', err2);
          return res.status(500).json({ message: 'Gagal menyimpan item pesanan' });
        }

        res.status(201).json({ message: 'Pesanan berhasil disimpan', orderId });
      });
    });
  }
});

// Endpoint untuk melihat semua pesanan
router.get('/orders', (req, res) => {
  db.query('SELECT * FROM orders', (err, results) => {
    if (err) {
      console.error('Gagal ambil data orders:', err);
      return res.status(500).json({ error: 'Gagal ambil data orders' });
    }
    res.json(results);
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Pastikan ini sudah mysql2/promise

// Endpoint untuk memproses pemesanan
router.post('/orders', async (req, res) => {
  const { nama_user, total_pesanan, status, produk } = req.body;

  // Validasi input
  if (!nama_user || !total_pesanan || !status || !Array.isArray(produk)) {
    return res.status(400).json({ message: "Data pesanan tidak lengkap" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1️⃣ Cek apakah user sudah ada
    const [userResults] = await connection.query(
      'SELECT id_user FROM users WHERE nama_user = ? LIMIT 1',
      [nama_user]
    );

    let userId;
    if (userResults.length > 0) {
      userId = userResults[0].id_user;
    } else {
      // Insert user baru
      const [insertUser] = await connection.query(
        'INSERT INTO users (nama_user, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [nama_user]
      );
      userId = insertUser.insertId;
    }

    // 2️⃣ Insert order
    const [insertOrder] = await connection.query(
      'INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [userId, nama_user, total_pesanan, status]
    );

    const orderId = insertOrder.insertId;

    // 3️⃣ Insert order_items
    const values = produk.map(item => [
      orderId,
      item.nama_produk,
      item.jumlah,
      item.harga,
      item.harga * item.jumlah,
      new Date(),
      new Date()
    ]);

    await connection.query(
      'INSERT INTO order_items (id_order, nama_produk, jumlah, harga, total_harga, created_at, updated_at) VALUES ?',
      [values]
    );

    await connection.commit();
    res.status(201).json({ message: 'Pesanan berhasil disimpan', orderId });
  } catch (err) {
    await connection.rollback();
    console.error('Gagal menyimpan pesanan:', err);
    res.status(500).json({ message: 'Gagal menyimpan pesanan' });
  } finally {
    connection.release();
  }
});

// Endpoint untuk melihat semua pesanan
router.get('/orders', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM orders');
    res.json(results);
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ error: 'Gagal ambil data orders' });
  }
});

module.exports = router;

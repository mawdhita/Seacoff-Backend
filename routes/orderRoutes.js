const express = require('express');
const router = express.Router();
const pool = require('../db'); // pool mysql2/promise

router.post('/orders', async (req, res) => {
  const { nama_user, total_pesanan, status, produk } = req.body;

  if (!nama_user || !total_pesanan || !status || !Array.isArray(produk)) {
    return res.status(400).json({ message: "Data pesanan tidak lengkap" });
  }

  try {
    // Cek user
    const [userResults] = await pool.query(
      'SELECT id_user FROM users WHERE nama_user = ? LIMIT 1',
      [nama_user]
    );

    let id_user;
    if (userResults.length > 0) {
      id_user = userResults[0].id_user;
    } else {
      // Insert user baru
      const [insertUserResult] = await pool.query(
        'INSERT INTO users (nama_user, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [nama_user]
      );
      id_user = insertUserResult.insertId;
    }

    // Insert order
    const [insertOrderResult] = await pool.query(
      `INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id_user, nama_user, total_pesanan, status]
    );

    const orderId = insertOrderResult.insertId;

    // Prepare values untuk order_items
    const values = produk.map(item => [
      orderId,
      item.nama_produk,
      item.jumlah,
      item.harga,
      item.harga * item.jumlah,
      new Date(),
      new Date()
    ]);

    // Insert multiple order items sekaligus
    await pool.query(
      `INSERT INTO order_items (id_order, nama_produk, jumlah, harga, total_harga, created_at, updated_at)
       VALUES ?`,
      [values]
    );

    res.status(201).json({ message: 'Pesanan berhasil disimpan', orderId });
  } catch (err) {
    console.error('Error proses pesanan:', err);
    res.status(500).json({ message: 'Gagal memproses pesanan' });
  }
});

module.exports = router;

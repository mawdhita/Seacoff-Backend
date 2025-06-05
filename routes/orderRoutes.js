// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // pastikan pool mysql2/promise

// POST /api/orders
router.post('/orders', async (req, res) => {
  const { nama_user, total_pesanan, status, produk } = req.body;

  if (!nama_user || !total_pesanan || !status || !Array.isArray(produk) || produk.length === 0) {
    return res.status(400).json({ message: 'Data pesanan tidak lengkap atau produk kosong' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Cek user sudah ada atau belum
    const [userRows] = await conn.query('SELECT id_user FROM users WHERE nama_user = ? LIMIT 1', [nama_user]);
    let id_user;

    if (userRows.length > 0) {
      id_user = userRows[0].id_user;
    } else {
      const [userInsert] = await conn.query(
        'INSERT INTO users (nama_user, created_at, updated_at) VALUES (?, NOW(), NOW())',
        [nama_user]
      );
      id_user = userInsert.insertId;
    }

    // Insert order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [id_user, nama_user, total_pesanan, status]
    );

    const orderId = orderResult.insertId;

    // Validasi produk item
    const values = [];
    for (const item of produk) {
      if (!item.nama_produk || !item.jumlah || !item.harga) {
        await conn.rollback();
        return res.status(400).json({ message: 'Produk tidak lengkap' });
      }
      values.push([
        orderId,
        item.nama_produk,
        item.jumlah,
        item.harga,
        item.jumlah * item.harga,
        new Date(),
        new Date(),
      ]);
    }

    // Insert order items
    await conn.query(
      `INSERT INTO order_items (id_order, nama_produk, jumlah, harga, total_harga, created_at, updated_at)
       VALUES ?`,
      [values]
    );

    await conn.commit();

    res.status(201).json({ message: 'Pesanan berhasil disimpan', orderId });
  } catch (err) {
    await conn.rollback();
    console.error('Gagal menyimpan pesanan:', err);
    res.status(500).json({ message: 'Gagal menyimpan pesanan' });
  } finally {
    conn.release();
  }
});

// GET semua orders (opsional)
router.get('/orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders');
    res.json(rows);
  } catch (err) {
    console.error('Gagal ambil data orders:', err);
    res.status(500).json({ error: 'Gagal ambil data orders' });
  }
});

module.exports = router;

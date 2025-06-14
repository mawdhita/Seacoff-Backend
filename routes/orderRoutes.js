const express = require('express');
const router = express.Router();
const pool = require('../db'); 

router.post('/orders', async (req, res) => {
  const { id_user, total_pesanan, status, nama_user, produk } = req.body;

  if (!id_user || !total_pesanan || !status || !nama_user || !Array.isArray(produk)) {
    return res.status(400).json({ error: 'Data pesanan tidak lengkap atau salah format.' });
  }

  try {
    const [orderResult] = await pool.query(
      'INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [id_user, nama_user, total_pesanan, status]
    );

    const orderId = orderResult.insertId;

    for (const item of produk) {
      if (!item.nama_produk || !item.jumlah || !item.harga) {
        return res.status(400).json({ error: 'Item pesanan tidak lengkap.' });
      }

      const totalHarga = item.jumlah * item.harga;

      await pool.query(
        'INSERT INTO order_items (id_order, nama_produk, jumlah, harga, total_harga, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [orderId, item.nama_produk, item.jumlah, item.harga, totalHarga]
      );
    }

    res.status(201).json({ message: 'Pesanan berhasil dibuat', orderId });
  } catch (err) {
    console.error('Gagal membuat pesanan:', err);
    res.status(500).json({ error: 'Gagal membuat pesanan', details: err.message });
  }
});

module.exports = router;

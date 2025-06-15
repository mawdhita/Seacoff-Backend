const express = require('express');
const router = express.Router();
const pool = require('../db');

// [POST] Buat Pesanan Baru
router.post('/orders', async (req, res) => {
  const { id_user, total_pesanan, status, nama_user, produk } = req.body;

  // Validasi input
  if (!id_user || !total_pesanan || !status || !nama_user || !Array.isArray(produk)) {
    return res.status(400).json({ error: 'Data pesanan tidak lengkap atau salah format.' });
  }

  try {
    // Simpan data order ke tabel orders
    const [orderResult] = await pool.query(
      'INSERT INTO orders (id_user, nama_user, total_pesanan, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [id_user, nama_user, total_pesanan, status]
    );

    const orderId = orderResult.insertId;

    // Simpan masing-masing item produk ke tabel order_items
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

// [PATCH] Ubah Status Pesanan Berdasarkan ID
router.patch('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatus = ['pending', 'paid', 'canceled'];
  if (!status || !allowedStatus.includes(status)) {
    return res.status(400).json({
      error: 'Status tidak valid. Gunakan salah satu dari: pending, paid, canceled.'
    });
  }

  try {
    const [result] = await pool.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id_order = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pesanan dengan ID tersebut tidak ditemukan.' });
    }

    res.json({ message: 'Status pesanan berhasil diperbarui' });
  } catch (err) {
    console.error('Gagal update status pesanan:', err);
    res.status(500).json({ error: 'Gagal update status pesanan', details: err.message });
  }
});

module.exports = router;

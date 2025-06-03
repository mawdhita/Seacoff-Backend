const express = require('express');
const router = express.Router();
const db = require('../db'); // Koneksi ke MySQL

// ✅ GET semua isi keranjang + nama menu & harga (status pending)
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      c.id_cart, 
      c.id_menu, 
      m.nama_menu, 
      m.harga, 
      c.quantity, 
      (m.harga * c.quantity) AS subtotal,
      c.status,
      c.created_at
    FROM cart c
    JOIN menu m ON c.id_menu = m.id_menu
    WHERE c.status = 'pending'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Gagal ambil data keranjang:', err);
      return res.status(500).json({ error: 'Gagal ambil data keranjang' });
    }
    res.json(results);
  });
});

// ✅ POST menambahkan item ke keranjang (tanpa id_user)
router.post('/', (req, res) => {
  const { id_menu, quantity } = req.body;

  // Validasi input
  if (!id_menu || !quantity) {
    return res.status(400).json({ error: 'Menu ID dan Quantity wajib diisi' });
  }

  // Pastikan quantity adalah angka dan lebih besar dari 0
  if (isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity harus angka lebih dari 0' });
  }

  const query = `
    INSERT INTO cart (id_menu, quantity, status, created_at, updated_at) 
    VALUES (?, ?, 'pending', NOW(), NOW())
  `;

  db.query(query, [id_menu, quantity], (err, result) => {
    if (err) {
      console.error('Error menambahkan ke keranjang:', err);
      return res.status(500).json({ error: 'Gagal menambahkan ke keranjang' });
    }

    // Buat objek cart yang berhasil ditambahkan
    const newCartItem = {
      id_cart: result.insertId,
      id_menu,
      quantity,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };

    res.status(201).json({
      message: 'Item berhasil ditambahkan ke keranjang',
      data: newCartItem
    });
  });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db'); // tambahkan ini!
const cartController = require('../controllers/cartController');

// ... router.get() dan router.put() tetap sama

router.post('/cart', async (req, res) => {
  try {
    const { id_menu, quantity } = req.body;
    if (!id_menu || !quantity) {
      return res.status(400).json({ error: 'id_menu dan quantity wajib diisi' });
    }

    await pool.query(
      'INSERT INTO cart (id_menu, quantity) VALUES (?, ?)',
      [id_menu, quantity]
    );

    res.status(201).json({ message: 'Berhasil menambahkan ke keranjang' });
  } catch (err) {
    console.error('Gagal tambah ke keranjang:', err);
    res.status(500).json({ error: 'Gagal menambahkan ke keranjang' });
  }
});

module.exports = router;

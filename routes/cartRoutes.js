const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT * FROM cart');
    res.json(results);
  } catch (err) {
    console.error('Gagal ambil cart:', err);
    res.status(500).json({ message: 'Gagal ambil data cart' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_menu, quantity } = req.body;

    if (!id_menu || !quantity) {
      return res.status(400).json({ message: 'Data tidak lengkap' });
    }

    const [results] = await pool.query('SELECT id FROM cart WHERE id_menu = ? LIMIT 1', [id_menu]);

    if (results.length > 0) {
      await pool.query('UPDATE cart SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?', [quantity, results[0].id]);
      return res.json({ message: 'Item di cart berhasil diupdate' });
    } else {
      await pool.query('INSERT INTO cart (id_menu, quantity, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [id_menu, quantity]);
      return res.status(201).json({ message: 'Item berhasil ditambahkan ke cart' });
    }
  } catch (err) {
    console.error('Gagal tambah/update cart:', err);
    res.status(500).json({ message: 'Gagal tambah/update cart' });
  }
});

module.exports = router;

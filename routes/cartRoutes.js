const express = require('express');
const router = express.Router();
const pool = require('../db'); 

router.get('/cart', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id_cart, c.id_menu, c.quantity, m.nama_menu, m.harga, m.foto_menu
      FROM cart c
      JOIN menu m ON c.id_menu = m.id_menu
    `);
    res.json(rows);
  } catch (error) {
    console.error('Gagal ambil keranjang:', error);
    res.status(500).json({ error: 'Gagal ambil keranjang' });
  }
});

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

router.put('/cart/:id_cart', async (req, res) => {
  const { id_cart } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Quantity harus lebih dari 0' });
  }

  try {
    await pool.query(
      'UPDATE cart SET quantity = ? WHERE id_cart = ?',
      [quantity, id_cart]
    );
    res.json({ message: 'Quantity berhasil diupdate' });
  } catch (error) {
    console.error('Gagal update quantity:', error);
    res.status(500).json({ error: 'Gagal update quantity' });
  }
});

router.delete('/cart/:id_cart', async (req, res) => {
  const { id_cart } = req.params;

  try {
    await pool.query('DELETE FROM cart WHERE id_cart = ?', [id_cart]);
    res.json({ message: 'Item berhasil dihapus dari keranjang' });
  } catch (error) {
    console.error('Gagal hapus item:', error);
    res.status(500).json({ error: 'Gagal hapus item dari keranjang' });
  }
});

module.exports = router;

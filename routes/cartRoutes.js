const express = require('express');
const router = express.Router();
const pool = require('../db'); // tambahkan ini!
const cartController = require('../controllers/cartController');

router.get('/cart', cartController.getCart);
router.put('/cart/:id_cart', cartController.updateCartQuantity);
router.delete('/cart/:id_cart', cartController.deleteCartItem);


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

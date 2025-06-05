const express = require('express');
const router = express.Router();
const db = require('../db');

console.log("cartRoutes loaded"); // ⬅️ tambahkan ini


router.get('/', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId) return res.status(400).json({ error: 'Session ID dibutuhkan' });

  const query = `
    SELECT c.id_cart, c.id_menu, c.quantity, m.nama_menu, m.harga, m.foto_menu
    FROM cart c
    JOIN menu m ON c.id_menu = m.id_menu
    WHERE c.session_id = ?
  `;
  db.query(query, [sessionId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Internal Server Error' });
    res.json(results);
  });
});

router.post('/', (req, res) => {  // <-- ini yang diubah
  const { id_menu, quantity } = req.body;
  const sessionId = req.headers['x-session-id'];
  if (!id_menu || !quantity || !sessionId) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const insertQuery = `
    INSERT INTO cart (id_menu, quantity, session_id)
    VALUES (?, ?, ?)
  `;
  db.query(insertQuery, [id_menu, quantity, sessionId], (err) => {
    if (err) return res.status(500).json({ error: 'Gagal menambahkan ke keranjang' });
    res.status(201).json({ message: 'Item berhasil ditambahkan ke keranjang' });
  });
});

router.put('/:id_cart', (req, res) => {
  const { quantity } = req.body;
  const { id_cart } = req.params;

  const updateQuery = 'UPDATE cart SET quantity = ? WHERE id_cart = ?';
  db.query(updateQuery, [quantity, id_cart], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Quantity updated' });
  });
});

router.delete('/:id_cart', (req, res) => {
  const { id_cart } = req.params;
  const deleteQuery = 'DELETE FROM cart WHERE id_cart = ?';
  db.query(deleteQuery, [id_cart], (err) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ message: 'Item removed from cart' });
  });
});

module.exports = router;

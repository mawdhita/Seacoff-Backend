const express = require('express');
const router = express.Router();
const db = require('../db');

// Endpoint: /api/sales-per-day
router.get('/sales-per-day', (req, res) => {
  const query = `
    SELECT DATE(created_at) AS date, SUM(total_pesanan) AS total_sales
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// Endpoint: /api/best-sellers
router.get('/best-sellers', (req, res) => {
  const query = `
    SELECT nama_produk, SUM(jumlah) AS total_terjual
    FROM order_items
    GROUP BY nama_produk
    ORDER BY total_terjual DESC
    LIMIT 5
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

module.exports = router;

// routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // pastikan file koneksi MySQL lo

// Get total sales per day
router.get('/sales-per-day', (req, res) => {
  const query = `
    SELECT DATE(created_at) as date, SUM(total_pesanan) as total_sales
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching sales per day:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// Get best-selling products
router.get('/best-sellers', (req, res) => {
  const query = `
    SELECT nama_produk, SUM(jumlah) as total_terjual
    FROM order_items
    GROUP BY nama_produk
    ORDER BY total_terjual DESC
    LIMIT 5
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching best sellers:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

module.exports = router;

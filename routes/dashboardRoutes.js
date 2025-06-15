const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

// Get total sales per day
router.get('/sales-per-day', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT DATE(created_at) as date, SUM(total_pesanan) as total_sales
      FROM orders
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching sales per day:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get total sales per week
router.get('/sales-per-week', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT
  COUNT(*) AS total_orders,
  SUM(total_pesanan) AS total_sales,
  SUM((SELECT SUM(jumlah) FROM order_items WHERE order_id = orders.id)) AS total_items
FROM orders
WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching sales per week:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get best-selling products
router.get('/best-sellers', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT p.nama_produk, p.kategori, SUM(oi.jumlah) as total_terjual
FROM order_items oi
JOIN products p ON oi.nama_produk = p.nama_produk
GROUP BY p.nama_produk, p.kategori
ORDER BY total_terjual DESC
LIMIT 5
    `);
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching best sellers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

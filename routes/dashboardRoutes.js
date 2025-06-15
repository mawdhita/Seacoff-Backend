const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

// Get total sales per day
router.get('/sales-per-day', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT DATE(created_at) as date, SUM(total_pesanan) as total_sales
      FROM orders
      WHERE status = 'paid'
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
        YEAR(created_at) AS year,
        WEEK(created_at, 1) AS week,
        COUNT(*) AS total_orders,
        SUM(total_pesanan) AS total_sales
      FROM orders
      WHERE status = 'paid'
      GROUP BY year, week
      ORDER BY year, week
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
      SELECT oi.nama_produk, SUM(oi.jumlah) AS total_terjual
      FROM order_items oi
      JOIN orders o ON oi.id_order = o.id_order
      WHERE o.status = 'paid'
      GROUP BY oi.nama_produk
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

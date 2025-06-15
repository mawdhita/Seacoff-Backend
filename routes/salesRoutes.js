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
        YEAR(created_at) AS year,
        WEEK(created_at, 1) AS week,
        COUNT(*) AS total_orders,
        SUM(total_pesanan) AS total_sales
      FROM orders
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
      SELECT kategori, nama_produk, total_terjual FROM (
        SELECT 
          p.kategori,
          oi.nama_produk,
          SUM(oi.jumlah) AS total_terjual,
          ROW_NUMBER() OVER (PARTITION BY p.kategori ORDER BY SUM(oi.jumlah) DESC) AS rn
        FROM order_items oi
        JOIN products p ON oi.nama_produk = p.nama_produk
        GROUP BY p.kategori, oi.nama_produk
      ) ranked
      WHERE rn = 1
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching best sellers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

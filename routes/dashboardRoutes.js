const express = require('express');
const router = express.Router();
const pool = require('../db'); // mysql2/promise

// Penjualan per hari untuk grafik
router.get('/sales-per-day', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT DATE(created_at) AS date, SUM(total_pesanan) AS total_sales
      FROM orders
      WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(results);
  } catch (err) {
    console.error('Error fetching sales per day:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Statistik penjualan dan item terjual minggu ini
router.get('/sales-per-week', async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT 
        IFNULL(SUM(total_pesanan), 0) AS total_income,
        IFNULL(SUM(total_items), 0) AS total_items
      FROM orders
      WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
    `);
    res.json(result[0]); // Frontend expects an object
  } catch (err) {
    console.error('Error fetching sales per week:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Menu terlaris: 1 makanan & 1 minuman
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

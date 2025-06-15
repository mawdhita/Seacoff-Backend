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
  SELECT nama_produk, kategori, SUM(jumlah) AS total_terjual
  FROM order_items
  GROUP BY nama_produk, kategori
  ORDER BY total_terjual DESC
`);

    res.json(results);
  } catch (err) {
    console.error('Error fetching sales per week:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get best-selling products
// Get best-selling products (Top 1 per kategori: makanan dan minuman)
router.get('/best-sellers', async (req, res) => {
  try {
    const [results] = await pool.query(`
      SELECT kategori, nama_produk, total_terjual
      FROM (
        SELECT p.kategori, oi.nama_produk, SUM(oi.jumlah) AS total_terjual
        FROM order_items oi
        JOIN products p ON oi.nama_produk = p.nama_produk
        GROUP BY p.kategori, oi.nama_produk
      ) AS sales
      WHERE (kategori = 'makanan' AND total_terjual = (
                SELECT MAX(jml) FROM (
                    SELECT SUM(oi.jumlah) AS jml
                    FROM order_items oi
                    JOIN products p ON oi.nama_produk = p.nama_produk
                    WHERE p.kategori = 'makanan'
                    GROUP BY oi.nama_produk
                ) AS sub1
            ))
         OR (kategori = 'minuman' AND total_terjual = (
                SELECT MAX(jml) FROM (
                    SELECT SUM(oi.jumlah) AS jml
                    FROM order_items oi
                    JOIN products p ON oi.nama_produk = p.nama_produk
                    WHERE p.kategori = 'minuman'
                    GROUP BY oi.nama_produk
                ) AS sub2
            ));
    `);

    res.json(results);
  } catch (err) {
    console.error('Error fetching best sellers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;

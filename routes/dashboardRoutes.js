const express = require('express');
const router = express.Router();
const pool = require('../db'); // Use pool instead of db for consistency

// Endpoint: /api/sales-per-day
router.get('/sales-per-day', async (req, res) => {
  try {
    const query = `
      SELECT DATE(created_at) AS date, SUM(total_pesanan) AS total_sales
      FROM orders
      WHERE created_at IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 30
    `;
    const [results] = await pool.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching daily sales:', err);
    res.status(500).json({ error: 'Gagal mengambil data penjualan harian', details: err.message });
  }
});

// Endpoint: /api/sales-per-week
router.get('/sales-per-week', async (req, res) => {
  try {
    const query = `
      SELECT 
        YEARWEEK(created_at, 1) as week_year,
        WEEK(created_at, 1) as week_number,
        YEAR(created_at) as year,
        DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) as week_start,
        SUM(total_pesanan) AS total_sales,
        COUNT(*) as total_orders
      FROM orders
      WHERE created_at IS NOT NULL
      GROUP BY YEARWEEK(created_at, 1)
      ORDER BY week_year DESC
      LIMIT 12
    `;
    const [results] = await pool.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching weekly sales:', err);
    res.status(500).json({ error: 'Gagal mengambil data penjualan mingguan', details: err.message });
  }
});

// Endpoint: /api/best-sellers
router.get('/best-sellers', async (req, res) => {
  try {
    const query = `
      SELECT 
        oi.nama_produk, 
        SUM(oi.jumlah) AS total_terjual,
        SUM(oi.jumlah * oi.harga) AS total_revenue
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id_order
      WHERE o.created_at IS NOT NULL
      GROUP BY oi.nama_produk
      ORDER BY total_terjual DESC
      LIMIT 5
    `;
    const [results] = await pool.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching best sellers:', err);
    res.status(500).json({ error: 'Gagal mengambil data best seller', details: err.message });
  }
});

// Additional endpoint: /api/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Get total sales today
    const todaySalesQuery = `
      SELECT COALESCE(SUM(total_pesanan), 0) as today_sales
      FROM orders 
      WHERE DATE(created_at) = CURDATE()
    `;
    
    // Get total orders today
    const todayOrdersQuery = `
      SELECT COUNT(*) as today_orders
      FROM orders 
      WHERE DATE(created_at) = CURDATE()
    `;
    
    // Get total sales this month
    const monthSalesQuery = `
      SELECT COALESCE(SUM(total_pesanan), 0) as month_sales
      FROM orders 
      WHERE YEAR(created_at) = YEAR(CURDATE()) 
      AND MONTH(created_at) = MONTH(CURDATE())
    `;

    const [todaySales] = await pool.query(todaySalesQuery);
    const [todayOrders] = await pool.query(todayOrdersQuery);
    const [monthSales] = await pool.query(monthSalesQuery);

    res.json({
      today_sales: todaySales[0].today_sales,
      today_orders: todayOrders[0].today_orders,
      month_sales: monthSales[0].month_sales
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Gagal mengambil ringkasan dashboard', details: err.message });
  }
});

module.exports = router;
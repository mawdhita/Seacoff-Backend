const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function untuk format tanggal
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Helper function untuk menghitung range tanggal
const getDateRange = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    start: formatDate(startDate),
    end: formatDate(endDate)
  };
};

// Endpoint: GET /api/dashboard/stats
// Mengembalikan statistik utama dashboard
router.get('/stats', (req, res) => {
  const queries = {
    // Penjualan minggu ini
    weeklyQuery: `
      SELECT 
        COALESCE(SUM(total_pesanan), 0) AS total_sales,
        COUNT(*) AS total_orders
      FROM orders 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `,
    
    // Penjualan hari ini
    todayQuery: `
      SELECT 
        COALESCE(SUM(total_pesanan), 0) AS today_sales,
        COUNT(*) AS today_orders
      FROM orders 
      WHERE DATE(created_at) = CURDATE()
    `,
    
    // Total menu aktif
    menuQuery: `
      SELECT COUNT(*) AS total_menu
      FROM products 
      WHERE status = 'active'
    `,
    
    // Pertumbuhan penjualan (minggu ini vs minggu lalu)
    growthQuery: `
      SELECT 
        SUM(CASE 
          WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
          THEN total_pesanan 
          ELSE 0 
        END) AS current_week,
        SUM(CASE 
          WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) 
          AND created_at < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          THEN total_pesanan 
          ELSE 0 
        END) AS previous_week
      FROM orders 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    `
  };

  // Eksekusi semua query secara paralel
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(queries.weeklyQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries.todayQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries.menuQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    }),
    new Promise((resolve, reject) => {
      db.query(queries.growthQuery, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    })
  ])
  .then(([weekly, today, menu, growth]) => {
    // Hitung persentase pertumbuhan
    const growthPercentage = growth.previous_week > 0 
      ? ((growth.current_week - growth.previous_week) / growth.previous_week * 100).toFixed(1)
      : 0;

    res.json({
      weekly_sales: weekly.total_sales || 0,
      weekly_orders: weekly.total_orders || 0,
      today_sales: today.today_sales || 0,
      today_orders: today.today_orders || 0,
      total_menu: menu.total_menu || 0,
      growth_percentage: parseFloat(growthPercentage),
      daily_average: weekly.total_sales ? Math.round(weekly.total_sales / 7) : 0
    });
  })
  .catch(err => {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  });
});

// Endpoint: GET /api/dashboard/sales-per-day
// Mengembalikan data penjualan harian (7 hari terakhir)
router.get('/sales-per-day', (req, res) => {
  const days = req.query.days || 7; // Default 7 hari
  
  const query = `
    SELECT 
      DATE(created_at) AS date, 
      COALESCE(SUM(total_pesanan), 0) AS total_sales,
      COUNT(*) AS total_orders
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at) ASC
  `;
  
  db.query(query, [days], (err, results) => {
    if (err) {
      console.error('Error fetching daily sales:', err);
      return res.status(500).json({ error: 'Failed to fetch daily sales data' });
    }
    
    // Pastikan semua hari dalam range terisi (isi dengan 0 jika tidak ada data)
    const dateRange = getDateRange(days);
    const filledResults = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - (days - 1 - i));
      const dateStr = formatDate(currentDate);
      
      const existingData = results.find(row => row.date === dateStr);
      filledResults.push({
        date: dateStr,
        total_sales: existingData ? existingData.total_sales : 0,
        total_orders: existingData ? existingData.total_orders : 0
      });
    }
    
    res.json(filledResults);
  });
});

// Endpoint: GET /api/dashboard/best-sellers
// Mengembalikan menu terlaris
router.get('/best-sellers', (req, res) => {
  const limit = req.query.limit || 5; // Default 5 item
  const days = req.query.days || 30; // Default 30 hari terakhir
  
  const query = `
    SELECT 
      oi.nama_produk,
      SUM(oi.jumlah) AS total_terjual,
      COALESCE(SUM(oi.jumlah * oi.harga), 0) AS total_revenue,
      COUNT(DISTINCT o.id) AS order_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY oi.nama_produk
    ORDER BY total_terjual DESC
    LIMIT ?
  `;
  
  db.query(query, [days, parseInt(limit)], (err, results) => {
    if (err) {
      console.error('Error fetching best sellers:', err);
      return res.status(500).json({ error: 'Failed to fetch best sellers data' });
    }
    res.json(results);
  });
});

// Endpoint: GET /api/dashboard/sales-per-week
// Mengembalikan data penjualan per minggu
router.get('/sales-per-week', (req, res) => {
  const weeks = req.query.weeks || 8; // Default 8 minggu terakhir
  
  const query = `
    SELECT
      YEAR(created_at) AS year,
      WEEK(created_at, 1) AS week,
      COALESCE(SUM(total_pesanan), 0) AS total_sales,
      COUNT(*) AS total_orders,
      DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) AS week_start
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
    GROUP BY year, week
    ORDER BY year ASC, week ASC
  `;
  
  db.query(query, [weeks], (err, results) => {
    if (err) {
      console.error('Error fetching weekly sales:', err);
      return res.status(500).json({ error: 'Failed to fetch weekly sales data' });
    }
    res.json(results);
  });
});

// Endpoint: GET /api/dashboard/sales-per-month
// Mengembalikan data penjualan per bulan
router.get('/sales-per-month', (req, res) => {
  const months = req.query.months || 6; // Default 6 bulan terakhir
  
  const query = `
    SELECT
      YEAR(created_at) AS year,
      MONTH(created_at) AS month,
      MONTHNAME(created_at) AS month_name,
      COALESCE(SUM(total_pesanan), 0) AS total_sales,
      COUNT(*) AS total_orders
    FROM orders
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY year, month
    ORDER BY year ASC, month ASC
  `;
  
  db.query(query, [months], (err, results) => {
    if (err) {
      console.error('Error fetching monthly sales:', err);
      return res.status(500).json({ error: 'Failed to fetch monthly sales data' });
    }
    res.json(results);
  });
});

// Endpoint: GET /api/dashboard/recent-orders
// Mengembalikan pesanan terbaru
router.get('/recent-orders', (req, res) => {
  const limit = req.query.limit || 10; // Default 10 pesanan terbaru
  
  const query = `
    SELECT 
      o.id,
      o.total_pesanan,
      o.status,
      o.created_at,
      o.customer_name,
      COUNT(oi.id) AS item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT ?
  `;
  
  db.query(query, [parseInt(limit)], (err, results) => {
    if (err) {
      console.error('Error fetching recent orders:', err);
      return res.status(500).json({ error: 'Failed to fetch recent orders' });
    }
    res.json(results);
  });
});

// Endpoint: GET /api/dashboard/sales-by-category
// Mengembalikan penjualan berdasarkan kategori produk
router.get('/sales-by-category', (req, res) => {
  const days = req.query.days || 30; // Default 30 hari terakhir
  
  const query = `
    SELECT 
      p.category,
      COALESCE(SUM(oi.jumlah * oi.harga), 0) AS total_sales,
      SUM(oi.jumlah) AS total_quantity
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.nama_produk = p.name
    WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY p.category
    ORDER BY total_sales DESC
  `;
  
  db.query(query, [days], (err, results) => {
    if (err) {
      console.error('Error fetching sales by category:', err);
      return res.status(500).json({ error: 'Failed to fetch sales by category' });
    }
    res.json(results);
  });
});

// Endpoint: GET /api/dashboard/hourly-sales
// Mengembalikan penjualan berdasarkan jam (hari ini)
router.get('/hourly-sales', (req, res) => {
  const date = req.query.date || formatDate(new Date()); // Default hari ini
  
  const query = `
    SELECT 
      HOUR(created_at) AS hour,
      COALESCE(SUM(total_pesanan), 0) AS total_sales,
      COUNT(*) AS total_orders
    FROM orders
    WHERE DATE(created_at) = ?
    GROUP BY HOUR(created_at)
    ORDER BY hour ASC
  `;
  
  db.query(query, [date], (err, results) => {
    if (err) {
      console.error('Error fetching hourly sales:', err);
      return res.status(500).json({ error: 'Failed to fetch hourly sales data' });
    }
    
    // Isi jam yang kosong dengan 0
    const filledResults = [];
    for (let hour = 0; hour < 24; hour++) {
      const existingData = results.find(row => row.hour === hour);
      filledResults.push({
        hour: hour,
        hour_display: `${hour.toString().padStart(2, '0')}:00`,
        total_sales: existingData ? existingData.total_sales : 0,
        total_orders: existingData ? existingData.total_orders : 0
      });
    }
    
    res.json(filledResults);
  });
});

// Endpoint: GET /api/dashboard/summary
// Mengembalikan ringkasan lengkap dashboard
router.get('/summary', async (req, res) => {
  try {
    // Panggil semua endpoint secara paralel untuk efisiensi
    const [stats, dailySales, bestSellers, recentOrders] = await Promise.all([
      new Promise((resolve, reject) => {
        // Panggil endpoint stats
        const statsReq = { query: {} };
        const statsRes = {
          json: resolve,
          status: () => ({ json: reject })
        };
        router.handle({ method: 'GET', url: '/stats' }, statsRes);
      }),
      new Promise((resolve, reject) => {
        db.query(`
          SELECT DATE(created_at) AS date, SUM(total_pesanan) AS total_sales
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at)
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(`
          SELECT oi.nama_produk, SUM(oi.jumlah) AS total_terjual
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY oi.nama_produk
          ORDER BY total_terjual DESC
          LIMIT 5
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(`
          SELECT id, total_pesanan, status, created_at, customer_name
          FROM orders
          ORDER BY created_at DESC
          LIMIT 5
        `, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      })
    ]);

    res.json({
      stats,
      daily_sales: dailySales,
      best_sellers: bestSellers,
      recent_orders: recentOrders,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

module.exports = router;
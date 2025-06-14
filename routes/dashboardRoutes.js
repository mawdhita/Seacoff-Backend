const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Authentication middleware (assuming you want to protect these endpoints)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token akses diperlukan'
    });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key', (err, admin) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
    req.admin = admin;
    next();
  });
};

// Helper function to promisify database queries
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Validation helper for date parameters
const validateDateRange = (startDate, endDate) => {
  const errors = [];
  
  if (startDate && !Date.parse(startDate)) {
    errors.push('Format tanggal mulai tidak valid');
  }
  
  if (endDate && !Date.parse(endDate)) {
    errors.push('Format tanggal akhir tidak valid');
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    errors.push('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
  }
  
  return errors;
};

// Endpoint: /api/dashboard/sales-per-day
router.get('/sales-per-day', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, limit = 30 } = req.query;
    
    // Validate date parameters
    const dateErrors = validateDateRange(start_date, end_date);
    if (dateErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tidak valid',
        errors: dateErrors
      });
    }

    let query = `
      SELECT 
        DATE(created_at) AS date, 
        SUM(total_pesanan) AS total_sales,
        COUNT(*) AS total_orders,
        AVG(total_pesanan) AS avg_order_value
      FROM orders 
      WHERE status != 'cancelled'
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }
    
    query += `
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const results = await queryAsync(query, params);
    
    // Calculate summary statistics
    const totalSales = results.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0);
    const totalOrders = results.reduce((sum, row) => sum + parseInt(row.total_orders || 0), 0);
    
    res.json({
      success: true,
      data: {
        daily_sales: results,
        summary: {
          total_sales: totalSales,
          total_orders: totalOrders,
          avg_daily_sales: results.length > 0 ? totalSales / results.length : 0,
          period_days: results.length
        }
      }
    });
    
  } catch (error) {
    console.error('Sales per day error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data penjualan harian'
    });
  }
});

// Endpoint: /api/dashboard/best-sellers
router.get('/best-sellers', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;
    
    // Validate parameters
    const dateErrors = validateDateRange(start_date, end_date);
    if (dateErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Parameter tidak valid',
        errors: dateErrors
      });
    }

    let query = `
      SELECT 
        oi.nama_produk,
        SUM(oi.jumlah) AS total_terjual,
        SUM(oi.jumlah * oi.harga) AS total_revenue,
        AVG(oi.harga) AS avg_price,
        COUNT(DISTINCT o.id_order) AS total_orders
      FROM order_items oi
      JOIN orders o ON oi.id_order = o.id_order
      WHERE o.status != 'cancelled'
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }
    
    query += `
      GROUP BY oi.nama_produk
      ORDER BY total_terjual DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const results = await queryAsync(query, params);
    
    res.json({
      success: true,
      data: {
        best_sellers: results,
        total_products: results.length
      }
    });
    
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk terlaris'
    });
  }
});

// Endpoint: /api/dashboard/overview
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    
    const queries = {
      totalSales: `
        SELECT 
          COALESCE(SUM(total_pesanan), 0) AS total,
          COUNT(*) AS count
        FROM orders 
        WHERE status != 'cancelled' 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      totalOrders: `
        SELECT COUNT(*) AS total
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      totalCustomers: `
        SELECT COUNT(DISTINCT nama_pelanggan) AS total
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      avgOrderValue: `
        SELECT AVG(total_pesanan) AS avg_value
        FROM orders 
        WHERE status != 'cancelled'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      `,
      ordersByStatus: `
        SELECT 
          status,
          COUNT(*) AS count,
          SUM(total_pesanan) AS total_value
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY status
      `
    };

    const [salesData, ordersData, customersData, avgOrderData, statusData] = await Promise.all([
      queryAsync(queries.totalSales, [period]),
      queryAsync(queries.totalOrders, [period]),
      queryAsync(queries.totalCustomers, [period]),
      queryAsync(queries.avgOrderValue, [period]),
      queryAsync(queries.ordersByStatus, [period])
    ]);

    res.json({
      success: true,
      data: {
        period_days: parseInt(period),
        total_sales: salesData[0]?.total || 0,
        total_orders: ordersData[0]?.total || 0,
        total_customers: customersData[0]?.total || 0,
        avg_order_value: avgOrderData[0]?.avg_value || 0,
        orders_by_status: statusData,
        generated_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data overview dashboard'
    });
  }
});

// Endpoint: /api/dashboard/revenue-trend
router.get('/revenue-trend', authenticateToken, async (req, res) => {
  try {
    const { period = 'week' } = req.query; // week, month, year
    
    let dateFormat, intervalDays;
    
    switch (period) {
      case 'week':
        dateFormat = '%Y-%m-%d';
        intervalDays = 7;
        break;
      case 'month':
        dateFormat = '%Y-%m-%d';
        intervalDays = 30;
        break;
      case 'year':
        dateFormat = '%Y-%m';
        intervalDays = 365;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Period harus week, month, atau year'
        });
    }

    const query = `
      SELECT 
        DATE_FORMAT(created_at, ?) AS period,
        SUM(total_pesanan) AS revenue,
        COUNT(*) AS orders
      FROM orders 
      WHERE status != 'cancelled'
      AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE_FORMAT(created_at, ?)
      ORDER BY period ASC
    `;

    const results = await queryAsync(query, [dateFormat, intervalDays, dateFormat]);
    
    res.json({
      success: true,
      data: {
        period: period,
        trend_data: results,
        total_periods: results.length
      }
    });
    
  } catch (error) {
    console.error('Revenue trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data trend revenue'
    });
  }
});

// Endpoint: /api/dashboard/top-customers
router.get('/top-customers', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        nama_pelanggan,
        COUNT(*) AS total_orders,
        SUM(total_pesanan) AS total_spent,
        AVG(total_pesanan) AS avg_order_value,
        MAX(created_at) AS last_order_date
      FROM orders 
      WHERE status != 'cancelled'
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }
    
    query += `
      GROUP BY nama_pelanggan
      ORDER BY total_spent DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    const results = await queryAsync(query, params);
    
    res.json({
      success: true,
      data: {
        top_customers: results,
        total_customers: results.length
      }
    });
    
  } catch (error) {
    console.error('Top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data pelanggan teratas'
    });
  }
});

// Endpoint: /api/dashboard/sales-by-category
router.get('/sales-by-category', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        m.kategori,
        SUM(oi.jumlah) AS total_quantity,
        SUM(oi.jumlah * oi.harga) AS total_revenue,
        COUNT(DISTINCT o.id_order) AS total_orders
      FROM order_items oi
      JOIN orders o ON oi.id_order = o.id_order
      JOIN menu m ON oi.nama_produk = m.nama_menu
      WHERE o.status != 'cancelled'
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }
    
    query += `
      GROUP BY m.kategori
      ORDER BY total_revenue DESC
    `;

    const results = await queryAsync(query, params);
    
    res.json({
      success: true,
      data: {
        sales_by_category: results,
        total_categories: results.length
      }
    });
    
  } catch (error) {
    console.error('Sales by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data penjualan per kategori'
    });
  }
});

module.exports = router;

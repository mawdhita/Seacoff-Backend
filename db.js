const mysql = require('mysql2/promise');  // pakai promise agar mudah async/await
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
   waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // 10 detik
});

// Opsional: tes koneksi awal
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected ke MySQL database balen_coffee');
    connection.release();
  } catch (err) {
    console.error('Error connect ke database:', err);
  }
})();

module.exports = pool;

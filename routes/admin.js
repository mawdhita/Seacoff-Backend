const express = require('express');
const router = express.Router();
const db = require('../config/db'); // koneksi DB MySQL
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Pastikan menggunakan dotenv untuk environment variables

// Login Admin
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password harus diisi' });
  }

  // Query ke database untuk mencari admin berdasarkan username
  db.query('SELECT * FROM admins WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Admin tidak ditemukan' });
    }

    const admin = results[0];

    // Verifikasi password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // Buat token JWT dengan secret key yang aman (gunakan env variable)
    const token = jwt.sign({ id_admin: admin.id_admin }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Kirim response dengan token dan data admin
    res.json({
      message: 'Login berhasil',
      token,
      admin: {
        id_admin: admin.id_admin,
        username: admin.username,
      }
    });
  });
});

module.exports = router;

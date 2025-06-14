const db = require('../db'); // Import db.js dari root project
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Rate limiting storage (in production, use Redis)
const loginAttempts = new Map();

// Input validation helper
const validateLoginInput = (username, password) => {
  const errors = [];
  
  if (!username || username.trim().length === 0) {
    errors.push('Username harus diisi');
  }
  
  if (!password || password.length === 0) {
    errors.push('Password harus diisi');
  }
  
  if (username && username.length < 3) {
    errors.push('Username minimal 3 karakter');
  }
  
  return errors;
};

// Rate limiting helper
const checkRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  if (!loginAttempts.has(ip)) {
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  const attempts = loginAttempts.get(ip);
  
  // Reset if window expired
  if (now > attempts.resetTime) {
    loginAttempts.delete(ip);
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  
  // Check if max attempts reached
  if (attempts.count >= maxAttempts) {
    return { 
      allowed: false, 
      resetTime: attempts.resetTime,
      message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' 
    };
  }
  
  return { allowed: true, remaining: maxAttempts - attempts.count - 1 };
};

// Update login attempts
const updateLoginAttempts = (ip, success = false) => {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  if (loginAttempts.has(ip)) {
    const attempts = loginAttempts.get(ip);
    attempts.count++;
  } else {
    loginAttempts.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Input validation
    const validationErrors = validateLoginInput(username, password);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data input tidak valid',
        errors: validationErrors
      });
    }

    // Rate limiting check
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message
      });
    }

    // Database query with promise wrapper
    const queryAsync = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Check if admin exists and is active
    const sql = "SELECT * FROM admins WHERE username = ? AND is_active = 1";
    const results = await queryAsync(sql, [username]);

    if (results.length === 0) {
      updateLoginAttempts(clientIp, false);
      return res.status(401).json({
        success: false,
        message: "Username atau password salah"
      });
    }

    const admin = results[0];

    // Verify password
    let isPasswordValid = false;
    
    // Check if password is hashed (bcrypt hashes start with $2b$)
    if (admin.password.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, admin.password);
    } else {
      // For backward compatibility with plain text passwords
      // WARNING: This should be removed in production
      isPasswordValid = (password === admin.password);
      
      // Hash the password for future use
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await queryAsync(
          "UPDATE admins SET password = ? WHERE id_admin = ?",
          [hashedPassword, admin.id_admin]
        );
      }
    }

    if (!isPasswordValid) {
      updateLoginAttempts(clientIp, false);
      return res.status(401).json({
        success: false,
        message: "Username atau password salah"
      });
    }

    // Update last login
    await queryAsync(
      "UPDATE admins SET last_login = NOW() WHERE id_admin = ?",
      [admin.id_admin]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id_admin: admin.id_admin,
        username: admin.username,
        role: admin.role || 'admin'
      },
      process.env.JWT_SECRET_KEY || 'your-secret-key',
      { expiresIn: '8h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id_admin: admin.id_admin },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_KEY || 'your-refresh-secret',
      { expiresIn: '7d' }
    );

    // Clear login attempts on successful login
    updateLoginAttempts(clientIp, true);

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        token,
        refreshToken,
        admin: {
          id_admin: admin.id_admin,
          username: admin.username,
          role: admin.role || 'admin',
          last_login: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server"
    });
  }
};

// Verify token
const verifyToken = (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token akses diperlukan'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    res.json({
      success: true,
      message: 'Token valid',
      data: {
        admin: {
          id_admin: decoded.id_admin,
          username: decoded.username,
          role: decoded.role
        }
      }
    });
  });
};

// Logout
const logoutAdmin = (req, res) => {
  // In production, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
};

// Get admin profile
const getProfile = async (req, res) => {
  try {
    const adminId = req.admin.id_admin;

    const queryAsync = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    const results = await queryAsync(
      "SELECT id_admin, username, email, role, created_at, last_login FROM admins WHERE id_admin = ?",
      [adminId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: {
        admin: results[0]
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const adminId = req.admin.id_admin;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Semua field password harus diisi'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password baru dan konfirmasi password tidak cocok'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter'
      });
    }

    const queryAsync = (sql, params) => {
      return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    // Get current admin data
    const results = await queryAsync(
      "SELECT * FROM admins WHERE id_admin = ?",
      [adminId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin tidak ditemukan'
      });
    }

    const admin = results[0];

    // Verify current password
    let isCurrentPasswordValid = false;
    if (admin.password.startsWith('$2b$')) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    } else {
      isCurrentPasswordValid = (currentPassword === admin.password);
    }

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password saat ini salah'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await queryAsync(
      "UPDATE admins SET password = ?, updated_at = NOW() WHERE id_admin = ?",
      [hashedNewPassword, adminId]
    );

    res.json({
      success: true,
      message: 'Password berhasil diubah'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
};

module.exports = {
  loginAdmin,
  verifyToken,
  logoutAdmin,
  getProfile,
  changePassword
};

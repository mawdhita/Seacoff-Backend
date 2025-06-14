const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Middleware for token authentication
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

// Public routes
router.post('/login', authController.loginAdmin);

// Protected routes
router.get('/verify', authController.verifyToken);
router.post('/logout', authenticateToken, authController.logoutAdmin);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;

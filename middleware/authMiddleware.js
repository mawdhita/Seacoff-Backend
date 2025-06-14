const jwt = require('jsonwebtoken');
require('dotenv').config();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token akses diperlukan',
      error: 'MISSING_TOKEN'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key', (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token sudah expired',
          error: 'TOKEN_EXPIRED'
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({
          success: false,
          message: 'Token tidak valid',
          error: 'INVALID_TOKEN'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Token tidak dapat diverifikasi',
        error: 'TOKEN_VERIFICATION_FAILED'
      });
    }
    
    req.admin = decoded;
    next();
  });
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.admin = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET_KEY || 'your-secret-key', (err, decoded) => {
    if (err) {
      req.admin = null;
    } else {
      req.admin = decoded;
    }
    next();
  });
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const userRole = req.admin.role || 'admin';
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        user_role: userRole
      });
    }

    next();
  };
};

// Super admin only
const requireSuperAdmin = requireRole(['super_admin']);

// Admin or super admin
const requireAdmin = requireRole(['admin', 'super_admin']);

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin
};

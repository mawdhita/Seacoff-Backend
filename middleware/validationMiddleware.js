// Input validation middleware
const validateRequired = (fields) => {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };

    fields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} harus diisi`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data input tidak valid',
        errors: errors
      });
    }

    next();
  };
};

// Validate menu ID
const validateMenuId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID menu harus disediakan',
      error: 'MISSING_MENU_ID'
    });
  }

  if (isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID menu tidak valid',
      error: 'INVALID_MENU_ID'
    });
  }

  req.params.id = parseInt(id);
  next();
};

// Validate order ID
const validateOrderId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID order harus disediakan',
      error: 'MISSING_ORDER_ID'
    });
  }

  if (isNaN(id) || parseInt(id) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID order tidak valid',
      error: 'INVALID_ORDER_ID'
    });
  }

  req.params.id = parseInt(id);
  next();
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  let { limit = 50, offset = 0 } = req.query;

  // Convert to integers
  limit = parseInt(limit);
  offset = parseInt(offset);

  // Validate limit
  if (isNaN(limit) || limit <= 0) {
    limit = 50;
  }
  if (limit > 100) {
    limit = 100; // Maximum limit
  }

  // Validate offset
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  req.query.limit = limit;
  req.query.offset = offset;
  next();
};

// Validate date range
const validateDateRange = (req, res, next) => {
  const { start_date, end_date } = req.query;
  const errors = [];

  if (start_date && !isValidDate(start_date)) {
    errors.push('Format start_date tidak valid (gunakan YYYY-MM-DD)');
  }

  if (end_date && !isValidDate(end_date)) {
    errors.push('Format end_date tidak valid (gunakan YYYY-MM-DD)');
  }

  if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
    errors.push('start_date tidak boleh lebih besar dari end_date');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Parameter tanggal tidak valid',
      errors: errors
    });
  }

  next();
};

// Validate email format
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }
  }

  next();
};

// Validate phone number
const validatePhone = (req, res, next) => {
  const { phone, no_telepon } = req.body;
  const phoneNumber = phone || no_telepon;
  
  if (phoneNumber) {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s|-/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Format nomor telepon tidak valid',
        error: 'INVALID_PHONE_FORMAT'
      });
    }
  }

  next();
};

// Validate login input
const validateLoginInput = (req, res, next) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || username.trim().length === 0) {
    errors.push('Username harus diisi');
  } else if (username.length < 3) {
    errors.push('Username minimal 3 karakter');
  }

  if (!password || password.length === 0) {
    errors.push('Password harus diisi');
  } else if (password.length < 6) {
    errors.push('Password minimal 6 karakter');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Data login tidak valid',
      errors: errors
    });
  }

  next();
};

// Helper function to validate date
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Sanitize input
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key].trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  next();
};

module.exports = {
  validateRequired,
  validateMenuId,
  validateOrderId,
  validatePagination,
  validateDateRange,
  validateEmail,
  validatePhone,
  validateLoginInput,
  sanitizeInput
};

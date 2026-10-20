const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sai_university_lost_and_found_jwt_secret_key_2026');
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'User not found in system' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }
  }
  return res.status(401).json({ success: false, message: 'Authorization denied: Bearer token missing' });
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Forbidden: Admin access privileges required' });
};

module.exports = { protect, adminOnly };

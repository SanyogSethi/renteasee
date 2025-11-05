const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'User account is blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

const isOwner = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Access denied. Owner only.' });
  }
  next();
};

const isTenant = (req, res, next) => {
  if (req.user.role !== 'tenant') {
    return res.status(403).json({ message: 'Access denied. Tenant only.' });
  }
  next();
};

module.exports = { auth, isAdmin, isOwner, isTenant };



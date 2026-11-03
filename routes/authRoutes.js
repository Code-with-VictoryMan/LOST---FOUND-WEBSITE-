const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const offlineStore = require('../config/offlineStore');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'sai_university_lost_and_found_jwt_secret_key_2026', {
    expiresIn: '7d'
  });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    // Resilient offline fallback if MongoDB is buffering / waiting for connection
    if (mongoose.connection.readyState !== 1) {
      const existingUser = offlineStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists' });
      }
      const newUser = {
        _id: 'usr_' + Date.now(),
        name,
        email: email.toLowerCase(),
        passwordHash: bcrypt.hashSync(password, 8),
        role: role === 'admin' ? 'admin' : (role || 'student'),
        phone: phone || 'N/A'
      };
      offlineStore.users.push(newUser);
      const token = generateToken(newUser._id);
      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        token,
        user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'admin' : (role || 'student'),
      phone: phone || 'N/A'
    });

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    // Resilient offline fallback if MongoDB is buffering / waiting for connection
    if (mongoose.connection.readyState !== 1) {
      const user = offlineStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user && bcrypt.compareSync(password, user.passwordHash)) {
        const token = generateToken(user._id);
        return res.status(200).json({
          success: true,
          message: 'Logged in successfully',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials' });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
});

module.exports = router;

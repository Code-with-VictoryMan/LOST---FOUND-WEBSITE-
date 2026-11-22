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

// @route   POST /api/auth/register (Store Student Credentials & Profile into MongoDB)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, studentId, department, yearOfStudy } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    // Resilient offline fallback if MongoDB is not connected
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
        phone: phone || 'N/A',
        studentId: studentId || ('SAIU' + Math.floor(1000 + Math.random() * 9000)),
        department: department || 'School of Computing & Data Science',
        yearOfStudy: yearOfStudy || '3rd Year B.Tech'
      };
      offlineStore.users.push(newUser);
      const token = generateToken(newUser._id);
      return res.status(201).json({
        success: true,
        message: 'Account registered and saved successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          studentId: newUser.studentId,
          department: newUser.department,
          yearOfStudy: newUser.yearOfStudy
        }
      });
    }

    // MongoDB Persistence
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'admin' : (role || 'student'),
      phone: phone || 'N/A',
      studentId: studentId || ('SAIU' + Math.floor(1000 + Math.random() * 9000)),
      department: department || 'School of Computing & Data Science',
      yearOfStudy: yearOfStudy || '3rd Year B.Tech'
    });

    const token = generateToken(user._id);
    return res.status(201).json({
      success: true,
      message: 'Account registered and saved into MongoDB successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        studentId: user.studentId,
        department: user.department,
        yearOfStudy: user.yearOfStudy
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login (Verify Credentials against MongoDB)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter email and password' });
    }

    // Resilient offline fallback if MongoDB is not connected
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
            role: user.role,
            phone: user.phone || 'N/A',
            studentId: user.studentId || 'SAIU-DEMO',
            department: user.department || 'School of Computing & Data Science',
            yearOfStudy: user.yearOfStudy || '3rd Year B.Tech'
          }
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password credentials' });
    }

    // Query MongoDB
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please verify your email or click Register.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password entered. Please try again.'
      });
    }

    // Persist Login Activity Details into MongoDB
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.unshift({
      timestamp: new Date(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Web Client'
    });
    if (user.loginHistory.length > 20) {
      user.loginHistory = user.loginHistory.slice(0, 20);
    }
    await user.save();

    const token = generateToken(user._id);
    return res.status(200).json({
      success: true,
      message: 'Logged in successfully via MongoDB',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || 'N/A',
        studentId: user.studentId || 'N/A',
        department: user.department || 'School of Computing & Data Science',
        yearOfStudy: user.yearOfStudy || '3rd Year B.Tech',
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/reset-password (Self-service password update)
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (mongoose.connection.readyState !== 1) {
      const user = offlineStore.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered account found with this email' });
      }
      user.passwordHash = bcrypt.hashSync(newPassword, 8);
      return res.status(200).json({ success: true, message: 'Password reset successfully. You can now log in.' });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered account found with this email' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password successfully updated in MongoDB. You can now log in.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me (Get authenticated student details)
router.get('/me', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
    user: req.user
  });
});

// @route   GET /api/auth/profile (Alias for /me)
router.get('/profile', protect, async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
    user: req.user
  });
});

// @route   PUT /api/auth/profile (Update student profile details in MongoDB)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, studentId, department, yearOfStudy } = req.body;
    if (mongoose.connection.readyState !== 1) {
      if (req.user) {
        if (name) req.user.name = name;
        if (phone) req.user.phone = phone;
        if (studentId) req.user.studentId = studentId;
        if (department) req.user.department = department;
        if (yearOfStudy) req.user.yearOfStudy = yearOfStudy;
      }
      return res.status(200).json({ success: true, message: 'Profile updated', user: req.user });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, phone, studentId, department, yearOfStudy } },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Student profile updated in MongoDB',
      user: updatedUser
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/login-history (View user's persistent login logs)
router.get('/login-history', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        loginCount: 1,
        lastLogin: new Date(),
        history: [{ timestamp: new Date(), ipAddress: '127.0.0.1', userAgent: 'Local Session' }]
      });
    }

    const user = await User.findById(req.user._id).select('lastLogin loginCount loginHistory name email studentId');
    return res.status(200).json({
      success: true,
      loginCount: user?.loginCount || 1,
      lastLogin: user?.lastLogin || new Date(),
      history: user?.loginHistory || []
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

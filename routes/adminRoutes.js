const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const User = require('../models/User');
const offlineStore = require('../config/offlineStore');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/admin/stats (Dashboard Analytics & Chart Data)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const items = offlineStore.items;
      const totalItems = items.length;
      const lostItems = items.filter(i => i.type === 'lost').length;
      const foundItems = items.filter(i => i.type === 'found').length;
      const resolvedItems = items.filter(i => i.status === 'resolved').length;
      const openItems = items.filter(i => i.status === 'open').length;

      const catMap = {};
      items.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + 1; });
      const categoryStats = Object.keys(catMap).map(k => ({ _id: k, count: catMap[k] }));

      const bldMap = {};
      items.forEach(i => { bldMap[i.building] = (bldMap[i.building] || 0) + 1; });
      const buildingStats = Object.keys(bldMap).map(k => ({ _id: k, count: bldMap[k] }));

      return res.status(200).json({
        success: true,
        stats: {
          totalItems,
          lostItems,
          foundItems,
          resolvedItems,
          openItems,
          totalClaims: offlineStore.claims.length,
          totalUsers: offlineStore.users.length,
          recoveryRate: totalItems > 0 ? ((resolvedItems / totalItems) * 100).toFixed(1) : 0
        },
        categoryStats,
        buildingStats
      });
    }
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: 'lost' });
    const foundItems = await Item.countDocuments({ type: 'found' });
    const resolvedItems = await Item.countDocuments({ status: 'resolved' });
    const openItems = await Item.countDocuments({ status: 'open' });
    const totalClaims = await Claim.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'student' });

    // Category breakdown
    const categoryStats = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Building breakdown
    const buildingStats = await Item.aggregate([
      { $group: { _id: '$building', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalItems,
        lostItems,
        foundItems,
        resolvedItems,
        openItems,
        totalClaims,
        totalUsers,
        recoveryRate: totalItems > 0 ? ((resolvedItems / totalItems) * 100).toFixed(1) : 0
      },
      categoryStats,
      buildingStats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/all-items
router.get('/all-items', protect, adminOnly, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: offlineStore.items.length, data: offlineStore.items });
    }
    const items = await Item.find()
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/all-claims
router.get('/all-claims', protect, adminOnly, async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate('item', 'title category building type status')
      .populate('claimant', 'name email phone')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

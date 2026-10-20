const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/admin/stats (Dashboard Analytics & Chart Data)
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
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

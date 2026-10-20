const express = require('express');
const router = express.Router();
const Claim = require('../models/Claim');
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');

// @route   POST /api/claims (Submit Claim for an Item)
router.post('/', protect, async (req, res) => {
  try {
    const { itemId, proofDescription, contactPhone } = req.body;

    if (!itemId || !proofDescription || !contactPhone) {
      return res.status(400).json({
        success: false,
        message: 'Item ID, proof description, and contact phone are required'
      });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Target item not found' });
    }

    if (item.reportedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot submit an ownership claim on an item you reported yourself'
      });
    }

    // Check if user already submitted a pending claim on this item
    const existing = await Claim.findOne({ item: itemId, claimant: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active pending claim for this item'
      });
    }

    const claim = await Claim.create({
      item: itemId,
      claimant: req.user._id,
      proofDescription,
      contactPhone
    });

    // Mark item status as claimed
    item.status = 'claimed';
    await item.save();

    return res.status(201).json({
      success: true,
      message: 'Claim request submitted for verification',
      data: claim
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/claims/my-claims (Student dashboard view)
router.get('/my-claims', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ claimant: req.user._id })
      .populate('item')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/claims/item/:itemId (Item reporter or Admin reviews claims)
router.get('/item/:itemId', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized to view claims for this item' });
    }

    const claims = await Claim.find({ item: req.params.itemId })
      .populate('claimant', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: claims.length, data: claims });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/claims/:id/status (Approve or Reject Claim)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const claim = await Claim.findById(req.params.id).populate('item');
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    const item = await Item.findById(claim.item._id);
    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the item reporter or admin can review this claim' });
    }

    claim.status = status;
    claim.reviewNotes = reviewNotes || (status === 'approved' ? 'Claim verified and item returned' : 'Proof insufficient');
    await claim.save();

    if (status === 'approved') {
      item.status = 'resolved';
      await item.save();
    } else {
      const remainingPending = await Claim.findOne({ item: item._id, status: 'pending' });
      item.status = remainingPending ? 'claimed' : 'open';
      await item.save();
    }

    return res.status(200).json({
      success: true,
      message: `Claim ${status} successfully`,
      data: claim
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { protect } = require('../middleware/auth');

// @route   GET /api/items (Search, Filter, Sort)
router.get('/', async (req, res) => {
  try {
    const { search, type, category, building, status, sort } = req.query;
    let query = {};

    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { specificLocation: { $regex: search, $options: 'i' } }
      ];
    }

    if (type && type !== 'all') query.type = type;
    if (category && category !== 'all') query.category = category;
    if (building && building !== 'all') query.building = building;
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $in: ['open', 'claimed'] };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { dateOccurred: 1 };
    if (sort === 'event_recent') sortOption = { dateOccurred: -1 };

    const items = await Item.find(query)
      .populate('reportedBy', 'name email')
      .sort(sortOption);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/items/check-duplicate (Custom Feature: Duplicate Detection)
router.get('/check-duplicate', async (req, res) => {
  try {
    const { title, category, building } = req.query;
    if (!title || !category) {
      return res.status(200).json({ success: true, duplicates: [] });
    }

    const words = title.split(' ').filter(w => w.length > 2);
    const regexPattern = words.join('|');

    const duplicates = await Item.find({
      category,
      building,
      title: { $regex: regexPattern, $options: 'i' },
      status: { $ne: 'resolved' }
    }).select('title type building specificLocation dateOccurred');

    return res.status(200).json({
      success: true,
      duplicates
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('reportedBy', 'name email phone');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item listing not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Invalid Item ID' });
  }
});

// @route   POST /api/items (Protected)
router.post('/', protect, async (req, res) => {
  try {
    const { title, type, category, description, building, specificLocation, dateOccurred, imageUrl } = req.body;

    if (!title || !type || !category || !description || !building || !specificLocation || !dateOccurred) {
      return res.status(400).json({
        success: false,
        message: 'All fields (title, type, category, description, building, location, date) are mandatory'
      });
    }

    const newItem = await Item.create({
      title,
      type,
      category,
      description,
      building,
      specificLocation,
      dateOccurred,
      imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl : undefined,
      reportedBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      message: 'Item report posted successfully',
      data: newItem
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/items/:id (Protected: Reporter or Admin)
router.put('/:id', protect, async (req, res) => {
  try {
    let item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item listing not found' });
    }

    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only edit your own listings' });
    }

    item = await Item.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: item
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/items/:id (Protected: Reporter or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item listing not found' });
    }

    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own listings' });
    }

    await item.deleteOne();
    return res.status(200).json({ success: true, message: 'Item listing deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

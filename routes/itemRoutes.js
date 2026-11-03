const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const offlineStore = require('../config/offlineStore');
const { protect } = require('../middleware/auth');

// @route   GET /api/items (Search, Filter, Sort)
router.get('/', async (req, res) => {
  try {
    const { search, type, category, building, status, sort } = req.query;

    // Resilient offline fallback if MongoDB is disconnected / buffering
    if (mongoose.connection.readyState !== 1) {
      let filtered = [...offlineStore.items];
      if (search && search.trim() !== '') {
        const s = search.toLowerCase();
        filtered = filtered.filter(i => i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s) || (i.specificLocation || '').toLowerCase().includes(s));
      }
      if (type && type !== 'all') filtered = filtered.filter(i => i.type === type);
      if (category && category !== 'all') filtered = filtered.filter(i => i.category === category);
      if (building && building !== 'all') filtered = filtered.filter(i => i.building === building);
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }

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

// @route   POST /api/items/scan-match (Scan Item & Find Owner)
router.post('/scan-match', async (req, res) => {
  try {
    const queryText = req.body.queryText || req.body.keyword || req.body.text || '';
    const { category, building } = req.body;
    if (!queryText || queryText.trim() === '') {
      return res.status(400).json({ success: false, message: 'Please provide scanned text or keywords' });
    }

    // Retrieve active lost items (Atlas or offlineStore)
    let lostItems = [];
    if (mongoose.connection.readyState !== 1) {
      lostItems = offlineStore.items.filter(i => i.type === 'lost' && i.status !== 'resolved');
    } else {
      lostItems = await Item.find({ type: 'lost', status: { $ne: 'resolved' } })
        .populate('reportedBy', 'name email phone role');
    }

    const searchTerms = queryText.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const scoredItems = lostItems.map(item => {
      let score = 0;
      const titleLower = (item.title || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const locLower = (item.specificLocation || '').toLowerCase();

      searchTerms.forEach(term => {
        if (titleLower.includes(term)) score += 40;
        if (descLower.includes(term)) score += 20;
        if (locLower.includes(term)) score += 15;
      });

      if (category && category !== 'all' && item.category === category) {
        score += 25;
      }

      if (building && building !== 'all' && item.building === building) {
        score += 20;
      }

      const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;

      return {
        item: itemObj,
        score: Math.min(score, 100)
      };
    }).filter(resItem => resItem.score >= 20)
      .sort((a, b) => b.score - a.score);

    if (scoredItems.length === 0) {
      return res.status(200).json({
        success: true,
        matchFound: false,
        message: 'No matching lost reports found in the campus database.',
        matches: []
      });
    }

    const bestMatch = scoredItems[0];
    return res.status(200).json({
      success: true,
      matchFound: true,
      confidence: bestMatch.score,
      bestMatch: {
        ...bestMatch.item,
        matchScore: bestMatch.score
      },
      otherMatches: scoredItems.slice(1, 4).map(m => ({
        ...m.item,
        matchScore: m.score
      }))
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

    if (mongoose.connection.readyState !== 1) {
      const words = title.toLowerCase().split(' ').filter(w => w.length > 2);
      const duplicates = offlineStore.items.filter(item => {
        if (item.category !== category) return false;
        if (building && building !== 'all' && item.building !== building) return false;
        if (item.status === 'resolved') return false;
        const itemTitle = item.title.toLowerCase();
        return words.some(w => itemTitle.includes(w));
      }).map(i => ({
        title: i.title,
        type: i.type,
        building: i.building,
        specificLocation: i.specificLocation,
        dateOccurred: i.dateOccurred
      }));
      return res.status(200).json({ success: true, duplicates });
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
    if (mongoose.connection.readyState !== 1) {
      const item = offlineStore.items.find(i => i._id.toString() === req.params.id.toString());
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item listing not found' });
      }
      return res.status(200).json({ success: true, data: item });
    }

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

    if (mongoose.connection.readyState !== 1) {
      const newItem = {
        _id: 'itm_' + Date.now(),
        title,
        type,
        category,
        description,
        building,
        specificLocation,
        dateOccurred: new Date(dateOccurred),
        imageUrl: imageUrl && imageUrl.trim() !== '' ? imageUrl : 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80',
        status: 'open',
        reportedBy: req.user || offlineStore.users[1],
        createdAt: new Date()
      };
      offlineStore.items.unshift(newItem);
      return res.status(201).json({
        success: true,
        message: 'Item report posted successfully',
        data: newItem
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

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const offlineStore = require('../config/offlineStore');
const { protect } = require('../middleware/auth');

// @route   GET /api/items (Search, Filter, Sort)
router.get('/', async (req, res) => {
  try {
    const { search, type, category, building, status, sort, user } = req.query;

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
      if (user && user !== 'all') {
        filtered = filtered.filter(i => {
          const repId = i.reportedBy?._id ? i.reportedBy._id.toString() : (i.reportedBy ? i.reportedBy.toString() : '');
          return repId === user.toString();
        });
      }
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
    if (user && user !== 'all') query.reportedBy = user;
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $in: ['open', 'claimed'] };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { dateOccurred: 1 };
    if (sort === 'event_recent') sortOption = { dateOccurred: -1 };

    const items = await Item.find(query)
      .populate('reportedBy', 'name email phone studentId department')
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

// @route   GET /api/items/my-items (List items reported by currently logged-in student)
router.get('/my-items', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const myItems = offlineStore.items.filter(i => {
        const repId = i.reportedBy?._id ? i.reportedBy._id.toString() : (i.reportedBy ? i.reportedBy.toString() : '');
        return repId === req.user._id.toString();
      });
      return res.status(200).json({ success: true, count: myItems.length, data: myItems });
    }

    const items = await Item.find({ reportedBy: req.user._id })
      .populate('reportedBy', 'name email phone studentId department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/items/user/:userId (List items reported by a specific user)
router.get('/user/:userId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const userItems = offlineStore.items.filter(i => {
        const repId = i.reportedBy?._id ? i.reportedBy._id.toString() : (i.reportedBy ? i.reportedBy.toString() : '');
        return repId === req.params.userId.toString();
      });
      return res.status(200).json({ success: true, count: userItems.length, data: userItems });
    }

    const items = await Item.find({ reportedBy: req.params.userId })
      .populate('reportedBy', 'name email phone studentId department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

function hammingDistance(h1, h2) {
  if (!h1 || !h2 || h1.length !== h2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

// @route   POST /api/items/scan-match (Smart Visual + Keyword Scan & Owner Lookup)
router.post('/scan-match', async (req, res) => {
  try {
    const queryText = (req.body.queryText || req.body.keyword || req.body.text || req.body.itemText || '').trim();
    const { category, building, scanMode, imageHash, detectedColors } = req.body;
    const hasVisualSignal = Boolean(imageHash) || (Array.isArray(detectedColors) && detectedColors.length > 0);
    if (!queryText && (!category || category === 'all') && !hasVisualSignal) {
      return res.status(400).json({ success: false, message: 'Please snap/upload a photo, enter keywords, or select a category' });
    }

    // Determine which report types to search (default 'all' so both Lost & Found reports are discoverable)
    const targetType = scanMode === 'lost' ? 'lost' : (scanMode === 'found' ? 'found' : 'all');

    let candidateItems = [];
    if (mongoose.connection.readyState !== 1) {
      candidateItems = offlineStore.items.filter(i => {
        if (i.status === 'resolved') return false;
        if (targetType !== 'all' && i.type !== targetType) return false;
        return true;
      });
    } else {
      const dbFilter = { status: { $ne: 'resolved' } };
      if (targetType !== 'all') dbFilter.type = targetType;
      candidateItems = await Item.find(dbFilter)
        .populate('reportedBy', 'name email phone studentId department role yearOfStudy');
    }

    const searchTerms = queryText
      .toLowerCase()
      .split(/[\s,;|/]+/)
      .filter(w => w.length >= 2);
    const colorsList = Array.isArray(detectedColors) ? detectedColors.map(c => String(c).toLowerCase()) : [];

    const scoredItems = candidateItems.map(item => {
      let score = 0;
      let keywordHits = 0;
      let visualHit = false;
      const titleLower = (item.title || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();
      const locLower = (item.specificLocation || '').toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const bldLower = (item.building || '').toLowerCase();
      const refLower = (item.referenceCode || '').toLowerCase();
      const ownerNameLower = (item.ownerDetails?.name || item.reportedBy?.name || '').toLowerCase();

      // 1. Visual Perceptual Image Hash Match
      if (imageHash && item.imageHash) {
        const dist = hammingDistance(imageHash, item.imageHash);
        if (dist <= 6) {
          score += 95;
          visualHit = true;
        } else if (dist <= 14) {
          score += 65;
          visualHit = true;
        }
      }

      // 2. Dominant Color Visual Match against item title/description
      colorsList.forEach(col => {
        if (col && (titleLower.includes(col) || descLower.includes(col))) {
          score += 28;
          visualHit = true;
        }
      });

      // 3. Keyword / Ref ID / Owner Match
      searchTerms.forEach(term => {
        let matchedThisTerm = false;
        if (refLower && refLower.includes(term)) { score += 80; matchedThisTerm = true; }
        if (titleLower.includes(term)) { score += 45; matchedThisTerm = true; }
        if (descLower.includes(term)) { score += 25; matchedThisTerm = true; }
        if (catLower.includes(term)) { score += 20; matchedThisTerm = true; }
        if (locLower.includes(term) || bldLower.includes(term)) { score += 15; matchedThisTerm = true; }
        if (ownerNameLower.includes(term)) { score += 25; matchedThisTerm = true; }
        if (matchedThisTerm) keywordHits++;
      });

      if (category && category !== 'all' && item.category === category) {
        score += 25;
      }

      if (building && building !== 'all' && item.building === building) {
        score += 20;
      }

      // Require at least one keyword hit OR visual hit if searchTerms were provided
      if (searchTerms.length > 0 && keywordHits === 0 && !visualHit) {
        score = 0;
      }

      const itemObj = typeof item.toObject === 'function' ? item.toObject() : item;

      return {
        item: itemObj,
        score: Math.min(score, 100),
        visualMatch: visualHit
      };
    }).filter(resItem => resItem.score >= 20)
      .sort((a, b) => b.score - a.score);

    if (scoredItems.length === 0) {
      return res.status(200).json({
        success: true,
        matchFound: false,
        message: 'No matching active reports found in the campus database.',
        matches: []
      });
    }

    const bestMatch = scoredItems[0];
    return res.status(200).json({
      success: true,
      matchFound: true,
      confidence: bestMatch.score,
      totalMatches: scoredItems.length,
      bestMatch: {
        ...bestMatch.item,
        matchScore: bestMatch.score,
        visualMatch: bestMatch.visualMatch
      },
      otherMatches: scoredItems.slice(1, 5).map(m => ({
        ...m.item,
        matchScore: m.score,
        visualMatch: m.visualMatch
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
      item.viewCount = (item.viewCount || 0) + 1;
      return res.status(200).json({ success: true, data: item });
    }

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('reportedBy', 'name email phone studentId department role yearOfStudy');
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

    const ownerInfo = {
      name: (req.body.ownerName && req.body.ownerName.trim()) || req.user?.name || 'Sai University Member',
      email: req.user?.email || 'N/A',
      phone: (req.body.ownerPhone && req.body.ownerPhone.trim()) || req.user?.phone || 'N/A',
      studentId: req.user?.studentId || 'N/A',
      department: req.user?.department || 'School of Computing & Data Science',
      yearOfStudy: req.user?.yearOfStudy || 'N/A'
    };
    const referenceCode = 'SAIU-LF-' + Math.floor(1000 + Math.random() * 9000);

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
        imageHash: req.body.imageHash || '',
        status: 'open',
        reportedBy: req.user || offlineStore.users[1],
        ownerDetails: ownerInfo,
        referenceCode,
        viewCount: 0,
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
      imageHash: req.body.imageHash || '',
      reportedBy: req.user._id,
      ownerDetails: ownerInfo,
      referenceCode,
      viewCount: 0
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
    if (mongoose.connection.readyState !== 1) {
      const item = offlineStore.items.find(i => i._id.toString() === req.params.id.toString());
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item listing not found' });
      }
      const reporterId = item.reportedBy?._id ? item.reportedBy._id.toString() : item.reportedBy.toString();
      if (reporterId !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only edit your own listings' });
      }
      Object.assign(item, req.body);
      return res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        data: item
      });
    }

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
    if (mongoose.connection.readyState !== 1) {
      const idx = offlineStore.items.findIndex(i => i._id.toString() === req.params.id.toString());
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Item listing not found' });
      }
      const item = offlineStore.items[idx];
      const reporterId = item.reportedBy?._id ? item.reportedBy._id.toString() : item.reportedBy.toString();
      if (reporterId !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized: You can only delete your own listings' });
      }
      offlineStore.items.splice(idx, 1);
      return res.status(200).json({ success: true, message: 'Item listing deleted successfully' });
    }

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

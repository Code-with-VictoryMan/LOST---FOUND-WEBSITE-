const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide item title'],
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: [true, 'Specify whether item was lost or found']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: [
      'Electronics & Gadgets',
      'Student ID & Cards',
      'Books & Stationery',
      'Wallets & Bags',
      'Clothing & Accessories',
      'Keys & Access Cards',
      'Water Bottles & Flasks',
      'Other Belongings'
    ]
  },
  description: {
    type: String,
    required: [true, 'Please provide descriptive details (brand, color, identifiers)'],
    maxlength: 1000
  },
  building: {
    type: String,
    required: [true, 'Please specify campus building'],
    enum: [
      'Academic Block A',
      'Academic Block B',
      'Library',
      'Student Dining & Cafeteria',
      'Sports Complex & Gymnasium',
      'Computer Science Labs',
      'Auditorium',
      'Campus Grounds / Lawn'
    ]
  },
  specificLocation: {
    type: String,
    required: [true, 'Please provide exact room or spot (e.g., Room 204, Table 3)'],
    trim: true
  },
  dateOccurred: {
    type: Date,
    required: [true, 'Please specify the date of incident']
  },
  imageUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80'
  },
  status: {
    type: String,
    enum: ['open', 'claimed', 'resolved'],
    default: 'open'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Text index for keyword searches
itemSchema.index({ title: 'text', description: 'text', specificLocation: 'text' });

module.exports = mongoose.model('Item', itemSchema);

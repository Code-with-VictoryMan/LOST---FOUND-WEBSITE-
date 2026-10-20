const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proofDescription: {
    type: String,
    required: [true, 'Provide proof of ownership (identifying marks, serial no, passcodes, contents)'],
    minlength: 15
  },
  contactPhone: {
    type: String,
    required: [true, 'Provide contact telephone number for verification']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewNotes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Claim', claimSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide student/staff name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide Sai University email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  studentId: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  department: {
    type: String,
    trim: true,
    default: 'School of Computing & Data Science'
  },
  yearOfStudy: {
    type: String,
    trim: true,
    default: '3rd Year B.Tech'
  },
  phone: {
    type: String,
    default: 'N/A'
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  loginHistory: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      ipAddress: {
        type: String,
        default: '127.0.0.1'
      },
      userAgent: {
        type: String,
        default: 'Browser Session'
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

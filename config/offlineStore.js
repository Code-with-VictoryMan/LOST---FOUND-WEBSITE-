// Resilient Local Store (Ensures 100% uptime even if MongoDB Atlas IP is temporarily unwhitelisted)
const bcrypt = require('bcryptjs');

const users = [
  {
    _id: '671510000000000000000001',
    name: 'Campus Security Admin',
    email: 'admin@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('AdminPassword123', 8),
    role: 'admin',
    phone: '+91 98401 22334',
    studentId: 'ADMIN-01',
    department: 'Campus Safety & Administration',
    yearOfStudy: 'Security Desk',
    loginCount: 1,
    lastLogin: new Date('2026-11-21T09:00:00Z'),
    loginHistory: [
      {
        timestamp: new Date('2026-11-21T09:00:00Z'),
        ipAddress: '127.0.0.1',
        userAgent: 'Campus Security Console'
      }
    ]
  },
  {
    _id: '671510000000000000000002',
    name: 'SAI SRAVAN',
    email: 'saisravan@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('AdminPassword123', 8),
    role: 'admin',
    phone: '+91 98840 55667',
    studentId: 'SAIU-ADMIN-01',
    department: 'Campus Administration & Security',
    yearOfStudy: 'Executive Administrator',
    loginCount: 12,
    lastLogin: new Date('2026-11-22T08:30:00Z'),
    loginHistory: [
      {
        timestamp: new Date('2026-11-22T08:30:00Z'),
        ipAddress: '127.0.0.1',
        userAgent: 'Sai University Admin Console'
      }
    ]
  },
  {
    _id: '671510000000000000000003',
    name: 'Aditi Sharma',
    email: 'aditi.sharma@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('StudentPassword123', 8),
    role: 'student',
    phone: '+91 97711 33445',
    studentId: 'SAIU2024CS015',
    department: 'School of Computing & Data Science',
    yearOfStudy: '3rd Year B.Tech',
    loginCount: 5,
    lastLogin: new Date('2026-11-21T14:20:00Z'),
    loginHistory: [
      {
        timestamp: new Date('2026-11-21T14:20:00Z'),
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'
      }
    ]
  },
  {
    _id: '671510000000000000000004',
    name: 'Vikramaditya S',
    email: 'vikram.s@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('StudentPassword123', 8),
    role: 'student',
    phone: '+91 98410 77889',
    studentId: 'SAIU2024CS088',
    department: 'School of Computing & Data Science',
    yearOfStudy: '3rd Year B.Tech',
    loginCount: 3,
    lastLogin: new Date('2026-11-20T11:15:00Z'),
    loginHistory: [
      {
        timestamp: new Date('2026-11-20T11:15:00Z'),
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    ]
  },
  {
    _id: '671510000000000000000005',
    name: 'Temp Student',
    email: 'temp.student@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('TempStudent123', 8),
    role: 'student',
    phone: '+91 90000 11223',
    studentId: 'SAIU-TEMP-001',
    department: 'School of Computing & Data Science',
    yearOfStudy: '1st Year Undergrad',
    loginCount: 0,
    lastLogin: new Date('2026-11-25T06:00:00Z'),
    loginHistory: []
  }
];

const items = [];

const claims = [];

module.exports = {
  users,
  items,
  claims
};

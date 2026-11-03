// Resilient Local Store (Ensures 100% uptime even if MongoDB Atlas IP is temporarily unwhitelisted)
const bcrypt = require('bcryptjs');

const users = [
  {
    _id: '671510000000000000000001',
    name: 'Campus Security Admin',
    email: 'admin@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('AdminPassword123', 8),
    role: 'admin',
    phone: '+91 98401 22334'
  },
  {
    _id: '671510000000000000000002',
    name: 'Sai Sravan V',
    email: 'saisravan@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('StudentPassword123', 8),
    role: 'student',
    phone: '+91 98840 55667'
  },
  {
    _id: '671510000000000000000003',
    name: 'Aditi Sharma',
    email: 'aditi.sharma@saiuniversity.edu.in',
    passwordHash: bcrypt.hashSync('StudentPassword123', 8),
    role: 'student',
    phone: '+91 97711 33445'
  }
];

const items = [
  {
    _id: '671520000000000000000001',
    title: 'Blue Hydro Flask Water Bottle (1 Litre)',
    type: 'found',
    category: 'Water Bottles & Flasks',
    description: 'Stainless steel insulated blue bottle with a slight dent on the base and a NASA sticker.',
    building: 'Library',
    specificLocation: 'Silent Reading Zone, 2nd Floor, Table 14',
    dateOccurred: new Date('2026-10-15'),
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000002',
    title: 'Dell XPS 13 Laptop Charger (Type-C 65W)',
    type: 'found',
    category: 'Electronics & Gadgets',
    description: 'Black USB-C power brick with black braided cable. Left plugged into the wall socket.',
    building: 'Computer Science Labs',
    specificLocation: 'Lab 3, Workstation 18',
    dateOccurred: new Date('2026-10-18'),
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[2]
  },
  {
    _id: '671520000000000000000003',
    title: 'Sai University RFID Student ID Card - CSE Dept',
    type: 'lost',
    category: 'Student ID & Cards',
    description: 'Student ID card in a blue Sai University lanyard. Name on card: Sai Sravan V.',
    building: 'Academic Block A',
    specificLocation: 'Ground Floor Corridor near Lecture Hall 101',
    dateOccurred: new Date('2026-10-19'),
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000004',
    title: 'Sony WH-1000XM4 Noise Cancelling Headphones',
    type: 'lost',
    category: 'Electronics & Gadgets',
    description: 'Matte black over-ear headphones inside original zipped grey carry case with audio adapter cable.',
    building: 'Student Dining & Cafeteria',
    specificLocation: 'Corner booth seating near the fruit juice stall',
    dateOccurred: new Date('2026-10-16'),
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    status: 'claimed',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000005',
    title: 'Titan Fastrack Brown Leather Bi-fold Wallet',
    type: 'found',
    category: 'Wallets & Bags',
    description: 'Brown leather wallet containing metro pass, Sai University library card, and pocket change.',
    building: 'Sports Complex & Gymnasium',
    specificLocation: 'Spectator Bleachers near the Basketball Court',
    dateOccurred: new Date('2026-10-17'),
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[2]
  },
  {
    _id: '671520000000000000000006',
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    type: 'found',
    category: 'Books & Stationery',
    description: 'Scientific calculator with white sliding cover. Engraved initial "A.R." on back cover.',
    building: 'Academic Block B',
    specificLocation: 'Seminar Hall 302, 3rd row desk',
    dateOccurred: new Date('2026-10-14'),
    imageUrl: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80',
    status: 'resolved',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000007',
    title: 'Honda Activa Key with Deadpool Keychain',
    type: 'found',
    category: 'Keys & Access Cards',
    description: 'Silver vehicle key attached to a rubber red Deadpool mask keychain and a small brass padlock key.',
    building: 'Campus Grounds / Lawn',
    specificLocation: 'Bicycle and Scooter Parking Bay 2',
    dateOccurred: new Date('2026-10-18'),
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[2]
  },
  {
    _id: '671520000000000000000008',
    title: 'Apple AirPods Pro (2nd Gen) in White MagSafe Case',
    type: 'lost',
    category: 'Electronics & Gadgets',
    description: 'White AirPods Pro case with silicone case covering. Serial number registered with owner.',
    building: 'Computer Science Labs',
    specificLocation: 'Project Workstation Bench B',
    dateOccurred: new Date('2026-10-19'),
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000009',
    title: 'Wildcraft Black Rainproof Laptop Backpack',
    type: 'found',
    category: 'Wallets & Bags',
    description: 'Black 35L backpack containing lecture notebooks for Data Structures and an empty umbrella sleeve.',
    building: 'Auditorium',
    specificLocation: 'Row G, Seat 12 after the Guest Lecture session',
    dateOccurred: new Date('2026-10-12'),
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[2]
  },
  {
    _id: '671520000000000000000010',
    title: 'Ray-Ban Wayfarer Polarized Sunglasses (Matte Black)',
    type: 'lost',
    category: 'Clothing & Accessories',
    description: 'Matte black frame with greenish-black UV polarized lenses in black textured case.',
    building: 'Student Dining & Cafeteria',
    specificLocation: 'Outdoor patio table under umbrella #4',
    dateOccurred: new Date('2026-10-17'),
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[1]
  },
  {
    _id: '671520000000000000000011',
    title: 'Parker Frontier Matte Black Fountain Pen',
    type: 'found',
    category: 'Books & Stationery',
    description: 'Stainless steel nib with gold trim and black ink cartridge loaded.',
    building: 'Library',
    specificLocation: 'Circulation & Issue Desk Counter',
    dateOccurred: new Date('2026-10-13'),
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
    status: 'open',
    reportedBy: users[2]
  },
  {
    _id: '671520000000000000000012',
    title: 'Mi 20,000mAh Power Bank (Sandstone Black)',
    type: 'found',
    category: 'Electronics & Gadgets',
    description: 'Heavy dual USB output power bank with micro-USB and type-C input ports.',
    building: 'Computer Science Labs',
    specificLocation: 'Hardware Project Lab, Workbench 4',
    dateOccurred: new Date('2026-10-11'),
    imageUrl: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?auto=format&fit=crop&w=600&q=80',
    status: 'resolved',
    reportedBy: users[1]
  }
];

const claims = [];

module.exports = {
  users,
  items,
  claims
};

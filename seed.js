const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Item = require('./models/Item');
const Claim = require('./models/Claim');

const sampleItems = [
  {
    title: 'Blue Hydro Flask Water Bottle (1 Litre)',
    type: 'found',
    category: 'Water Bottles & Flasks',
    description: 'Stainless steel insulated blue bottle with a slight dent on the base and a NASA sticker.',
    building: 'Library',
    specificLocation: 'Silent Reading Zone, 2nd Floor, Table 14',
    dateOccurred: new Date('2026-10-15'),
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Dell XPS 13 Laptop Charger (Type-C 65W)',
    type: 'found',
    category: 'Electronics & Gadgets',
    description: 'Black USB-C power brick with black braided cable. Left plugged into the wall socket.',
    building: 'Computer Science Labs',
    specificLocation: 'Lab 3, Workstation 18',
    dateOccurred: new Date('2026-10-18'),
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Sai University RFID Student ID Card - CSE Dept',
    type: 'lost',
    category: 'Student ID & Cards',
    description: 'Student ID card in a blue Sai University lanyard. Name on card: Sai Sravan V.',
    building: 'Academic Block A',
    specificLocation: 'Ground Floor Corridor near Lecture Hall 101',
    dateOccurred: new Date('2026-10-19'),
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Sony WH-1000XM4 Noise Cancelling Headphones',
    type: 'lost',
    category: 'Electronics & Gadgets',
    description: 'Matte black over-ear headphones inside original zipped grey carry case with audio adapter cable.',
    building: 'Student Dining & Cafeteria',
    specificLocation: 'Corner booth seating near the fruit juice stall',
    dateOccurred: new Date('2026-10-16'),
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    status: 'claimed'
  },
  {
    title: 'Titan Fastrack Brown Leather Bi-fold Wallet',
    type: 'found',
    category: 'Wallets & Bags',
    description: 'Brown leather wallet containing metro pass, Sai University library card, and pocket change.',
    building: 'Sports Complex & Gymnasium',
    specificLocation: 'Spectator Bleachers near the Basketball Court',
    dateOccurred: new Date('2026-10-17'),
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Casio fx-991EX ClassWiz Scientific Calculator',
    type: 'found',
    category: 'Books & Stationery',
    description: 'Scientific calculator with white sliding cover. Engraved initial "A.R." on back cover.',
    building: 'Academic Block B',
    specificLocation: 'Seminar Hall 302, 3rd row desk',
    dateOccurred: new Date('2026-10-14'),
    imageUrl: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=600&q=80',
    status: 'resolved'
  },
  {
    title: 'Honda Activa Key with Deadpool Keychain',
    type: 'found',
    category: 'Keys & Access Cards',
    description: 'Silver vehicle key attached to a rubber red Deadpool mask keychain and a small brass padlock key.',
    building: 'Campus Grounds / Lawn',
    specificLocation: 'Bicycle and Scooter Parking Bay 2',
    dateOccurred: new Date('2026-10-18'),
    imageUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Apple AirPods Pro (2nd Gen) in White MagSafe Case',
    type: 'lost',
    category: 'Electronics & Gadgets',
    description: 'White AirPods Pro case with silicone case covering. Serial number registered with owner.',
    building: 'Computer Science Labs',
    specificLocation: 'Project Workstation Bench B',
    dateOccurred: new Date('2026-10-19'),
    imageUrl: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Wildcraft Black Rainproof Laptop Backpack',
    type: 'found',
    category: 'Wallets & Bags',
    description: 'Black 35L backpack containing lecture notebooks for Data Structures and an empty umbrella sleeve.',
    building: 'Auditorium',
    specificLocation: 'Row G, Seat 12 after the Guest Lecture session',
    dateOccurred: new Date('2026-10-12'),
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Ray-Ban Wayfarer Polarized Sunglasses (Matte Black)',
    type: 'lost',
    category: 'Clothing & Accessories',
    description: 'Matte black frame with greenish-black UV polarized lenses in black textured case.',
    building: 'Student Dining & Cafeteria',
    specificLocation: 'Outdoor patio table under umbrella #4',
    dateOccurred: new Date('2026-10-17'),
    imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Parker Frontier Matte Black Fountain Pen',
    type: 'found',
    category: 'Books & Stationery',
    description: 'Stainless steel nib with gold trim and black ink cartridge loaded.',
    building: 'Library',
    specificLocation: 'Circulation & Issue Desk Counter',
    dateOccurred: new Date('2026-10-13'),
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
    status: 'open'
  },
  {
    title: 'Mi 20,000mAh Power Bank (Sandstone Black)',
    type: 'found',
    category: 'Electronics & Gadgets',
    description: 'Heavy dual USB output power bank with micro-USB and type-C input ports.',
    building: 'Computer Science Labs',
    specificLocation: 'Hardware Project Lab, Workbench 4',
    dateOccurred: new Date('2026-10-11'),
    imageUrl: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?auto=format&fit=crop&w=600&q=80',
    status: 'resolved'
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_lost_found');
    console.log('MongoDB connected for seeding...');

    await User.deleteMany();
    await Item.deleteMany();
    await Claim.deleteMany();
    console.log('Cleared existing database records.');

    // Create Admin User
    const adminUser = await User.create({
      name: 'Campus Security Admin',
      email: 'admin@saiuniversity.edu.in',
      password: 'AdminPassword123',
      role: 'admin',
      phone: '+91 98401 22334'
    });

    // Create Student Users
    const student1 = await User.create({
      name: 'Sai Sravan V',
      email: 'saisravan@saiuniversity.edu.in',
      password: 'StudentPassword123',
      role: 'student',
      phone: '+91 98840 55667'
    });

    const student2 = await User.create({
      name: 'Aditi Sharma',
      email: 'aditi.sharma@saiuniversity.edu.in',
      password: 'StudentPassword123',
      role: 'student',
      phone: '+91 97711 33445'
    });

    console.log('Created Demo Users:');
    console.log(' - Admin: admin@saiuniversity.edu.in / AdminPassword123');
    console.log(' - Student 1: saisravan@saiuniversity.edu.in / StudentPassword123');
    console.log(' - Student 2: aditi.sharma@saiuniversity.edu.in / StudentPassword123');

    // Attach reporter references to sample items
    const itemsToInsert = sampleItems.map((item, index) => ({
      ...item,
      reportedBy: index % 2 === 0 ? student1._id : student2._id
    }));

    const insertedItems = await Item.insertMany(itemsToInsert);
    console.log(`Successfully seeded ${insertedItems.length} campus items across Sai University.`);

    // Create a sample verification claim on the Sony headphones
    const headphonesItem = insertedItems.find(i => i.title.includes('Sony'));
    if (headphonesItem) {
      await Claim.create({
        item: headphonesItem._id,
        claimant: student1._id,
        proofDescription: 'I can connect to Bluetooth device named "Sravan-XM4". Has an invoice from Amazon India dated July 2025.',
        contactPhone: '+91 98840 55667',
        status: 'pending'
      });
      console.log('Created sample active verification claim on Sony Headphones.');
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
};

seedData();

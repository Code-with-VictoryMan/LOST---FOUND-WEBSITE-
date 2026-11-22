const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');

const updateDatabase = async (uri, label) => {
  try {
    console.log(`Connecting to ${label}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log(`Connected to ${label}. Updating SAI SRAVAN to Admin...`);

    const hashedPassword = await bcrypt.hash('AdminPassword123', 10);

    const updated = await User.findOneAndUpdate(
      { email: 'saisravan@saiuniversity.edu.in' },
      {
        name: 'SAI SRAVAN',
        role: 'admin',
        studentId: 'SAIU-ADMIN-01',
        department: 'Campus Administration & Security',
        yearOfStudy: 'Executive Administrator',
        password: hashedPassword,
        lastLogin: new Date(),
        $inc: { loginCount: 1 }
      },
      { new: true, upsert: true }
    );

    console.log(`Updated SAI SRAVAN on ${label}:`, {
      name: updated.name,
      email: updated.email,
      role: updated.role,
      studentId: updated.studentId,
      department: updated.department
    });

    // Ensure student users exist so admin can view them in the database
    const aditiExists = await User.findOne({ email: 'aditi.sharma@saiuniversity.edu.in' });
    if (!aditiExists) {
      await User.create({
        name: 'Aditi Sharma',
        email: 'aditi.sharma@saiuniversity.edu.in',
        password: 'StudentPassword123',
        role: 'student',
        phone: '+91 97711 33445',
        studentId: 'SAIU2024CS015',
        department: 'School of Computing & Data Science',
        yearOfStudy: '3rd Year B.Tech',
        loginCount: 6,
        lastLogin: new Date(Date.now() - 3600000 * 2)
      });
      console.log(`Created student Aditi Sharma on ${label}`);
    }

    const vikramExists = await User.findOne({ email: 'vikram.s@saiuniversity.edu.in' });
    if (!vikramExists) {
      await User.create({
        name: 'Vikramaditya S',
        email: 'vikram.s@saiuniversity.edu.in',
        password: 'StudentPassword123',
        role: 'student',
        phone: '+91 98410 77889',
        studentId: 'SAIU2024CS088',
        department: 'School of Computing & Data Science',
        yearOfStudy: '3rd Year B.Tech',
        loginCount: 4,
        lastLogin: new Date(Date.now() - 3600000 * 18)
      });
      console.log(`Created student Vikramaditya S on ${label}`);
    }

    await mongoose.disconnect();
    console.log(`Completed for ${label}.\n`);
  } catch (err) {
    console.error(`Error on ${label}:`, err.message);
  }
};

async function run() {
  const localUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_lost_found';
  const atlasUri = process.env.MONGODB_ATLAS_URI || 'mongodb+srv://saisravan:SaiSravan2026@cluster0.lu8a6nq.mongodb.net/campus_lost_found?retryWrites=true&w=majority&appName=Cluster0';

  await updateDatabase(localUri, 'Local MongoDB');
  await updateDatabase(atlasUri, 'Atlas Cloud MongoDB');
  console.log('Admin migration completed across all target environments.');
}

run();

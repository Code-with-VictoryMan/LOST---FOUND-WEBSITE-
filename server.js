const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Database Connection
connectDB();

// Core Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);

// Live MongoDB & Service Health Check
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const isConnected = mongoose.connection.readyState === 1;
  let counts = { users: 0, items: 0, claims: 0 };
  if (isConnected) {
    const User = require('./models/User');
    const Item = require('./models/Item');
    const Claim = require('./models/Claim');
    const [u, i, c] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments(),
      Claim.countDocuments()
    ]);
    counts = { users: u, items: i, claims: c };
  } else {
    const offlineStore = require('./config/offlineStore');
    counts = {
      users: offlineStore.users.length,
      items: offlineStore.items.length,
      claims: offlineStore.claims.length
    };
  }
  res.status(200).json({
    success: true,
    database: isConnected ? 'mongodb' : 'in-memory',
    host: isConnected ? mongoose.connection.host : 'local-fallback',
    dbName: isConnected ? mongoose.connection.name : 'campus_lost_found',
    counts
  });
});

// Explicit HTML Page Routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Catch-all route to serve the SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Internal Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

let PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`=================================================`);
    console.log(`Sai University Lost & Found Portal is running!`);
    console.log(`Local Access: http://localhost:${portToTry}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port Warning]: Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('[Server Error]:', err);
    }
  });
}

startServer(PORT);

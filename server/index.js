const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const documentsDir = path.join(__dirname, '../uploads/documents');
const propertiesDir = path.join(__dirname, '../uploads/properties');

[uploadsDir, documentsDir, propertiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

const app = express();
const server = http.createServer(app);

// CORS Configuration - Production Ready
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

// Socket.io CORS Configuration
const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// CORS Middleware - Allow frontend origin
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// MongoDB Connection - Production Ready
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI && isProduction) {
  console.error('❌ ERROR: MONGODB_URI environment variable is required in production!');
  process.exit(1);
}

mongoose.connect(MONGODB_URI || 'mongodb://localhost:27017/rentease')
.then(() => {
  console.log('✅ MongoDB Connected');
  if (isProduction) {
    console.log('✅ Running in PRODUCTION mode');
    console.log(`✅ Frontend URL: ${CLIENT_URL}`);
  } else {
    console.log('⚠️  Running in DEVELOPMENT mode');
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  if (isProduction) {
    process.exit(1);
  }
});

// Socket.io for real-time chat and notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user's notification room when they connect
  socket.on('join-user-room', (userId) => {
    socket.join(userId.toString());
    console.log(`User ${socket.id} joined notification room: ${userId}`);
  });

  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  socket.on('leave-chat', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.id} left chat ${chatId}`);
  });

  socket.on('send-message', (data) => {
    io.to(data.chatId).emit('new-message', data);
  });

  socket.on('send-notification', (data) => {
    io.to(data.userId).emit('new-notification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export io for use in routes (before routes are loaded to avoid circular dependency)
module.exports = { io };

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5050;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  if (isProduction) {
    console.log(`✅ Server accessible at: ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}`);
  }
});



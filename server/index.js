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
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentease')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



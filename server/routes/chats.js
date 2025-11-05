const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Chat = require('../models/Chat');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { io } = require('../index');

// Configure multer for chat images
const fs = require('fs');
// Save to uploads/chats/ (relative to project root, not server/)
const uploadDir = path.join(__dirname, '../../uploads/chats/');
// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path to ensure file is saved correctly on Render
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Ensure extension is lowercase for consistency
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'chat-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all chats for current user
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { tenant: req.user._id },
        { owner: req.user._id }
      ],
      isClosed: false
    })
    .populate('tenant', 'name email profileImage')
    .populate('owner', 'name email profileImage')
    .populate('property', 'title images address price')
    .sort({ updatedAt: -1 });

    // Fetch bookings for each chat
    const Booking = require('../models/Booking');
    const chatsWithBookings = await Promise.all(chats.map(async (chat) => {
      const chatObj = chat.toObject();
      const booking = await Booking.findOne({ chat: chat._id })
        .sort({ createdAt: -1 }); // Get the most recent booking
      if (booking) {
        chatObj.booking = booking;
      }
      return chatObj;
    }));

    res.json(chatsWithBookings);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single chat
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('tenant', 'name email profileImage')
      .populate('owner', 'name email profileImage')
      .populate('property', 'title images address price');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (chat.tenant._id.toString() !== req.user._id.toString() && 
        chat.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if there's a booking associated with this chat
    const Booking = require('../models/Booking');
    const booking = await Booking.findOne({ chat: chat._id })
      .sort({ createdAt: -1 }); // Get the most recent booking

    const chatObj = chat.toObject();
    if (booking) {
      chatObj.booking = booking;
    }

    res.json(chatObj);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start new chat or get existing chat
router.post('/start', auth, async (req, res) => {
  try {
    const { propertyId } = req.body;

    if (req.user.role !== 'tenant') {
      return res.status(403).json({ message: 'Only tenants can start chats' });
    }

    const Property = require('../models/Property');
    const property = await Property.findById(propertyId);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Check if chat already exists - if yes, create a new one
    // (as per requirement: new chat for same owner should be standalone)
    const chat = new Chat({
      tenant: req.user._id,
      owner: property.owner,
      property: propertyId
    });

    await chat.save();

    // Populate and send response
    await chat.populate('tenant', 'name email profileImage');
    await chat.populate('owner', 'name email profileImage');
    await chat.populate('property', 'title images address price');

    // Notify owner
    const ownerId = property.owner._id ? property.owner._id.toString() : property.owner.toString();
    const notification = await Notification.create({
      user: property.owner,
      type: 'new_chat',
      title: 'New Chat Started',
      message: `${req.user.name} started a chat about ${property.title}`,
      relatedId: chat._id
    });

    if (io) {
      io.to(ownerId).emit('new-notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json(chat);
  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send message with proper error handling
router.post('/:id/message', auth, (req, res) => {
  console.log('Received message request:', {
    chatId: req.params.id,
    userId: req.user._id,
    hasFile: !!req.file,
    hasContent: !!req.body.content
  });

  // Handle multer upload with error handling
  const uploadMiddleware = upload.single('image');
  
  uploadMiddleware(req, res, async (err) => {
    // Handle multer errors
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image size exceeds 5MB limit' });
      }
      if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ message: 'Only image files (JPEG, JPG, PNG) are allowed' });
      }
      return res.status(400).json({ message: err.message || 'File upload error' });
    }

    // Proceed with message handling
    try {
      console.log('Finding chat:', req.params.id);
      const chat = await Chat.findById(req.params.id);

      if (!chat) {
        console.error('Chat not found:', req.params.id);
        return res.status(404).json({ message: 'Chat not found' });
      }

      console.log('Chat found:', chat._id);

      if (chat.isClosed) {
        return res.status(400).json({ message: 'Chat is closed' });
      }

      // Check if user is part of this chat - handle both populated and unpopulated
      let tenantId, ownerId;
      try {
        tenantId = chat.tenant._id ? chat.tenant._id.toString() : chat.tenant.toString();
        ownerId = chat.owner._id ? chat.owner._id.toString() : chat.owner.toString();
      } catch (idError) {
        console.error('Error accessing tenant/owner IDs:', idError);
        // Try to populate if not already populated
        await chat.populate('tenant', '_id');
        await chat.populate('owner', '_id');
        tenantId = chat.tenant._id ? chat.tenant._id.toString() : chat.tenant.toString();
        ownerId = chat.owner._id ? chat.owner._id.toString() : chat.owner.toString();
      }
      
      const userId = req.user._id.toString();
      console.log('Checking authorization:', { userId, tenantId, ownerId });
      
      if (tenantId !== userId && ownerId !== userId) {
        console.error('Unauthorized access attempt:', {
          userId,
          tenantId,
          ownerId
        });
        return res.status(403).json({ message: 'Not authorized' });
      }

      // Validate that either content or image is provided
      if (!req.body.content && !req.file) {
        return res.status(400).json({ message: 'Message content or image is required' });
      }

      console.log('Creating message:', {
        type: req.file ? 'image' : 'text',
        hasImage: !!req.file,
        imagePath: req.file?.path
      });

      // Convert absolute path to relative path for storage
      let imageUrl = null;
      if (req.file && req.file.path) {
        // Convert absolute path to relative path for database storage
        // Remove the project root path, keep only uploads/... part
        const relativePath = req.file.path.replace(/^.*uploads/, 'uploads').replace(/\\/g, '/');
        console.log(`✅ Chat image: Converting ${req.file.path} -> ${relativePath}`);
        imageUrl = relativePath;
      }

      const message = {
        sender: req.user._id,
        content: req.body.content || '',
        type: req.file ? 'image' : 'text',
        imageUrl: imageUrl
      };

      chat.messages.push(message);
      await chat.save();

      console.log('Message saved, populating chat...');

      // Reload chat to get the full message with _id
      await chat.populate('tenant', 'name email profileImage');
      await chat.populate('owner', 'name email profileImage');
      
      // Get the last message (the one we just added)
      const savedMessage = chat.messages[chat.messages.length - 1];
      
      console.log('Message saved:', savedMessage._id);

      // Format message for response and socket
      const messageData = {
        _id: savedMessage._id,
        sender: {
          _id: req.user._id,
          name: req.user.name
        },
        content: savedMessage.content,
        type: savedMessage.type,
        imageUrl: savedMessage.imageUrl,
        timestamp: savedMessage.timestamp || new Date()
      };

      // Get other user ID for notification
      const otherUserId = tenantId === userId ? ownerId : tenantId;

      // Notify other user
      let notification = null;
      try {
        notification = await Notification.create({
          user: otherUserId,
          type: 'new_message',
          title: 'New Message',
          message: `You have a new message from ${req.user.name}`,
          relatedId: chat._id
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }

      // Emit real-time message to all users in the chat room
      if (io) {
        io.to(chat._id.toString()).emit('new-message', {
          chatId: chat._id.toString(),
          message: messageData
        });
        
        // Emit real-time notification to the other user
        if (notification) {
          io.to(otherUserId.toString()).emit('new-notification', {
            _id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            relatedId: notification.relatedId,
            isRead: notification.isRead,
            createdAt: notification.createdAt
          });
        }
      }

      console.log('Sending response with message:', messageData._id);
      res.status(201).json(messageData);
    } catch (error) {
      console.error('Send message error:', error);
      console.error('Error stack:', error.stack);
      // Delete uploaded file if there was an error after upload
      if (req.file && req.file.path) {
        try {
          await require('fs').promises.unlink(req.file.path).catch(() => {});
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
});

// Propose price (with date selection)
router.post('/:id/propose-price', auth, async (req, res) => {
  try {
    let { amount, startDate, endDate } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (chat.isClosed) {
      return res.status(400).json({ message: 'Chat is closed' });
    }

    // Check if user is part of this chat
    const isTenant = chat.tenant._id.toString() === req.user._id.toString();
    const isOwner = chat.owner._id.toString() === req.user._id.toString();

    if (!isTenant && !isOwner) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if there's already a pending proposal
    if (chat.priceProposal && chat.priceProposal.status === 'pending') {
      // Check who proposed it
      const proposedBy = chat.priceProposal.proposedBy;
      if (proposedBy === 'tenant' && isTenant) {
        return res.status(400).json({ message: 'You already have a pending proposal. Wait for owner response.' });
      }
      if (proposedBy === 'owner' && isOwner) {
        return res.status(400).json({ message: 'You already have a pending proposal. Wait for tenant response.' });
      }
      
      // If there's an existing proposal with dates, ALWAYS use those dates for counter-proposal
      // Dates are locked once set by the tenant - only price can be negotiated
      if (chat.priceProposal.startDate && chat.priceProposal.endDate) {
        startDate = chat.priceProposal.startDate.toISOString();
        endDate = chat.priceProposal.endDate.toISOString();
        console.log('Dates are locked - using existing dates from proposal:', { startDate, endDate });
      }
    } else if (chat.lockedDates && chat.lockedDates.startDate && chat.lockedDates.endDate) {
      // If there are locked dates (from a previous proposal that was rejected), use those
      // Dates remain locked even after proposal rejection
      startDate = chat.lockedDates.startDate.toISOString();
      endDate = chat.lockedDates.endDate.toISOString();
      console.log('Dates are locked - using locked dates from previous proposal:', { startDate, endDate });
    }

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // If tenant is proposing and no locked dates exist yet, lock the dates
    if (isTenant && (!chat.lockedDates || !chat.lockedDates.startDate || !chat.lockedDates.endDate)) {
      chat.lockedDates = {
        startDate: start,
        endDate: end
      };
      console.log('Locking dates for tenant:', { startDate: start, endDate: end });
    }

    // Validate price bounds
    const proposedAmount = parseFloat(amount);
    
    // Calculate maximum amount based on property price and dates
    const Property = require('../models/Property');
    const property = await Property.findById(chat.property._id || chat.property);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    const monthlyPrice = property.price;
    const dailyRate = monthlyPrice / 30;
    const calculatedMax = Math.round((dailyRate * totalDays) / 100) * 100; // Round to nearest hundred
    
    // Minimum is the last proposed price (if there's a pending proposal)
    const minPrice = chat.priceProposal && chat.priceProposal.status === 'pending' 
      ? chat.priceProposal.amount 
      : null;
    
    // Validate price bounds
    if (minPrice !== null && proposedAmount < minPrice) {
      return res.status(400).json({ 
        message: `Proposed amount must be at least ₹${minPrice} (last proposed price)` 
      });
    }
    
    if (proposedAmount > calculatedMax) {
      return res.status(400).json({ 
        message: `Proposed amount cannot exceed ₹${calculatedMax} (calculated maximum based on rental period)` 
      });
    }

    chat.priceProposal = {
      proposedBy: isTenant ? 'tenant' : 'owner',
      amount: proposedAmount,
      startDate: start,
      endDate: end,
      status: 'pending'
    };

    await chat.save();

    // Notify other user
    const otherUserId = isTenant ? chat.owner._id : chat.tenant._id;
    const notification = await Notification.create({
      user: otherUserId,
      type: 'price_proposal',
      title: 'New Price Proposal',
      message: `${req.user.name} proposed a new price`,
      relatedId: chat._id
    });

    if (io) {
      io.to(chat._id.toString()).emit('price-proposal-updated', {
        chatId: chat._id.toString(),
        proposedBy: chat.priceProposal.proposedBy,
        amount: chat.priceProposal.amount,
        startDate: chat.priceProposal.startDate,
        endDate: chat.priceProposal.endDate,
        status: chat.priceProposal.status
      });
      
      // Emit real-time notification to the other user
      io.to(otherUserId.toString()).emit('new-notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    res.json(chat.priceProposal);
  } catch (error) {
    console.error('Propose price error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Accept/Reject price proposal
router.post('/:id/price-response', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const chat = await Chat.findById(req.params.id);

    if (!chat || !chat.priceProposal || chat.priceProposal.status !== 'pending') {
      return res.status(400).json({ message: 'No pending proposal found' });
    }

    // Check if user is the other party
    const isTenant = chat.tenant._id.toString() === req.user._id.toString();
    const isOwner = chat.owner._id.toString() === req.user._id.toString();
    const proposedBy = chat.priceProposal.proposedBy;

    if ((proposedBy === 'tenant' && !isOwner) || (proposedBy === 'owner' && !isTenant)) {
      return res.status(400).json({ message: 'You cannot respond to your own proposal' });
    }

    if (action === 'accept') {
      chat.priceProposal.status = 'accepted';
      
      // Create booking request
      const Booking = require('../models/Booking');
      const booking = new Booking({
        tenant: chat.tenant._id,
        owner: chat.owner._id,
        property: chat.property._id,
        chat: chat._id,
        startDate: chat.priceProposal.startDate,
        endDate: chat.priceProposal.endDate,
        amount: chat.priceProposal.amount,
        status: 'pending'
      });
      await booking.save();

      // Notify owner about booking request
      const bookingNotification = await Notification.create({
        user: chat.owner._id,
        type: 'booking_request',
        title: 'New Booking Request',
        message: `${chat.tenant.name} has requested a booking`,
        relatedId: booking._id
      });

      // Emit real-time notification
      if (io) {
        io.to(chat.owner._id.toString()).emit('new-notification', {
          _id: bookingNotification._id,
          type: bookingNotification.type,
          title: bookingNotification.title,
          message: bookingNotification.message,
          relatedId: bookingNotification.relatedId,
          isRead: bookingNotification.isRead,
          createdAt: bookingNotification.createdAt
        });
      }

      // Remove price proposal after acceptance (keep locked dates)
      chat.priceProposal = null;
    } else if (action === 'reject') {
      chat.priceProposal.status = 'rejected';
      // Clear proposal but keep locked dates so dates remain locked for future proposals
      chat.priceProposal = null;
      console.log('Proposal rejected - dates remain locked:', chat.lockedDates);
    }

    await chat.save();

    // Notify other user
    const otherUserId = isTenant ? chat.owner._id : chat.tenant._id;
    const notification = await Notification.create({
      user: otherUserId,
      type: action === 'accept' ? 'price_accepted' : 'price_rejected',
      title: action === 'accept' ? 'Price Accepted' : 'Price Rejected',
      message: `${req.user.name} ${action}ed your price proposal`,
      relatedId: chat._id
    });

    if (io) {
      io.to(chat._id.toString()).emit('price-proposal-updated', {
        chatId: chat._id.toString(),
        ...(chat.priceProposal ? {
          proposedBy: chat.priceProposal.proposedBy,
          amount: chat.priceProposal.amount,
          startDate: chat.priceProposal.startDate,
          endDate: chat.priceProposal.endDate,
          status: chat.priceProposal.status
        } : null)
      });
      
      // Emit real-time notification to the other user
      io.to(otherUserId.toString()).emit('new-notification', {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedId: notification.relatedId,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });
    }

    res.json({ message: `Price proposal ${action}ed`, chat });
  } catch (error) {
    console.error('Price response error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Close chat
router.post('/:id/close', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is part of this chat
    if (chat.tenant._id.toString() !== req.user._id.toString() && 
        chat.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    chat.isActive = false;
    chat.isClosed = true;
    await chat.save();

    res.json({ message: 'Chat closed successfully', chat });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;



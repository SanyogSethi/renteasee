const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      // Content is required only if there's no image
      return !this.imageUrl;
    },
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  imageUrl: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  messages: [messageSchema],
  lockedDates: {
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  priceProposal: {
    proposedBy: {
      type: String,
      enum: ['tenant', 'owner', null],
      default: null
    },
    amount: {
      type: Number,
      default: null
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', null],
      default: null
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Chat', chatSchema);



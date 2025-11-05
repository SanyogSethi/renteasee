const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    fullAddress: String
  },
  location: {
    latitude: {
      type: Number,
      required: false
    },
    longitude: {
      type: Number,
      required: false
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  availableCapacity: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: [{
    type: String
  }],
  // Structured amenities for filtering
  amenitiesDetails: {
    foodAvailability: {
      type: String,
      enum: ['With food', 'Without food'],
      default: 'Without food'
    },
    wifi: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No'
    },
    ac: {
      type: String,
      enum: ['AC', 'Non-AC'],
      default: 'Non-AC'
    },
    laundry: {
      type: String,
      enum: ['Available', 'Not available'],
      default: 'Not available'
    },
    housekeeping: {
      type: String,
      enum: ['Daily', 'Weekly', 'None'],
      default: 'None'
    },
    attachedBathroom: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No'
    },
    parking: {
      type: String,
      enum: ['For two-wheelers', 'For four-wheelers', 'None'],
      default: 'None'
    }
  },
  images: [{
    type: String // Paths to image files
  }],
  isAvailable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  rules: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

propertySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Property', propertySchema);



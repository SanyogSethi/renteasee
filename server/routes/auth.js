const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { verifyDocument } = require('../utils/documentVerification');
const documentVerificationService = require('../services/documentVerificationService');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Ensure upload directories exist
const documentsUploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(documentsUploadDir)) {
  fs.mkdirSync(documentsUploadDir, { recursive: true });
  console.log(`✅ Created directory: ${documentsUploadDir}`);
}

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path to ensure file is saved correctly on Render
    cb(null, documentsUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Ensure extension is lowercase for consistency
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed'));
    }
  }
});

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// Register with document verification
router.post('/register', upload.single('document'), async (req, res) => {
  try {
    console.log('\n=== User Registration ===');
    console.log('Request file:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'NO FILE RECEIVED');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Content-Type:', req.headers['content-type']);

    const { name, email, password, phone, role, documentType } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['tenant', 'owner'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Verify document if provided
    let isVerified = false;
    let detectedDocumentType = null;
    if (req.file) {
      console.log('✅ File received, verifying...');
      const documentPath = req.file.path;
      
      // Verify file exists
      if (fs.existsSync(documentPath)) {
        console.log('✅ Document file exists:', documentPath);
      } else {
        console.error('❌ Document file does NOT exist:', documentPath);
      }
      const { documentNumber } = req.body; // Get document number from user input
      
      // Pass user's name (for identification) and document number to verification service
      const verificationResult = await verifyDocument(documentPath, role, name, documentNumber);
      
      console.log('Verification result:', verificationResult);
      
      if (verificationResult.isValid) {
        isVerified = true;
        detectedDocumentType = verificationResult.documentType || documentType || 'unknown';
        
        // Check if document type is allowed for this role
        const roleValidation = documentVerificationService.validateDocumentForRole(
          detectedDocumentType.toUpperCase(), 
          role
        );
        
        if (!roleValidation.isAllowed) {
          // Delete uploaded file if document type not allowed
          await require('fs').promises.unlink(documentPath).catch(() => {});
          return res.status(400).json({ 
            message: roleValidation.message || 'Document type not allowed for this role'
          });
        }
        
        // With parameter-based verification, we use passPercentage instead of confidence
        const passPercentage = verificationResult.passPercentage || 0;
        
        // Still check minimum confidence if provided, but parameter-based approach is primary
        if (passPercentage < 60) {
          // Delete uploaded file if verification fails
          await require('fs').promises.unlink(documentPath).catch(() => {});
          return res.status(400).json({ 
            message: `Document verification failed. Only ${verificationResult.passedParameters}/${verificationResult.totalParameters} parameters passed (${passPercentage.toFixed(1)}%). Need at least 60%.`,
            recommendations: verificationResult.recommendations || null,
            parameters: verificationResult.parameters || null
          });
        }
      } else {
        // Delete uploaded file if verification fails
        await require('fs').promises.unlink(documentPath).catch(() => {});
        return res.status(400).json({ 
          message: verificationResult.message || 'Document verification failed',
          recommendations: verificationResult.recommendations || null,
          parameters: verificationResult.parameters || null
        });
      }
    } else {
      return res.status(400).json({ message: 'Document is required for verification' });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
      isVerified,
      verificationDocument: req.file.path,
      documentType: detectedDocumentType || documentType || 'unknown'
    });

    await user.save();

    // Create welcome notification
    await Notification.create({
      user: user._id,
      type: 'system',
      title: 'Welcome to RentEase!',
      message: 'Your account has been created successfully. Start exploring properties!'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;



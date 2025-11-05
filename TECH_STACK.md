# RentEase - Tech Stack Overview

## 🏗️ Architecture

**MERN Stack** - MongoDB, Express.js, React, Node.js

---

## 📦 Backend Technologies

### Core Framework
- **Node.js** - JavaScript runtime environment
- **Express.js** (v4.18.2) - Web application framework
- **Mongoose** (v8.0.3) - MongoDB object modeling

### Database
- **MongoDB** - NoSQL database
  - MongoDB Atlas (Cloud - Production)
  - Local MongoDB (Development)

### Authentication & Security
- **jsonwebtoken** (v9.0.2) - JWT-based authentication
- **bcryptjs** (v2.4.3) - Password hashing
- **cors** (v2.8.5) - Cross-Origin Resource Sharing

### Real-time Communication
- **Socket.io** (v4.6.1) - Real-time bidirectional communication
  - Chat messaging
  - Live notifications
  - Real-time updates

### File & Image Processing
- **Multer** (v1.4.5-lts.1) - File upload middleware
  - Memory storage (for MongoDB)
  - Image uploads
  - Document uploads
- **Sharp** (v0.33.5) - High-performance image processing

### OCR & Document Verification
- **Tesseract.js** (v5.0.4) - OCR (Optical Character Recognition)
  - Document text extraction
  - Government ID verification
  - Custom document verification service

### Utilities
- **dotenv** (v16.3.1) - Environment variable management
- **express-validator** (v7.0.1) - Input validation

### Development Tools
- **nodemon** (v3.0.2) - Auto-restart server on changes
- **concurrently** (v8.2.2) - Run multiple commands simultaneously

---

## 🎨 Frontend Technologies

### Core Framework
- **React** (v18.2.0) - UI library
- **React DOM** (v18.2.0) - React rendering
- **Vite** (v5.0.8) - Build tool and dev server

### Routing
- **React Router DOM** (v6.20.1) - Client-side routing

### HTTP Client
- **Axios** (v1.6.2) - HTTP client for API calls

### Real-time Communication
- **Socket.io-client** (v4.6.1) - Client-side Socket.io

### Maps & Location
- **@react-google-maps/api** (v2.20.7) - Google Maps integration
  - Property location selection
  - Map visualization
  - Distance calculation (Haversine formula)
  - Location-based filtering

### Date & Calendar
- **react-calendar** (v4.7.0) - Calendar component
  - Booking date selection
  - Visual calendar display
- **date-fns** (v2.30.0) - Date utility library

### Development Tools
- **@vitejs/plugin-react** (v4.2.1) - Vite React plugin

---

## 🌐 External Services & APIs

### Google Maps Platform
- **Maps JavaScript API** - Interactive maps
- **Places API** - Location search and autocomplete
- **Geocoding API** - Address to coordinates conversion

### OCR Services (Optional)
- **Tesseract.js** - Primary OCR engine (offline)
- **Google Cloud Vision API** - Cloud OCR option
- **AWS Textract** - Cloud OCR option

---

## 🚀 Deployment & Hosting

### Frontend
- **Vercel** - Static site hosting
  - Automatic deployments from GitHub
  - Environment variable management
  - CDN distribution

### Backend
- **Render** - Platform-as-a-Service
  - Automatic deployments from GitHub
  - Environment variable management
  - Free tier available

### Database
- **MongoDB Atlas** - Cloud MongoDB hosting
  - Free tier (512MB storage)
  - Automatic backups
  - Global clusters

---

## 📁 Project Structure

```
SE_Rebuild/
├── server/                 # Backend
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth & validation
│   ├── services/          # Business logic
│   ├── utils/             # Helper functions
│   └── index.js          # Server entry point
├── client/                # Frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React Context API
│   │   ├── utils/        # Utility functions
│   │   └── App.jsx       # Main app component
│   └── package.json
├── assets/                # Static assets
├── scripts/               # Utility scripts
└── package.json
```

---

## 🔧 Key Features & Technologies Used

### Image Storage
- **MongoDB GridFS** - Binary image storage
- **Base64 Encoding** - Image data encoding
- **Fallback System** - Default images for missing files

### State Management
- **React Context API** - Global state
  - Authentication context
  - Notification context
- **React Hooks** - Local state management
  - useState, useEffect, useCallback, useMemo

### Real-time Features
- **Socket.io** - Bidirectional communication
  - Chat messages
  - Live notifications
  - Real-time updates

### UI/UX
- **Custom CSS** - Beige-inspired color palette
- **Responsive Design** - Mobile-first approach
- **WhatsApp-style Chat UI** - Familiar messaging interface

---

## 📊 Data Models

### MongoDB Collections
- **Users** - Tenant, Owner, Admin roles
- **Properties** - Property listings
- **Chats** - Conversations between users
- **Messages** - Chat messages (embedded)
- **Bookings** - Rental bookings
- **Ratings** - User ratings
- **Notifications** - User notifications
- **Images** - Binary image storage

---

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcryptjs
- **CORS Configuration** - Cross-origin security
- **Input Validation** - express-validator
- **Document Verification** - OCR-based ID verification

---

## 📦 Package Management

- **npm** - Node package manager
- **Concurrent Installation** - Run backend & frontend installs together

---

## 🛠️ Development Workflow

1. **Development**
   - `npm run dev` - Runs both servers concurrently
   - Hot reload enabled (Vite + nodemon)

2. **Build**
   - `npm run build` - Build frontend for production
   - Vite handles bundling and optimization

3. **Deployment**
   - Frontend: Vercel (automatic from GitHub)
   - Backend: Render (automatic from GitHub)
   - Database: MongoDB Atlas (cloud)

---

## 📝 Environment Variables

### Backend (.env)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CLIENT_URL` - Frontend URL (CORS)
- `OCR_ENGINE` - OCR engine selection
- `OCR_PREPROCESSING` - Image preprocessing flag

### Frontend (client/.env)
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key

---

## 🎯 Special Features

- **Document OCR** - Government ID verification
- **Real-time Chat** - Socket.io messaging
- **Image Carousel** - Property image display
- **Map Integration** - Google Maps for location
- **Distance Filtering** - Haversine formula
- **Calendar System** - Booking date management
- **Notification System** - Real-time alerts
- **Rating System** - Post-booking reviews

---

## 📈 Performance Optimizations

- **Image Caching** - Browser caching headers
- **MongoDB Indexing** - Optimized queries
- **React Memoization** - useMemo, useCallback
- **Lazy Loading** - Code splitting with Vite
- **CDN Distribution** - Vercel CDN

---

## 🔄 Version Control & CI/CD

- **Git** - Version control
- **GitHub** - Repository hosting
- **Automatic Deployments** - Vercel & Render
- **Environment Sync** - Environment variable management

---

## 📚 Documentation

- README.md - Project overview
- API Documentation - Endpoint documentation
- Deployment Guides - Setup instructions
- Migration Scripts - Database utilities

---

This is a **full-stack MERN application** with modern tooling, real-time features, and cloud deployment capabilities.


# RentEase - PG Rental Platform

A comprehensive web application for PG (Paying Guest) rentals, connecting property owners with tenants through a secure, verified platform.

## Features

### 🔐 Authentication & Verification
- Role-based authentication (Tenant, Owner, Admin)
- Government document verification using OCR
- Secure JWT-based authentication

### 🏠 Property Management
- Property listing with images, amenities, and rules
- Owner dashboard for managing properties
- Search and filter properties
- Image upload with fallback to stock images
- **Google Maps integration for location selection**
- **Distance-based filtering from workplace**

### 💬 Real-time Chat
- Socket.io based real-time messaging
- Price negotiation with date selection
- Image sharing in chats
- Chat locking mechanism during price proposals

### 📅 Booking System
- Calendar-based booking visualization
- Booking status management (pending, accepted, rejected, completed)
- Owner can accept/reject bookings
- Booking history (past, present, future)

### ⭐ Ratings & Reviews
- Post-booking ratings for both tenants and owners
- Review system
- Average rating display

### 🔔 Notifications
- Real-time notifications for:
  - New chats
  - New properties
  - Booking requests
  - Price proposals
  - System updates

### 👨‍💼 Admin Panel
- User management (block/delete users)
- Platform statistics
- Ratings overview
- Property management

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication
- Multer for file uploads
- Tesseract.js for OCR (document verification)

### Frontend
- React with Vite
- React Router for navigation
- Socket.io Client for real-time features
- React Calendar for date selection
- Axios for API calls
- Google Maps API (@react-google-maps/api) for location selection and distance filtering

## Project Structure

```
SE_Rebuild/
├── server/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── utils/           # Utility functions
│   └── index.js         # Server entry point
├── client/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React contexts
│   │   ├── utils/       # Utility functions
│   │   └── App.jsx      # Main app component
│   └── package.json
├── services/
│   └── documentOCRService.js  # OCR service
├── assets/              # Images and assets
└── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentease
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CLIENT_URL=http://localhost:5173
OCR_ENGINE=tesseract
OCR_PREPROCESSING=true
```

3. Create necessary directories:
```bash
mkdir -p uploads/documents uploads/properties uploads/chats
```

4. Start the backend server:
```bash
npm run server
```

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `client` directory:
```env
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

**Note:** To get a Google Maps API key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable "Maps JavaScript API" and "Places API"
4. Create credentials (API Key)
5. Restrict the API key to your domain for security
6. Add the key to `client/.env` as `VITE_GOOGLE_MAPS_API_KEY`

4. Start the development server:
```bash
npm run dev
```

### Running Both

From the root directory:
```bash
npm run dev
```

This will start both backend and frontend concurrently.

## Usage

### Creating an Admin User

To create an admin user, you'll need to manually add one to the database or modify the registration route temporarily:

```javascript
// In server/routes/auth.js, modify the register route to allow admin role
```

### User Registration

1. Go to `/register`
2. Fill in your details
3. Upload a government-issued document (Aadhar, PAN, License, or Passport)
4. Select your role (Tenant or Owner)
5. Wait for document verification via OCR

### Property Listing (Owners)

1. Login as an owner
2. Go to Dashboard → My Properties
3. Click "Add New Property"
4. Fill in property details and upload images
5. **Set property location on the map** - Click on the map or search for an address to set the exact coordinates
6. Save the property

### Booking Process (Tenants)

1. Browse properties on the homepage
2. **Filter by distance from workplace** - Set your workplace location and maximum distance to find nearby PGs
3. Click "Chat with Owner" to start a conversation
4. Propose a price with start and end dates
5. Owner can accept/reject or propose a new price
6. Once price is accepted, owner can accept/reject the booking
7. After booking period ends, both parties can rate each other

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Properties
- `GET /api/properties` - Get all properties (supports distance filtering with `workplaceLat`, `workplaceLon`, `maxDistance`)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (Owner, accepts `latitude` and `longitude`)
- `PUT /api/properties/:id` - Update property (Owner, accepts `latitude` and `longitude`)
- `GET /api/properties/owner/my-properties` - Get owner's properties

### Chats
- `GET /api/chats` - Get user's chats
- `GET /api/chats/:id` - Get single chat
- `POST /api/chats/start` - Start new chat
- `POST /api/chats/:id/message` - Send message
- `POST /api/chats/:id/propose-price` - Propose price
- `POST /api/chats/:id/price-response` - Accept/reject price
- `POST /api/chats/:id/close` - Close chat

### Bookings
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/calendar` - Get booking calendar
- `POST /api/bookings/:id/respond` - Accept/reject booking (Owner)
- `POST /api/bookings/:id/complete` - Mark booking as completed

### Ratings
- `POST /api/ratings` - Submit rating
- `GET /api/ratings/user/:userId` - Get user's ratings

### Notifications
- `GET /api/notifications` - Get notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

### Admin
- `GET /api/admin/dashboard` - Get dashboard summary
- `GET /api/admin/users` - Get all users
- `PATCH /api/admin/users/:id/block` - Block/unblock user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/properties` - Get all properties
- `GET /api/admin/ratings` - Get all ratings

## Environment Variables

### Backend (.env in root)
- `PORT` - Server port (default: 5050)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `CLIENT_URL` - Frontend URL for CORS
- `OCR_ENGINE` - OCR engine to use (tesseract, google, aws, hybrid)
- `OCR_PREPROCESSING` - Enable image preprocessing (true/false)

### Frontend (client/.env)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps API key for location features

## Color Palette

The application uses a beige-inspired color palette:
- Primary: Beige-600 (#9d8e7a)
- Background: Beige-50 (#faf9f6)
- Surface: White
- Text: Beige-900 (#3d362c)

## Deployment

### Backend Deployment
1. Set up MongoDB Atlas or use a cloud MongoDB instance
2. Update `MONGODB_URI` in environment variables
3. Set production `JWT_SECRET`
4. Deploy to platforms like Heroku, Railway, or AWS

### Frontend Deployment
1. Build the frontend: `cd client && npm run build`
2. Deploy the `dist` folder to platforms like Vercel, Netlify, or AWS S3

### File Storage
For production, consider using cloud storage (AWS S3, Cloudinary) for uploaded files instead of local storage.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.



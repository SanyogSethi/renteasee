import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import BookingCalendar from '../components/calendar/BookingCalendar'
import PropertyImageCarousel from '../components/property/PropertyImageCarousel'
import { getImageUrl } from '../utils/imageUtils'
import './PropertyDetails.css'

const PropertyDetails = () => {
  const { id } = useParams()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showChatModal, setShowChatModal] = useState(false)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [proposedAmount, setProposedAmount] = useState('')
  const [autoCalculatedAmount, setAutoCalculatedAmount] = useState(false) // Track if amount was auto-calculated
  const [bookedDates, setBookedDates] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchProperty()
  }, [id])

  // Calculate proposed amount based on selected dates
  useEffect(() => {
    if (startDate && endDate && property && property.price) {
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
      const monthlyPrice = property.price
      const dailyRate = monthlyPrice / 30 // Using 30 days as standard for monthly calculation
      const calculatedAmount = Math.round((dailyRate * totalDays) / 100) * 100 // Round to nearest hundred
      
      // Always update the input with calculated value when dates change
      // User can still manually edit it afterwards
      setProposedAmount(calculatedAmount.toString())
      setAutoCalculatedAmount(true)
    } else if (!startDate || !endDate) {
      // Reset to monthly price if no dates selected
      if (property && property.price) {
        setProposedAmount(property.price.toString())
        setAutoCalculatedAmount(false)
      }
    }
  }, [startDate, endDate, property])

  // Reset auto-calculated flag when user manually changes amount
  const handleAmountChange = (e) => {
    setProposedAmount(e.target.value)
    setAutoCalculatedAmount(false)
  }

  const fetchProperty = async () => {
    try {
      const response = await api.get(`/properties/${id}`)
      setProperty(response.data)
      if (response.data.price) {
        setProposedAmount(response.data.price.toString())
      }
    } catch (error) {
      console.error('Error fetching property:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBookedDates = async (propertyId) => {
    try {
      const response = await api.get(`/bookings/calendar?propertyId=${propertyId}`)
      setBookedDates(response.data.bookedDates || [])
    } catch (error) {
      console.error('Error fetching booked dates:', error)
      // Set empty array if error - don't break the flow
      setBookedDates([])
    }
  }

  const handleStartChat = () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.role !== 'tenant') {
      alert('Only tenants can start chats')
      return
    }

    setStartDate(null)
    setEndDate(null)
    setProposedAmount(property.price?.toString() || '')
    setAutoCalculatedAmount(false)
    fetchBookedDates(id)
    setShowChatModal(true)
  }

  const handleSubmitChat = async () => {
    if (!startDate || !endDate || !proposedAmount) {
      alert('Please select dates and enter a proposed amount')
      return
    }

    if (startDate >= endDate) {
      alert('End date must be after start date')
      return
    }

    // Calculate total days (inclusive)
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
    
    // Validate minimum rental period (15 days for PG)
    if (totalDays < 15) {
      alert(`Minimum rental period is 15 days for PG accommodations. You selected ${totalDays} days. Please select a longer period.`)
      return
    }

    try {
      // Start chat
      const chatResponse = await api.post('/chats/start', { propertyId: id })
      const chatId = chatResponse.data._id

      // Propose price with dates
      await api.post(`/chats/${chatId}/propose-price`, {
        amount: parseFloat(proposedAmount),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      setShowChatModal(false)
      // Wait a bit for the chat to be saved properly
      setTimeout(() => {
        navigate(`/dashboard?chat=${chatId}`, { replace: true })
      }, 500)
    } catch (error) {
      console.error('Error starting chat:', error)
      alert(error.response?.data?.message || 'Failed to start chat')
    }
  }

  const getPropertyImage = (index = 0) => {
    if (property.images && property.images.length > index) {
      return getImageUrl(property.images[index])
    }
    return '/-2.jpg'
  }

  if (loading) {
    return (
      <div className="app">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="app">
        <Navbar />
        <div className="error-container">
          <p>Property not found</p>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="app">
      <Navbar />
      <div className="property-details">
        <div className="property-images">
          <img src={getPropertyImage(0)} alt={property.title} className="main-image" />
          {property.images && property.images.length > 1 && (
            <div className="thumbnail-images">
              {property.images.slice(1, 5).map((image, idx) => (
              <img
                key={idx}
                src={getImageUrl(image)}
                alt={`${property.title} ${idx + 2}`}
                className="thumbnail"
              />
              ))}
            </div>
          )}
        </div>

        <div className="property-info">
          <h1>{property.title}</h1>
          <p className="property-location">{property.address?.fullAddress || property.address?.city}</p>
          <p className="property-price">₹{property.price}/month</p>
          <p className="property-capacity">
            Available: {property.availableCapacity}/{property.capacity} spots
          </p>

          <div className="property-section">
            <h2>Description</h2>
            <p>{property.description}</p>
          </div>

          {property.amenities && property.amenities.length > 0 && (
            <div className="property-section">
              <h2>Amenities</h2>
              <ul className="amenities-list">
                {property.amenities.map((amenity, idx) => (
                  <li key={idx}>{amenity}</li>
                ))}
              </ul>
            </div>
          )}

          {property.rules && property.rules.length > 0 && (
            <div className="property-section">
              <h2>Rules</h2>
              <ul className="rules-list">
                {property.rules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="property-section">
            <h2>Owner Information</h2>
            {property.owner && (
              <div className="owner-info">
                <p><strong>Name:</strong> {property.owner.name}</p>
                <p><strong>Contact:</strong> {property.owner.phone}</p>
                <p><strong>Email:</strong> {property.owner.email}</p>
              </div>
            )}
          </div>

          {user && user.role === 'tenant' && (
            <div className="property-actions">
              <button className="btn btn-primary btn-large" onClick={handleStartChat}>
                Start Chat with Owner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChatModal && property ? (
        <div className="modal-overlay" onClick={() => setShowChatModal(false)}>
          <div className="modal-content chat-start-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start Chat with Owner</h2>
              <button className="close-btn" onClick={() => setShowChatModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">Select your preferred dates and propose a price for <strong>{property.title}</strong></p>
              
              <div className="form-group">
                <label className="form-label">Proposed Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={proposedAmount}
                  onChange={handleAmountChange}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
                <small className="form-hint">Owner's listing price: ₹{property.price}/month</small>
                {startDate && endDate && (
                  <small className="form-hint" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    Calculated: ₹{Math.round((property.price / 30 * (Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1)) / 100) * 100} for {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Select Rental Period</label>
                <BookingCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  bookedDates={bookedDates}
                  minDays={15}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowChatModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitChat}
                disabled={!startDate || !endDate || !proposedAmount || (startDate && endDate && (Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1) < 15)}
              >
                Start Chat & Send Proposal
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <Footer />
    </div>
  )
}

export default PropertyDetails

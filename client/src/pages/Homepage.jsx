import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import BookingCalendar from '../components/calendar/BookingCalendar'
import MapLocationPicker from '../components/map/MapLocationPicker'
import PropertiesMap from '../components/map/PropertiesMap'
import PropertyImageCarousel from '../components/property/PropertyImageCarousel'
import './Homepage.css'

// Amenity Item Component
const AmenityItem = ({ label, value, isAvailable, showValue = true }) => {
  return (
    <div className="amenity-item">
      <span className="amenity-icon">
        {isAvailable ? (
          <span className="amenity-check">✓</span>
        ) : (
          <span className="amenity-cross">✗</span>
        )}
      </span>
      <span className="amenity-label">{label}</span>
      {showValue && value && (
        <span className="amenity-value">({value})</span>
      )}
    </div>
  )
}

// Property Card Component with Image Carousel
const PropertyCard = ({ property, expandedProperties, setExpandedProperties, handleStartChat }) => {
  const isExpanded = expandedProperties.includes(property._id)
  
  const toggleExpand = () => {
    setExpandedProperties(prev => {
      if (prev.includes(property._id)) {
        // Remove from expanded list
        return prev.filter(id => id !== property._id)
      } else {
        // Add to expanded list
        return [...prev, property._id]
      }
    })
  }

  return (
    <div className="property-card">
      <div className="property-image">
        <PropertyImageCarousel 
          images={property.images || []} 
          propertyTitle={property.title}
        />
      </div>
      <div className="property-content">
        <h3>{property.title}</h3>
        <p className="property-location">
          {property.address?.fullAddress || property.address?.city || 'Location not specified'}
        </p>
        <p className="property-price">₹{property.price}/month</p>
        {property.distanceFromWorkplace !== undefined && (
          <p className="property-distance">
            📍 {property.distanceFromWorkplace.toFixed(2)} km from workplace
          </p>
        )}
        <p className="property-capacity">
          Available: {property.availableCapacity}/{property.capacity}
        </p>
        <div className="property-actions">
          <button
            className="btn btn-outline"
            onClick={toggleExpand}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleStartChat(property)}
          >
            Chat with Owner
          </button>
        </div>
        {isExpanded && (
          <div className="property-details">
            <p className="property-description">{property.description}</p>
            
            {/* Filterable Amenities */}
            {property.amenitiesDetails && (
              <div className="amenities-section">
                <h4>Filterable Amenities</h4>
                <div className="amenities-list">
                  <AmenityItem 
                    label="Food Availability" 
                    value={property.amenitiesDetails.foodAvailability}
                    isAvailable={property.amenitiesDetails.foodAvailability === 'With food'}
                  />
                  <AmenityItem 
                    label="Wi-Fi" 
                    value={property.amenitiesDetails.wifi}
                    isAvailable={property.amenitiesDetails.wifi === 'Yes'}
                  />
                  <AmenityItem 
                    label="Air Conditioning" 
                    value={property.amenitiesDetails.ac}
                    isAvailable={property.amenitiesDetails.ac === 'AC'}
                  />
                  <AmenityItem 
                    label="Laundry Service" 
                    value={property.amenitiesDetails.laundry}
                    isAvailable={property.amenitiesDetails.laundry === 'Available'}
                  />
                  <AmenityItem 
                    label="Housekeeping" 
                    value={property.amenitiesDetails.housekeeping}
                    isAvailable={property.amenitiesDetails.housekeeping !== 'None'}
                  />
                  <AmenityItem 
                    label="Attached Bathroom" 
                    value={property.amenitiesDetails.attachedBathroom}
                    isAvailable={property.amenitiesDetails.attachedBathroom === 'Yes'}
                  />
                  <AmenityItem 
                    label="Parking" 
                    value={property.amenitiesDetails.parking}
                    isAvailable={property.amenitiesDetails.parking !== 'None'}
                  />
                </div>
              </div>
            )}
            
            {/* Additional Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="amenities-section">
                <h4>Additional Amenities</h4>
                <div className="amenities-list additional-amenities">
                  {property.amenities.map((amenity, idx) => (
                    <AmenityItem 
                      key={idx}
                      label={amenity}
                      value={null}
                      isAvailable={true}
                      showValue={false}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {property.owner && (
              <div className="owner-info">
                <p><strong>Owner:</strong> {property.owner.name}</p>
                <p><strong>Contact:</strong> {property.owner.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Homepage = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedProperties, setExpandedProperties] = useState([])
  const [showChatModal, setShowChatModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [proposedAmount, setProposedAmount] = useState('')
  const [bookedDates, setBookedDates] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    foodAvailability: '',
    wifi: '',
    ac: '',
    laundry: '',
    housekeeping: '',
    attachedBathroom: '',
    parking: '',
    minPrice: '',
    maxPrice: '',
    city: ''
  })
  const [workplaceLocation, setWorkplaceLocation] = useState(null)
  const [workplaceAddress, setWorkplaceAddress] = useState('')
  const [maxDistance, setMaxDistance] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [autoCalculatedAmount, setAutoCalculatedAmount] = useState(false) // Track if amount was auto-calculated

  // Calculate proposed amount based on selected dates
  useEffect(() => {
    if (startDate && endDate && selectedProperty && selectedProperty.price) {
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
      const monthlyPrice = selectedProperty.price
      const dailyRate = monthlyPrice / 30 // Using 30 days as standard for monthly calculation
      const calculatedAmount = Math.round((dailyRate * totalDays) / 100) * 100 // Round to nearest hundred
      
      // Always update the input with calculated value when dates change
      // User can still manually edit it afterwards
      setProposedAmount(calculatedAmount.toString())
      setAutoCalculatedAmount(true)
    } else if (!startDate || !endDate) {
      // Reset to monthly price if no dates selected
      if (selectedProperty && selectedProperty.price) {
        setProposedAmount(selectedProperty.price.toString())
        setAutoCalculatedAmount(false)
      }
    }
  }, [startDate, endDate, selectedProperty])

  // Reset auto-calculated flag when user manually changes amount
  const handleAmountChange = (e) => {
    setProposedAmount(e.target.value)
    setAutoCalculatedAmount(false)
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('search', searchQuery)
      if (filters.foodAvailability) params.append('foodAvailability', filters.foodAvailability)
      if (filters.wifi) params.append('wifi', filters.wifi)
      if (filters.ac) params.append('ac', filters.ac)
      if (filters.laundry) params.append('laundry', filters.laundry)
      if (filters.housekeeping) params.append('housekeeping', filters.housekeeping)
      if (filters.attachedBathroom) params.append('attachedBathroom', filters.attachedBathroom)
      if (filters.parking) params.append('parking', filters.parking)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.city) params.append('city', filters.city)
      
      // Add workplace location and distance filter
      if (workplaceLocation && maxDistance) {
        params.append('workplaceLat', workplaceLocation.lat.toString())
        params.append('workplaceLon', workplaceLocation.lng.toString())
        params.append('maxDistance', maxDistance)
      }

      const queryString = params.toString()
      const url = queryString ? `/properties?${queryString}` : '/properties'
      const response = await api.get(url)
      setProperties(response.data)
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchProperties()
  }

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  const handleApplyFilters = () => {
    fetchProperties()
  }

  const handleWorkplaceLocationSelect = useCallback((location) => {
    setWorkplaceLocation(location)
  }, [])

  const handleResetFilters = () => {
    setSearchQuery('')
    setFilters({
      foodAvailability: '',
      wifi: '',
      ac: '',
      laundry: '',
      housekeeping: '',
      attachedBathroom: '',
      parking: '',
      minPrice: '',
      maxPrice: '',
      city: ''
    })
    setWorkplaceLocation(null)
    setWorkplaceAddress('')
    setMaxDistance('')
    setTimeout(() => {
      fetchProperties()
    }, 100)
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

  const handleStartChat = (property) => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.role !== 'tenant') {
      alert('Only tenants can start chats')
      return
    }

    setSelectedProperty(property)
    setProposedAmount(property.price?.toString() || '')
    setStartDate(null)
    setEndDate(null)
    setAutoCalculatedAmount(false)
    fetchBookedDates(property._id)
    setShowChatModal(true)
  }

  const handleChatModalClose = () => {
    setShowChatModal(false)
    setSelectedProperty(null)
    setStartDate(null)
    setEndDate(null)
    setProposedAmount('')
    setAutoCalculatedAmount(false)
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
      const chatResponse = await api.post('/chats/start', { propertyId: selectedProperty._id })
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

  if (loading) {
    return (
      <div className="app">
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Navbar />
      <main className="homepage">
        <div className="hero-section">
          <h1>Find Your Perfect PG</h1>
          <p>Discover verified PG accommodations with ease</p>
        </div>

        {/* Search and Filter Section */}
        <div className="search-filter-section">
          <div className="search-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Search by property name, location, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn btn-primary" onClick={handleSearch}>
              Search
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="filters-panel">
              <h3>Amenities Filters</h3>
              <p className="filters-intro">These help users find PGs with their desired facilities:</p>
              
              <div className="filters-grid">
                <div className="filter-group">
                  <label className="filter-label">5. Food Availability</label>
                  <select
                    className="filter-select"
                    value={filters.foodAvailability}
                    onChange={(e) => handleFilterChange('foodAvailability', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="With food">With food</option>
                    <option value="Without food">Without food</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">6. Wi-Fi</label>
                  <select
                    className="filter-select"
                    value={filters.wifi}
                    onChange={(e) => handleFilterChange('wifi', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">7. Air Conditioning (AC)</label>
                  <select
                    className="filter-select"
                    value={filters.ac}
                    onChange={(e) => handleFilterChange('ac', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="AC">AC</option>
                    <option value="Non-AC">Non-AC</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">8. Laundry Service</label>
                  <select
                    className="filter-select"
                    value={filters.laundry}
                    onChange={(e) => handleFilterChange('laundry', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="Available">Available</option>
                    <option value="Not available">Not available</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">9. Housekeeping / Cleaning</label>
                  <select
                    className="filter-select"
                    value={filters.housekeeping}
                    onChange={(e) => handleFilterChange('housekeeping', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">10. Attached Bathroom</label>
                  <select
                    className="filter-select"
                    value={filters.attachedBathroom}
                    onChange={(e) => handleFilterChange('attachedBathroom', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">11. Parking</label>
                  <select
                    className="filter-select"
                    value={filters.parking}
                    onChange={(e) => handleFilterChange('parking', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="For two-wheelers">For two-wheelers</option>
                    <option value="For four-wheelers">For four-wheelers</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">City</label>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Enter city name"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Min Price (₹)</label>
                  <input
                    type="number"
                    className="filter-input"
                    placeholder="Minimum"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Max Price (₹)</label>
                  <input
                    type="number"
                    className="filter-input"
                    placeholder="Maximum"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  />
                </div>
              </div>

              {/* Workplace Location Filter */}
              <div className="workplace-filter-section">
                <h4>Filter by Distance from Workplace</h4>
                <div className="form-group">
                  <label className="filter-label">Workplace Address</label>
                  <MapLocationPicker
                    onLocationSelect={handleWorkplaceLocationSelect}
                    initialLocation={workplaceLocation}
                    address={workplaceAddress}
                  />
                </div>
                <div className="form-group">
                  <label className="filter-label">Maximum Distance (km)</label>
                  <input
                    type="number"
                    className="filter-input"
                    placeholder="e.g., 5, 10, 20"
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(e.target.value)}
                    min="0"
                    step="0.1"
                  />
                  <small className="form-hint">
                    Properties will be filtered and sorted by distance from your workplace
                  </small>
                </div>
              </div>

              <div className="filter-actions">
                <button className="btn btn-primary" onClick={handleApplyFilters}>
                  Apply Filters
                </button>
                <button className="btn btn-outline" onClick={handleResetFilters}>
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="properties-container">
          <h2>Available Properties ({properties.length})</h2>
          
          {/* Show map if there are properties with locations */}
          {properties.length > 0 && (
            <PropertiesMap properties={properties} workplaceLocation={workplaceLocation} />
          )}
          
          <div className="properties-grid">
            {properties.map(property => (
              <PropertyCard
                key={property._id}
                property={property}
                expandedProperties={expandedProperties}
                setExpandedProperties={setExpandedProperties}
                handleStartChat={handleStartChat}
              />
            ))}
          </div>
          {properties.length === 0 && (
            <div className="no-properties">
              <p>No properties available at the moment.</p>
            </div>
          )}
        </div>
      </main>

      {/* Chat Modal */}
      {showChatModal && selectedProperty ? (
        <div className="modal-overlay" onClick={handleChatModalClose}>
          <div className="modal-content chat-start-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start Chat with Owner</h2>
              <button className="close-btn" onClick={handleChatModalClose}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">Select your preferred dates and propose a price for <strong>{selectedProperty.title}</strong></p>
              
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
                <small className="form-hint">Owner's listing price: ₹{selectedProperty.price}/month</small>
                {startDate && endDate && (
                  <small className="form-hint" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                    Calculated: ₹{Math.round((selectedProperty.price / 30 * (Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1)) / 100) * 100} for {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1} days
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
                onClick={handleChatModalClose}
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

export default Homepage

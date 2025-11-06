import { useState, useEffect, useRef } from 'react'
import api from '../../utils/api'
import { getImageUrl } from '../../utils/imageUtils'
import MapLocationPicker from '../map/MapLocationPicker'

const PropertyForm = ({ property, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    price: '',
    capacity: '',
    amenities: [],
    rules: [],
    images: [],
    latitude: '',
    longitude: '',
    // Structured amenities for filtering
    foodAvailability: 'Without food',
    wifi: 'No',
    ac: 'Non-AC',
    laundry: 'Not available',
    housekeeping: 'None',
    attachedBathroom: 'No',
    parking: 'None'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState(null)
  const [showAmenitiesDropdown, setShowAmenitiesDropdown] = useState(false)
  const amenitiesDropdownRef = useRef(null)

  // Common amenities list (excluding ones that are in Filterable Amenities)
  // Removed: WiFi, AC, Parking, Attached Bathroom, Laundry Service, Housekeeping
  // These are now handled in the Filterable Amenities section
  const commonAmenities = [
    'Fan',
    'Geyser',
    'Washing Machine',
    'Refrigerator',
    'Microwave',
    'TV',
    'Security',
    'CCTV',
    'Power Backup',
    'Lift',
    'Gym',
    'Kitchen',
    'Common Area',
    'Balcony',
    'Study Table',
    'Chair',
    'Wardrobe',
    'Hot Water',
    'RO Water'
  ]

  const [imageUrls, setImageUrls] = useState({})

  // Generate and cache object URLs for File objects
  useEffect(() => {
    const urls = {}
    formData.images.forEach((image, index) => {
      if (image instanceof File) {
        urls[index] = URL.createObjectURL(image)
      }
    })

    setImageUrls(urls)

    // Cleanup function
    return () => {
      Object.values(urls).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [formData.images])

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || '',
        description: property.description || '',
        address: property.address?.fullAddress || '',
        price: property.price || '',
        capacity: property.capacity || '',
        amenities: property.amenities || [],
        rules: property.rules || [],
        images: property.images || [],
        latitude: property.location?.latitude || '',
        longitude: property.location?.longitude || '',
        // Load amenitiesDetails if they exist
        foodAvailability: property.amenitiesDetails?.foodAvailability || 'Without food',
        wifi: property.amenitiesDetails?.wifi || 'No',
        ac: property.amenitiesDetails?.ac || 'Non-AC',
        laundry: property.amenitiesDetails?.laundry || 'Not available',
        housekeeping: property.amenitiesDetails?.housekeeping || 'None',
        attachedBathroom: property.amenitiesDetails?.attachedBathroom || 'No',
        parking: property.amenitiesDetails?.parking || 'None'
      })
      if (property.location?.latitude && property.location?.longitude) {
        setLocation({
          lat: property.location.latitude,
          lng: property.location.longitude
        })
      }
    }
  }, [property])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        amenitiesDropdownRef.current &&
        !amenitiesDropdownRef.current.contains(event.target)
      ) {
        setShowAmenitiesDropdown(false)
      }
    }

    if (showAmenitiesDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAmenitiesDropdown])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'rules') {
      setFormData({
        ...formData,
        [name]: value.split(',').map(item => item.trim()).filter(item => item)
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => {
      const currentAmenities = prev.amenities || []
      const isSelected = currentAmenities.includes(amenity)
      return {
        ...prev,
        amenities: isSelected
          ? currentAmenities.filter(a => a !== amenity)
          : [...currentAmenities, amenity]
      }
    })
  }

  const handleLocationSelect = (selectedLocation) => {
    setLocation(selectedLocation)
    setFormData({
      ...formData,
      latitude: selectedLocation.lat.toString(),
      longitude: selectedLocation.lng.toString()
    })
  }

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    // Only add new files, don't duplicate existing ones
    const existingFiles = formData.images.filter(img => img instanceof File)
    const existingPaths = formData.images.filter(img => typeof img === 'string')
    setFormData({ ...formData, images: [...existingPaths, ...existingFiles, ...newFiles] })
    // Reset the input so the same file can be selected again if needed
    e.target.value = ''
  }

  const handleRemoveImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({ ...formData, images: newImages })
  }

  const getImagePreview = (image, index) => {
    if (image instanceof File) {
      return imageUrls[index] || URL.createObjectURL(image)
    }
    // It's a server path
    return getImageUrl(image)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate that location is selected
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a location on the map for your property')
      setLoading(false)
      return
    }

    try {
      const data = new FormData()
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('address', formData.address)
      data.append('price', formData.price)
      data.append('capacity', formData.capacity)
      data.append('amenities', JSON.stringify(formData.amenities))
      data.append('rules', JSON.stringify(formData.rules))
      data.append('latitude', formData.latitude)
      data.append('longitude', formData.longitude)
      // Add structured amenitiesDetails
      data.append('foodAvailability', formData.foodAvailability)
      data.append('wifi', formData.wifi)
      data.append('ac', formData.ac)
      data.append('laundry', formData.laundry)
      data.append('housekeeping', formData.housekeeping)
      data.append('attachedBathroom', formData.attachedBathroom)
      data.append('parking', formData.parking)

      // Separate existing image IDs (strings) from new File objects
      const existingImageIds = formData.images.filter(img => typeof img === 'string')
      const newImageFiles = formData.images.filter(img => img instanceof File)
      
      // Send existing image IDs that should be kept
      if (property && existingImageIds.length > 0) {
        data.append('existingImageIds', JSON.stringify(existingImageIds))
      }
      
      // Send new image files
      if (newImageFiles.length > 0) {
        newImageFiles.forEach(image => {
          data.append('images', image)
        })
      }

      if (property) {
        await api.put(`/properties/${property._id}`, data)
      } else {
        await api.post('/properties', data)
      }

      onSuccess()
    } catch (err) {
      console.error('Property save error:', err)
      
      // Handle network errors
      if (!err.response) {
        setError('Network error: Unable to connect to backend server. Please check if the backend is running.')
        return
      }
      
      // Handle backend errors
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to save property'
      const status = err.response?.status
      
      let detailedError = errorMessage
      if (status === 401) {
        detailedError = 'Authentication failed. Please log in again.'
      } else if (status === 403) {
        detailedError = 'You are not authorized to update this property.'
      } else if (status === 404) {
        detailedError = 'Property not found.'
      } else if (status === 500) {
        detailedError = 'Server error: ' + errorMessage
      } else if (status) {
        detailedError = `Error ${status}: ${errorMessage}`
      }
      
      setError(detailedError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{property ? 'Edit Property' : 'Add New Property'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-input form-textarea"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="address"
              className="form-input"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Property Location (Map) *</label>
            <p className="form-hint">Click on the map or search for an address to set the exact location. This is required.</p>
            <MapLocationPicker
              onLocationSelect={handleLocationSelect}
              initialLocation={location}
              address={formData.address}
            />
            {(!formData.latitude || !formData.longitude) && (
              <p className="form-error-hint" style={{ color: 'var(--error)', fontSize: '14px', marginTop: '8px' }}>
                ⚠ Please select a location on the map
              </p>
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price (₹/month)</label>
              <input
                type="number"
                name="price"
                className="form-input"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input
                type="number"
                name="capacity"
                className="form-input"
                value={formData.capacity}
                onChange={handleChange}
                required
                min="1"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional Amenities</label>
            <div className="amenities-dropdown-container" ref={amenitiesDropdownRef}>
              <button
                type="button"
                className="amenities-dropdown-toggle"
                onClick={() => setShowAmenitiesDropdown(!showAmenitiesDropdown)}
              >
                {formData.amenities.length > 0 
                  ? `${formData.amenities.length} selected` 
                  : 'Select additional amenities'}
                <span className="dropdown-arrow">{showAmenitiesDropdown ? '▲' : '▼'}</span>
              </button>
              {showAmenitiesDropdown && (
                <div className="amenities-checkbox-list">
                  {commonAmenities.map((amenity) => (
                    <label key={amenity} className="amenity-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(amenity)}
                        onChange={() => handleAmenityToggle(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              )}
              {formData.amenities.length > 0 && (
                <div className="selected-amenities-preview">
                  <strong>Selected:</strong> {formData.amenities.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Structured Amenities for Filtering */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              Filterable Amenities (Important for Search)
            </label>
            <p className="form-hint" style={{ marginBottom: '16px' }}>
              These fields help tenants find your property when searching. Make sure to set them correctly.
            </p>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Food Availability</label>
                <select
                  name="foodAvailability"
                  className="form-input"
                  value={formData.foodAvailability}
                  onChange={handleChange}
                  required
                >
                  <option value="With food">With food</option>
                  <option value="Without food">Without food</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Wi-Fi</label>
                <select
                  name="wifi"
                  className="form-input"
                  value={formData.wifi}
                  onChange={handleChange}
                  required
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Air Conditioning</label>
                <select
                  name="ac"
                  className="form-input"
                  value={formData.ac}
                  onChange={handleChange}
                  required
                >
                  <option value="AC">AC</option>
                  <option value="Non-AC">Non-AC</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Laundry Service</label>
                <select
                  name="laundry"
                  className="form-input"
                  value={formData.laundry}
                  onChange={handleChange}
                  required
                >
                  <option value="Available">Available</option>
                  <option value="Not available">Not available</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Housekeeping / Cleaning</label>
                <select
                  name="housekeeping"
                  className="form-input"
                  value={formData.housekeeping}
                  onChange={handleChange}
                  required
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Attached Bathroom</label>
                <select
                  name="attachedBathroom"
                  className="form-input"
                  value={formData.attachedBathroom}
                  onChange={handleChange}
                  required
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Parking</label>
                <select
                  name="parking"
                  className="form-input"
                  value={formData.parking}
                  onChange={handleChange}
                  required
                >
                  <option value="For two-wheelers">For two-wheelers</option>
                  <option value="For four-wheelers">For four-wheelers</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rules (comma-separated)</label>
            <input
              type="text"
              name="rules"
              className="form-input"
              value={formData.rules.join(', ')}
              onChange={handleChange}
              placeholder="No smoking, No pets, etc."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Images</label>
            <input
              type="file"
              name="images"
              className="form-input"
              onChange={handleFileChange}
              multiple
              accept="image/*"
            />
            {formData.images.length > 0 && (
              <div className="image-preview-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                gap: '12px', 
                marginTop: '16px' 
              }}>
                {formData.images.map((image, index) => (
                  <div key={index} className="image-preview-item" style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--beige-50)'
                  }}>
                    <img
                      src={getImagePreview(image, index)}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="image-remove-btn"
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f44336',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="form-hint" style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              You can select multiple images. Click × to remove an image before submitting.
            </p>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : property ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PropertyForm



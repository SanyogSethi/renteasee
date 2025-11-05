import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { getImageUrl } from '../../utils/imageUtils'
import './DashboardPanels.css'

const PendingPropertiesPanel = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState({})

  useEffect(() => {
    fetchPendingProperties()
  }, [])

  const fetchPendingProperties = async () => {
    try {
      const response = await api.get('/admin/properties/pending')
      setProperties(response.data)
    } catch (error) {
      console.error('Error fetching pending properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (propertyId) => {
    try {
      await api.post(`/admin/properties/${propertyId}/approve`)
      alert('Property approved successfully!')
      fetchPendingProperties()
    } catch (error) {
      console.error('Error approving property:', error)
      alert(error.response?.data?.message || 'Failed to approve property')
    }
  }

  const handleReject = async (propertyId) => {
    const reason = rejectReason[propertyId] || ''
    if (!reason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    try {
      await api.post(`/admin/properties/${propertyId}/reject`, { reason })
      alert('Property rejected successfully!')
      setRejectReason({ ...rejectReason, [propertyId]: '' })
      fetchPendingProperties()
    } catch (error) {
      console.error('Error rejecting property:', error)
      alert(error.response?.data?.message || 'Failed to reject property')
    }
  }

  const getPropertyImage = (property) => {
    if (property.images && property.images.length > 0) {
      return getImageUrl(property.images[0])
    }
    return '/-2.jpg'
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="empty-state">
        <p>No pending properties at the moment.</p>
      </div>
    )
  }

  return (
    <div className="pending-properties-panel">
      <div className="panel-header">
        <h2>Pending Properties ({properties.length})</h2>
      </div>
      <div className="pending-properties-list">
        {properties.map(property => (
          <div key={property._id} className="pending-property-item">
            <div className="pending-property-image">
              <img src={getPropertyImage(property)} alt={property.title} />
            </div>
            <div className="pending-property-details">
              <h3>{property.title}</h3>
              <p className="property-owner">
                <strong>Owner:</strong> {property.owner?.name} ({property.owner?.email})
              </p>
              <p className="property-location">
                <strong>Location:</strong> {property.address?.fullAddress || property.address?.city || 'N/A'}
              </p>
              <p className="property-price">
                <strong>Price:</strong> ₹{property.price}/month
              </p>
              <p className="property-capacity">
                <strong>Capacity:</strong> {property.capacity} ({property.availableCapacity} available)
              </p>
              <p className="property-description">{property.description}</p>
              {property.amenities && property.amenities.length > 0 && (
                <div className="property-amenities">
                  <strong>Amenities:</strong> {property.amenities.join(', ')}
                </div>
              )}
            </div>
            <div className="pending-property-actions">
              <div className="reject-reason-input">
                <label>Rejection Reason (optional):</label>
                <textarea
                  value={rejectReason[property._id] || ''}
                  onChange={(e) => setRejectReason({
                    ...rejectReason,
                    [property._id]: e.target.value
                  })}
                  placeholder="Enter reason for rejection..."
                  rows="3"
                />
              </div>
              <div className="property-action-buttons">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(property._id)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(property._id)}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PendingPropertiesPanel


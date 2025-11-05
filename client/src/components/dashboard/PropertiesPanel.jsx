import { useState } from 'react'
import api from '../../utils/api'
import { getImageUrl } from '../../utils/imageUtils'
import PropertyForm from './PropertyForm'
import './DashboardPanels.css'

const PropertiesPanel = ({ properties, onUpdate }) => {
  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return
    
    try {
      await api.delete(`/properties/${id}`)
      onUpdate()
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Failed to delete property')
    }
  }

  const getPropertyImage = (property) => {
    if (property.images && property.images.length > 0) {
      return getImageUrl(property.images[0])
    }
    return '/-2.jpg'
  }

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h2>My Properties</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add New Property
        </button>
      </div>

      {showForm && (
        <PropertyForm
          property={editingProperty}
          onClose={() => {
            setShowForm(false)
            setEditingProperty(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingProperty(null)
            onUpdate()
          }}
        />
      )}

      <div className="properties-list">
        {properties.map(property => {
          const getStatusBadge = () => {
            const status = property.status || 'pending'
            if (status === 'pending') {
              return <span className="property-status pending">Pending Approval</span>
            } else if (status === 'rejected') {
              return <span className="property-status rejected">Rejected</span>
            } else if (status === 'approved') {
              return <span className={`property-status ${property.isAvailable ? 'available' : 'unavailable'}`}>
                {property.isAvailable ? 'Available' : 'Unavailable'}
              </span>
            }
            return <span className="property-status pending">Pending Approval</span>
          }

          return (
            <div key={property._id} className="property-item">
              <div className="property-item-header">
                <div>
                  <h4>{property.title}</h4>
                  <p className="property-location">{property.address?.fullAddress || property.address?.city}</p>
                </div>
                {getStatusBadge()}
              </div>
              {property.status === 'rejected' && property.rejectionReason && (
                <div className="rejection-reason">
                  <strong>Rejection Reason:</strong> {property.rejectionReason}
                </div>
              )}
            <div className="property-image-small">
              <img src={getPropertyImage(property)} alt={property.title} />
            </div>
            <p className="property-price">₹{property.price}/month</p>
            <p className="property-capacity">Capacity: {property.availableCapacity}/{property.capacity}</p>
              <div className="property-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setEditingProperty(property)
                    setShowForm(true)
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(property._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {properties.length === 0 && (
          <p className="empty-state">No properties yet. Add your first property to get started!</p>
        )}
      </div>
    </div>
  )
}

export default PropertiesPanel



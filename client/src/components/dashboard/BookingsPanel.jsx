import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import './DashboardPanels.css'

const BookingsPanel = ({ bookings, onUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState('pending')
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)
  const [expandedBookings, setExpandedBookings] = useState([])
  const { user } = useAuth()

  const handleBookingResponse = async (bookingId, action) => {
    if (!confirm(`Are you sure you want to ${action} this booking?`)) return

    try {
      await api.post(`/bookings/${bookingId}/respond`, { action })
      onUpdate()
    } catch (error) {
      console.error('Error responding to booking:', error)
      alert('Failed to respond to booking')
    }
  }

  const handleOpenRatingModal = (booking) => {
    setSelectedBooking(booking)
    // Always start with default values (only add, not update)
    setRating(5)
    setReview('')
    setShowRatingModal(true)
  }

  const handleSubmitRating = async () => {
    if (!selectedBooking || !rating || rating < 1 || rating > 5) {
      alert('Please select a rating between 1 and 5 stars')
      return
    }

    setSubmittingRating(true)
    try {
      await api.post('/ratings', {
        bookingId: selectedBooking._id,
        rating: rating,
        review: review || null
      })
      alert('Rating submitted successfully!')
      setShowRatingModal(false)
      setSelectedBooking(null)
      onUpdate() // Refresh bookings
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert(error.response?.data?.message || 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  const handleCompleteBooking = async (bookingId) => {
    if (!confirm('Mark this booking as completed? This will allow both parties to rate each other.')) return

    try {
      await api.post(`/bookings/${bookingId}/complete`)
      alert('Booking marked as completed!')
      onUpdate()
    } catch (error) {
      console.error('Error completing booking:', error)
      alert(error.response?.data?.message || 'Failed to complete booking')
    }
  }

  const getBookingList = () => {
    switch (selectedCategory) {
      case 'pending':
        return bookings.pending || []
      case 'future':
        return bookings.future || []
      case 'present':
        return bookings.present || []
      case 'past':
        return bookings.past || []
      default:
        return []
    }
  }

  const bookingList = getBookingList()

  const toggleBookingExpand = (bookingId) => {
    setExpandedBookings(prev => {
      if (prev.includes(bookingId)) {
        return prev.filter(id => id !== bookingId)
      } else {
        return [...prev, bookingId]
      }
    })
  }

  return (
    <div className="bookings-panel">
      <div className="panel-header">
        <h2>Booking Management</h2>
      </div>

      <div className="bookings-tabs">
        <button
          className={`tab-button ${selectedCategory === 'pending' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('pending')}
        >
          Pending ({bookings.pending?.length || 0})
        </button>
        <button
          className={`tab-button ${selectedCategory === 'future' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('future')}
        >
          Future ({bookings.future?.length || 0})
        </button>
        <button
          className={`tab-button ${selectedCategory === 'present' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('present')}
        >
          Present ({bookings.present?.length || 0})
        </button>
        <button
          className={`tab-button ${selectedCategory === 'past' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('past')}
        >
          Past ({bookings.past?.length || 0})
        </button>
      </div>

      <div className="bookings-content">
        <div className="bookings-list">
          {bookingList.map(booking => {
            const isExpanded = expandedBookings.includes(booking._id)
            
            return (
            <div key={booking._id} className="booking-item">
              <div className="booking-header">
                <button
                  className="booking-expand-btn"
                  onClick={() => toggleBookingExpand(booking._id)}
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
                <div className="booking-info">
                  <h4>{booking.property?.title || 'Property'}</h4>
                  <div className="booking-dates">
                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                  </div>
                  <div className="booking-amount">₹{booking.amount}</div>
                  {user.role === 'owner' && booking.tenant && (
                    <div className="booking-rating">
                      <span>Tenant Rating: </span>
                      {booking.tenantRating ? (
                        <>
                          <div className="stars">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`star ${star <= booking.tenantRating ? 'filled' : ''}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span>({booking.tenantRating}/5)</span>
                        </>
                      ) : (
                        <span className="not-rated-text">Not yet rated</span>
                      )}
                    </div>
                  )}
                  {user.role === 'tenant' && booking.owner && (
                    <div className="booking-rating">
                      <span>Owner Rating: </span>
                      {booking.ownerRating ? (
                        <>
                          <div className="stars">
                            {[1, 2, 3, 4, 5].map(star => (
                              <span key={star} className={`star ${star <= booking.ownerRating ? 'filled' : ''}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          <span>({booking.ownerRating}/5)</span>
                        </>
                      ) : (
                        <span className="not-rated-text">Not yet rated</span>
                      )}
                      {booking.ownerReview && (
                        <div className="booking-review">
                          <p><em>"{booking.ownerReview}"</em></p>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="booking-status">Status: <strong>{booking.status}</strong></p>
                </div>
                <div className="booking-actions">
                  {user.role === 'owner' && booking.status === 'pending' && (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleBookingResponse(booking._id, 'accept')}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleBookingResponse(booking._id, 'reject')}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {/* Complete Booking Button - for accepted bookings that have ended */}
                  {booking.status === 'accepted' && new Date(booking.endDate) < new Date() && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCompleteBooking(booking._id)}
                    >
                      Mark as Completed
                    </button>
                  )}
                  
                  {/* Rate Button - for completed bookings without existing rating */}
                  {booking.status === 'completed' && (
                    <>
                      {(user.role === 'tenant' && !booking.ownerRating) && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenRatingModal(booking)}
                        >
                          Rate Owner
                        </button>
                      )}
                      {(user.role === 'owner' && !booking.tenantRating) && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenRatingModal(booking)}
                        >
                          Rate Tenant
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Expanded Details Section */}
              {isExpanded && (
                <div className="booking-details-expanded">
                  {/* Show user's own rating */}
                  {user.role === 'owner' && (
                    <div className="contact-details">
                      <h5>Your Rating (Given by Tenant)</h5>
                      <div className="contact-info">
                        {booking.ownerRating ? (
                          <>
                            <div className="rating-display">
                              <div className="stars">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <span key={star} className={`star ${star <= booking.ownerRating ? 'filled' : ''}`}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="rating-value">({booking.ownerRating}/5)</span>
                            </div>
                            {booking.ownerReview && (
                              <p className="rating-review"><em>"{booking.ownerReview}"</em></p>
                            )}
                          </>
                        ) : (
                          <p className="not-rated-text">Not yet rated</p>
                        )}
                      </div>
                    </div>
                  )}
                  {user.role === 'tenant' && (
                    <div className="contact-details">
                      <h5>Your Rating (Given by Owner)</h5>
                      <div className="contact-info">
                        {booking.tenantRating ? (
                          <>
                            <div className="rating-display">
                              <div className="stars">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <span key={star} className={`star ${star <= booking.tenantRating ? 'filled' : ''}`}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="rating-value">({booking.tenantRating}/5)</span>
                            </div>
                            {booking.tenantReview && (
                              <p className="rating-review"><em>"{booking.tenantReview}"</em></p>
                            )}
                          </>
                        ) : (
                          <p className="not-rated-text">Not yet rated</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Show contact details */}
                  {user.role === 'owner' && booking.tenant && (
                    <div className="contact-details">
                      <h5>Tenant Details</h5>
                      <div className="contact-info">
                        <p><strong>Name:</strong> {booking.tenant.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {booking.tenant.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {booking.tenant.phone || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                  {user.role === 'tenant' && booking.owner && (
                    <div className="contact-details">
                      <h5>Owner Details</h5>
                      <div className="contact-info">
                        <p><strong>Name:</strong> {booking.owner.name || 'N/A'}</p>
                        <p><strong>Email:</strong> {booking.owner.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> {booking.owner.phone || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
          })}
          {bookingList.length === 0 && (
            <p className="empty-state">No {selectedCategory} bookings</p>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedBooking && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rate {user.role === 'tenant' ? selectedBooking.owner?.name : selectedBooking.tenant?.name}</h2>
              <button className="close-btn" onClick={() => setShowRatingModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">
                Booking: <strong>{selectedBooking.property?.title || 'Property'}</strong>
              </p>
              <p className="modal-subtitle">
                Period: {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()}
              </p>
              
              <div className="form-group">
                <label className="form-label">Rating (1-5 stars)</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`star-button ${star <= rating ? 'selected' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-value">{rating} / 5</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Review (Optional)</label>
                <textarea
                  className="form-input form-textarea"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Share your experience..."
                  rows="4"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitRating}
                disabled={submittingRating || rating < 1 || rating > 5}
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingsPanel



import { useState, useEffect } from 'react'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import './DashboardPanels.css'

const RatingsPanel = ({ ratings = null, userId = null }) => {
  const [ratingsList, setRatingsList] = useState(ratings || [])
  const [averageRating, setAverageRating] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ratings) {
      if (userId) {
        fetchRatings(userId)
      } else {
        // Admin view - fetch all ratings
        fetchAllRatings()
      }
    } else {
      setRatingsList(ratings)
    }
  }, [ratings, userId])

  const fetchAllRatings = async () => {
    try {
      const response = await api.get('/admin/ratings')
      setRatingsList(response.data)
    } catch (error) {
      console.error('Error fetching all ratings:', error)
    }
  }

  const fetchRatings = async (id) => {
    try {
      const response = await api.get(`/ratings/user/${id}`)
      setRatingsList(response.data.ratings)
      setAverageRating(response.data.averageRating)
    } catch (error) {
      console.error('Error fetching ratings:', error)
    }
  }

  return (
    <div className="ratings-panel">
      <h2>Ratings & Reviews</h2>
      {averageRating > 0 && (
        <div className="average-rating">
          <h3>Average Rating: {averageRating}/5</h3>
          <div className="stars">
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className={`star ${star <= averageRating ? 'filled' : ''}`}>
                ★
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="ratings-list">
        {ratingsList.map(rating => (
          <div key={rating._id} className="rating-item">
            <div className="rating-header">
              <h4>{rating.ratedBy?.name || 'Anonymous'}</h4>
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <span key={star} className={`star ${star <= rating.rating ? 'filled' : ''}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>
            {rating.review && (
              <p className="rating-review">{rating.review}</p>
            )}
            <p className="rating-date">
              {new Date(rating.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {ratingsList.length === 0 && (
          <p className="empty-state">No ratings yet</p>
        )}
      </div>
    </div>
  )
}

export default RatingsPanel


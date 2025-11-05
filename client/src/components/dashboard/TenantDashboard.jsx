import { useState, useEffect } from 'react'
import api from '../../utils/api'
import ChatPanel from '../chat/ChatPanel'
import BookingsPanel from './BookingsPanel'
import RatingsPanel from './RatingsPanel'
import './DashboardPanels.css'

const TenantDashboard = ({ activeChat }) => {
  const [activeTab, setActiveTab] = useState(activeChat ? 'chats' : 'overview')
  const [chats, setChats] = useState([])
  const [bookings, setBookings] = useState({ past: [], present: [], future: [], pending: [] })
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeChat) {
      setActiveTab('chats')
    }
    fetchData()
  }, [activeChat])

  const fetchData = async () => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('user'))
      const [chatsRes, bookingsRes, ratingsRes] = await Promise.all([
        api.get('/chats'),
        api.get('/bookings'),
        api.get(`/ratings/user/${user?.id}`).catch(() => ({ data: { ratings: [] } }))
      ])
      setChats(chatsRes.data || [])
      setBookings(bookingsRes.data || { past: [], present: [], future: [], pending: [] })
      setRatings(ratingsRes.data?.ratings || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'chats', label: 'Chats' },
    { id: 'bookings', label: 'My Bookings' },
    { id: 'ratings', label: 'Ratings' }
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tenant Dashboard</h1>
        <p>Manage your bookings and communications</p>
      </div>

      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="overview-panel">
                <div className="dashboard-grid">
                  <div className="dashboard-card">
                    <h3>Active Chats</h3>
                    <div className="dashboard-card-value">{chats.length}</div>
                    <div className="dashboard-card-label">Ongoing conversations</div>
                  </div>
                  <div className="dashboard-card">
                    <h3>Bookings</h3>
                    <div className="dashboard-card-value">{bookings.present.length + bookings.future.length}</div>
                    <div className="dashboard-card-label">Active bookings</div>
                  </div>
                  <div className="dashboard-card">
                    <h3>Pending</h3>
                    <div className="dashboard-card-value">{bookings.pending.length}</div>
                    <div className="dashboard-card-label">Awaiting approval</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chats' && (
              <ChatPanel chats={chats} activeChat={activeChat} onChatUpdate={fetchData} />
            )}

            {activeTab === 'bookings' && (
              <BookingsPanel bookings={bookings} onUpdate={fetchData} />
            )}

            {activeTab === 'ratings' && (
              <RatingsPanel ratings={ratings} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TenantDashboard



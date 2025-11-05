import { useState, useEffect } from 'react'
import api from '../../utils/api'
import ChatPanel from '../chat/ChatPanel'
import PropertiesPanel from './PropertiesPanel'
import BookingsPanel from './BookingsPanel'
import NotificationsPanel from './NotificationsPanel'
import './DashboardPanels.css'

const OwnerDashboard = ({ activeChat }) => {
  const [activeTab, setActiveTab] = useState(activeChat ? 'chats' : 'overview')
  const [chats, setChats] = useState([])
  const [properties, setProperties] = useState([])
  const [bookings, setBookings] = useState({ past: [], present: [], future: [], pending: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeChat) {
      setActiveTab('chats')
    }
    fetchData()
  }, [activeChat])

  const fetchData = async () => {
    try {
      const [chatsRes, propertiesRes, bookingsRes] = await Promise.all([
        api.get('/chats'),
        api.get('/properties/owner/my-properties'),
        api.get('/bookings')
      ])
      setChats(chatsRes.data)
      setProperties(propertiesRes.data)
      setBookings(bookingsRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'properties', label: 'My Properties' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'chats', label: 'Chats' },
    { id: 'notifications', label: 'Notifications' }
  ]

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Owner Dashboard</h1>
        <p>Manage your properties and bookings</p>
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
        {activeTab === 'overview' && (
          <div className="overview-panel">
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Properties</h3>
                <div className="dashboard-card-value">{properties.length}</div>
                <div className="dashboard-card-label">Total listings</div>
              </div>
              <div className="dashboard-card">
                <h3>Pending Bookings</h3>
                <div className="dashboard-card-value">{bookings.pending.length}</div>
                <div className="dashboard-card-label">Awaiting your response</div>
              </div>
              <div className="dashboard-card">
                <h3>Active Bookings</h3>
                <div className="dashboard-card-value">{bookings.present.length + bookings.future.length}</div>
                <div className="dashboard-card-label">Current bookings</div>
              </div>
              <div className="dashboard-card">
                <h3>Active Chats</h3>
                <div className="dashboard-card-value">{chats.length}</div>
                <div className="dashboard-card-label">Ongoing conversations</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <PropertiesPanel properties={properties} onUpdate={fetchData} />
        )}

        {activeTab === 'bookings' && (
          <BookingsPanel bookings={bookings} onUpdate={fetchData} />
        )}

        {activeTab === 'chats' && (
          <ChatPanel chats={chats} activeChat={activeChat} onChatUpdate={fetchData} />
        )}

        {activeTab === 'notifications' && (
          <NotificationsPanel />
        )}
      </div>
    </div>
  )
}

export default OwnerDashboard



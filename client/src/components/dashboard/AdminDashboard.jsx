import { useState, useEffect } from 'react'
import api from '../../utils/api'
import UsersPanel from './UsersPanel'
import RatingsPanel from './RatingsPanel'
import PendingPropertiesPanel from './PendingPropertiesPanel'
import './DashboardPanels.css'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setSummary(response.data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending-properties', label: `Pending Properties${summary.pendingProperties > 0 ? ` (${summary.pendingProperties})` : ''}` },
    { id: 'users', label: 'Users' },
    { id: 'ratings', label: 'Ratings' }
  ]

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage the platform</p>
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
        {activeTab === 'dashboard' && (
          <div className="overview-panel">
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Total Users</h3>
                <div className="dashboard-card-value">{summary.totalUsers || 0}</div>
                <div className="dashboard-card-label">
                  {summary.totalTenants || 0} tenants, {summary.totalOwners || 0} owners
                </div>
              </div>
              <div className="dashboard-card">
                <h3>Properties</h3>
                <div className="dashboard-card-value">{summary.totalProperties || 0}</div>
                <div className="dashboard-card-label">
                  {summary.approvedProperties || 0} approved, {summary.pendingProperties || 0} pending
                </div>
                {summary.pendingProperties > 0 && (
                  <div className="dashboard-card-alert" style={{ marginTop: '8px', color: '#f57c00', fontSize: '14px', fontWeight: '500' }}>
                    ⚠ {summary.pendingProperties} property{summary.pendingProperties > 1 ? 'ies' : ''} awaiting approval
                  </div>
                )}
              </div>
              <div className="dashboard-card">
                <h3>Bookings</h3>
                <div className="dashboard-card-value">{summary.totalBookings || 0}</div>
                <div className="dashboard-card-label">
                  {summary.activeBookings || 0} active, {summary.pendingBookings || 0} pending
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pending-properties' && (
          <PendingPropertiesPanel />
        )}

        {activeTab === 'users' && (
          <UsersPanel />
        )}

        {activeTab === 'ratings' && (
          <RatingsPanel />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard


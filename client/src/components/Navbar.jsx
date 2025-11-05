import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { format } from 'date-fns'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotification()
  const [showNotifications, setShowNotifications] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const notificationRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      // Close mobile menu when clicking outside
      if (mobileMenuOpen && !event.target.closest('.navbar-menu') && !event.target.closest('.mobile-menu-toggle')) {
        setMobileMenuOpen(false)
      }
    }

    if (showNotifications || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Refresh notifications when dropdown opens
      if (showNotifications) {
        fetchNotifications()
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotifications, mobileMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id)
    }
    setShowNotifications(false)
    setMobileMenuOpen(false)
    
    // Navigate based on notification type
    if (notification.type === 'property_pending' || notification.type === 'property_approved' || notification.type === 'property_rejected') {
      navigate('/dashboard?tab=pending-properties')
    } else if (notification.type === 'new_chat' || notification.type === 'new_message') {
      navigate(`/dashboard?chat=${notification.relatedId}`)
    } else if (notification.type === 'booking_request' || notification.type === 'booking_accepted' || notification.type === 'booking_rejected') {
      navigate('/dashboard?tab=bookings')
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <img src="/RENTEASE.jpg" alt="RentEase" className="logo-img" />
          <span>RentEase</span>
        </Link>

        <button 
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Homepage</Link>
              <Link to="/dashboard" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              
              {/* Notification Dropdown */}
              <div className="notification-wrapper" ref={notificationRef}>
                <button
                  className="notification-bell"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Notifications"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          className="btn-mark-all-read"
                          onClick={handleMarkAllAsRead}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="notification-dropdown-list">
                      {notifications.length === 0 ? (
                        <div className="notification-empty">
                          <p>No notifications</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map(notification => (
                          <div
                            key={notification._id}
                            className={`notification-dropdown-item ${!notification.isRead ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="notification-item-content">
                              <h4>{notification.title}</h4>
                              <p>{notification.message}</p>
                              <span className="notification-item-time">
                                {format(new Date(notification.createdAt), 'PPp')}
                              </span>
                            </div>
                            {!notification.isRead && (
                              <span className="notification-dot"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 10 && (
                      <div className="notification-dropdown-footer">
                        <Link to="/dashboard?tab=notifications" onClick={() => setShowNotifications(false)}>
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="user-menu">
                <span className="user-name">{user.name}</span>
                <span className="user-role">({user.role})</span>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

import { useState, useEffect } from 'react'
import { useNotification } from '../../context/NotificationContext'
import { format } from 'date-fns'
import './DashboardPanels.css'

const NotificationsPanel = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotification()
  const [localNotifications, setLocalNotifications] = useState(notifications)

  useEffect(() => {
    setLocalNotifications(notifications)
  }, [notifications])

  const handleMarkAsRead = async (id) => {
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="notifications-panel">
      <div className="panel-header">
        <h2>Notifications</h2>
        {localNotifications.some(n => !n.isRead) && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {localNotifications.map(notification => (
          <div
            key={notification._id}
            className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
            onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
          >
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <span className="notification-time">
                {format(new Date(notification.createdAt), 'PPp')}
              </span>
            </div>
            {!notification.isRead && (
              <span className="unread-indicator"></span>
            )}
          </div>
        ))}
        {localNotifications.length === 0 && (
          <p className="empty-state">No notifications</p>
        )}
      </div>
    </div>
  )
}

export default NotificationsPanel



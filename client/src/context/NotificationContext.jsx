import { createContext, useContext, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import api from '../utils/api'
import { getApiBaseUrl } from '../utils/imageUtils'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null
    
    if (user) {
      fetchNotifications()
      
      // Connect to socket - use API base URL
      const socketUrl = getApiBaseUrl()
      const newSocket = io(socketUrl, {
        transports: ['websocket'],
        query: {
          userId: user.id
        }
      })
      
      newSocket.on('connect', () => {
        console.log('Socket connected')
        // Join user's room for notifications
        newSocket.emit('join-user-room', user.id)
      })

      newSocket.on('new-notification', (data) => {
        console.log('Received new notification:', data)
        // Add notification to the list
        setNotifications(prev => {
          // Check if notification already exists (prevent duplicates)
          const exists = prev.some(n => 
            n._id === data._id || 
            (n.type === data.type && 
             n.message === data.message && 
             n.relatedId?.toString() === data.relatedId?.toString() &&
             Date.now() - new Date(n.createdAt).getTime() < 5000)
          )
          if (exists) return prev
          // Add new notification at the beginning
          return [data, ...prev]
        })
        setUnreadCount(prev => prev + 1)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications')
      setNotifications(response.data)
      
      const countResponse = await api.get('/notifications/unread-count')
      setUnreadCount(countResponse.data.count)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        socket
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

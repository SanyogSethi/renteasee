import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import api from '../../utils/api'
import { getImageUrl } from '../../utils/imageUtils'
import './ChatWindow.css'

const ChatWindow = ({ chat, onClose, onUpdate }) => {
  const [messages, setMessages] = useState(chat?.messages || [])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [zoomedImage, setZoomedImage] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [hasScrolledInitially, setHasScrolledInitially] = useState(false)
  const { user } = useAuth()
  const { socket } = useNotification()
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const zoomedImageRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Safety check - don't render if chat is null/undefined
  if (!chat) {
    return null
  }

  const scrollToBottom = useCallback((immediate = false) => {
    if (messagesContainerRef.current) {
      // Scroll only the messages container, not the entire page
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    } else if (messagesEndRef.current) {
      const messagesContainer = messagesEndRef.current.closest('.chat-messages')
      if (messagesContainer) {
        messagesContainerRef.current = messagesContainer
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      } else {
        // Fallback - prevent page scroll by using block: 'end' and inline: 'nearest'
        messagesEndRef.current.scrollIntoView({ 
          behavior: immediate ? 'auto' : 'smooth',
          block: 'end',
          inline: 'nearest'
        })
      }
    }
  }, [])

  useEffect(() => {
    if (chat && chat.messages) {
      // Always reset messages when chat changes
      setMessages(chat.messages)
      setHasScrolledInitially(false)
      // Reset zoom state when switching chats
      setZoomedImage(null)
      setZoomLevel(1)
    } else if (chat && (!chat.messages || chat.messages.length === 0)) {
      // If chat has no messages, clear the messages array
      setMessages([])
      setHasScrolledInitially(false)
    }
  }, [chat?._id]) // Use chat._id as dependency to detect chat changes

  useEffect(() => {
    // Only scroll if we have messages and haven't scrolled initially yet
    // This prevents scrolling when chat first opens
    if (messages.length > 0 && !hasScrolledInitially) {
      const timer = setTimeout(() => {
        scrollToBottom(true)
        setHasScrolledInitially(true)
      }, 200)
      return () => clearTimeout(timer)
    } else if (messages.length > 0 && hasScrolledInitially) {
      // For new messages after initial load, scroll smoothly
      const timer = setTimeout(() => {
        scrollToBottom(false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [messages.length, hasScrolledInitially, scrollToBottom])

  useEffect(() => {
    if (socket && chat && chat._id) {
      // Join the chat room
      socket.emit('join-chat', chat._id.toString())
      
      const handleNewMessage = (data) => {
        if (data.chatId === chat._id.toString() || data.chatId === chat._id) {
          // Check if message already exists (avoid duplicates)
          setMessages(prev => {
            const messageId = data.message._id || data.message.timestamp
            const exists = prev.some(msg => 
              (msg._id && msg._id === messageId) || 
              (msg.timestamp === data.message.timestamp && msg.content === data.message.content)
            )
            if (exists) return prev
            return [...prev, data.message]
          })
        }
      }
      
      socket.on('new-message', handleNewMessage)

      return () => {
        socket.off('new-message', handleNewMessage)
        socket.emit('leave-chat', chat._id.toString())
      }
    }
  }, [socket, chat?._id])

  useEffect(() => {
    // Prevent page scroll when chat opens/changes
    const originalScrollY = window.scrollY
    
    // Prevent scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    
    // Reset scroll position if it changed (only on mobile)
    const checkScroll = () => {
      if (window.innerWidth <= 768 && window.scrollY !== originalScrollY) {
        window.scrollTo(0, originalScrollY)
      }
    }
    
    // Check scroll position after a short delay
    const timer = setTimeout(checkScroll, 100)
    
    return () => {
      clearTimeout(timer)
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [chat?._id])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chat || !chat._id) return
    
    const fileValue = fileInputRef.current?.files?.[0]
    const isImageMessage = !!fileValue
    const messageContent = newMessage.trim()
    
    if (!messageContent && !isImageMessage) return

    setSending(true)
    
    // Create optimistic message to show immediately (only for text messages)
    let tempMessage = null
    if (!isImageMessage && messageContent) {
      tempMessage = {
        sender: user.id,
        content: messageContent,
        type: 'text',
        timestamp: new Date().toISOString(),
        _tempId: Date.now() // Temporary ID for optimistic update
      }
      // Optimistically add message to UI immediately
      setMessages(prev => [...prev, tempMessage])
      setNewMessage('')
    }
    
    try {
      const formData = new FormData()
      if (isImageMessage && fileValue) {
        formData.append('image', fileValue)
        // Reset file input after appending
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        formData.append('content', messageContent)
      }

      const response = await api.post(`/chats/${chat._id}/message`, formData)
      
      // Replace optimistic message with real message from server
      // The socket will also receive it, but we want to ensure it's updated immediately
      if (tempMessage) {
        setMessages(prev => {
          const filtered = prev.filter(msg => msg._tempId !== tempMessage._tempId)
          // Check if message already exists from socket
          const exists = filtered.some(msg => 
            (msg._id && msg._id === response.data._id) ||
            (msg.content === response.data.content && 
             Math.abs(new Date(msg.timestamp) - new Date(response.data.timestamp)) < 1000)
          )
          if (!exists) {
            return [...filtered, response.data]
          }
          return filtered
        })
      } else {
        // For image messages, add directly (no optimistic update)
        setMessages(prev => {
          const exists = prev.some(msg => 
            (msg._id && msg._id === response.data._id) ||
            (msg.type === 'image' && msg.imageUrl === response.data.imageUrl)
          )
          if (!exists) {
            return [...prev, response.data]
          }
          return prev
        })
      }

      // Update chat list
      if (onUpdate) {
        onUpdate()
      }
      
      // Scroll to bottom after sending message
      setTimeout(() => scrollToBottom(), 100)
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      if (tempMessage) {
        setMessages(prev => prev.filter(msg => msg._tempId !== tempMessage._tempId))
        // Restore message input
        setNewMessage(tempMessage.content)
      }
      alert(error.response?.data?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!chat || !chat._id) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      e.target.value = ''
      return
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      e.target.value = ''
      return
    }
    
    // Auto-send the image
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await api.post(`/chats/${chat._id}/message`, formData)
      
      // Add message to UI
      setMessages(prev => {
        const exists = prev.some(msg => 
          (msg._id && msg._id === response.data._id) ||
          (msg.type === 'image' && msg.imageUrl === response.data.imageUrl)
        )
        if (!exists) {
          return [...prev, response.data]
        }
        return prev
      })
      
      // Update chat list
      if (onUpdate) {
        onUpdate()
      }
      
      // Scroll to bottom after sending image
      setTimeout(() => scrollToBottom(), 100)
      
      // Reset file input
      e.target.value = ''
    } catch (error) {
      console.error('Error sending image:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send image'
      alert(errorMessage)
      e.target.value = ''
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  const handleImageClick = (imageUrl) => {
    setZoomedImage(imageUrl)
    setZoomLevel(1)
  }

  const handleCloseZoom = () => {
    setZoomedImage(null)
    setZoomLevel(1)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 5))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  const handleWheelZoom = useCallback((e) => {
    if (zoomedImage && e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoomLevel(prev => Math.max(0.5, Math.min(5, prev + delta)))
    }
  }, [zoomedImage])

  useEffect(() => {
    if (zoomedImage) {
      document.addEventListener('wheel', handleWheelZoom, { passive: false })
      
      // Handle Escape key to close zoom
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCloseZoom()
        }
      }
      document.addEventListener('keydown', handleEscape)
      
      return () => {
        document.removeEventListener('wheel', handleWheelZoom)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [zoomedImage, handleWheelZoom])

  const otherUser = user?.role === 'tenant' ? chat?.owner : chat?.tenant

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <h3>{otherUser?.name || 'Unknown User'}</h3>
          {chat.property && (
            <p className="chat-property-name">{chat.property.title}</p>
          )}
        </div>
        <div className="chat-header-actions">
          <button className="btn btn-outline btn-sm" onClick={handleClose}>
            Close Chat
          </button>
        </div>
      </div>

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((message, idx) => {
          const senderId = typeof message.sender === 'object' ? message.sender._id : message.sender
          const isOwn = senderId === user.id || message.sender === user.id
          const hasImage = message.type === 'image'
          return (
            <div key={idx} className={`message ${isOwn ? 'own' : 'other'} ${hasImage ? 'has-image' : ''}`}>
              {hasImage ? (
                <>
                  <img
                    src={getImageUrl(message.imageUrl)}
                    alt="Shared"
                    className="message-image"
                    onClick={() => handleImageClick(message.imageUrl)}
                    onError={(e) => {
                      console.error('Failed to load chat image:', message.imageUrl);
                      // Replace with default image on error
                      e.target.src = '/-2.jpg';
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              ) : (
                <>
                  <p className="message-content">{message.content}</p>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {!chat.isClosed && (
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="attachment-btn"
            onClick={handleImageUpload}
            aria-label="Attach image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <input
            type="text"
            className="chat-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={sending || !newMessage.trim()}
            aria-label="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      )}

      {chat.isClosed && (
        <div className="chat-closed">
          <p>This chat has been closed</p>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="image-zoom-modal" onClick={handleCloseZoom}>
          <div className="image-zoom-container" onClick={(e) => e.stopPropagation()}>
            <div className="image-zoom-header">
              <button className="zoom-control-btn" onClick={handleZoomOut} title="Zoom Out">
                ➖
              </button>
              <button className="zoom-control-btn" onClick={handleResetZoom} title="Reset Zoom">
                🔍
              </button>
              <button className="zoom-control-btn" onClick={handleZoomIn} title="Zoom In">
                ➕
              </button>
              <button className="zoom-close-btn" onClick={handleCloseZoom} title="Close">
                ×
              </button>
            </div>
            <div className="image-zoom-content">
                <img
                  ref={zoomedImageRef}
                  src={getImageUrl(zoomedImage)}
                  alt="Zoomed"
                  className="zoomed-image"
                  onError={(e) => {
                    console.error('Failed to load zoomed image:', zoomedImage);
                    e.target.src = '/-2.jpg';
                  }}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.1s ease-out'
                  }}
                  draggable={false}
                />
            </div>
            <div className="image-zoom-footer">
              <span className="zoom-level-indicator">Zoom: {Math.round(zoomLevel * 100)}%</span>
              <span className="zoom-hint">Hold Ctrl and scroll to zoom</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatWindow


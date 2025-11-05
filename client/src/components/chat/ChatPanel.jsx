import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import api from '../../utils/api'
import ChatWindow from './ChatWindow'
import PriceProposal from './PriceProposal'
import BookingCalendar from '../calendar/BookingCalendar'
import './ChatPanel.css'

const ChatPanel = ({ chats = [], activeChat, onChatUpdate }) => {
  const [selectedChat, setSelectedChat] = useState(null)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const { socket } = useNotification()
  const onChatUpdateRef = useRef(onChatUpdate)
  const fetchingChatRef = useRef(false)
  const joinedChatIdRef = useRef(null) // Track which chat we've joined to prevent re-joins
  const manualSelectionRef = useRef(false) // Track if user manually selected a chat
  
  // Safety check
  if (!user) {
    return (
      <div className="chat-panel">
        <div className="loading-container">
          <p>Loading...</p>
        </div>
      </div>
    )
  }
  
  // Ensure chats is always an array - memoize to prevent unnecessary re-renders
  const safeChats = useMemo(() => Array.isArray(chats) ? chats : [], [chats])
  
  // Keep ref updated
  useEffect(() => {
    onChatUpdateRef.current = onChatUpdate
  }, [onChatUpdate])

  const fetchChatById = useCallback(async (chatId) => {
    if (fetchingChatRef.current) return // Prevent concurrent fetches
    
    try {
      fetchingChatRef.current = true
      const response = await api.get(`/chats/${chatId}`)
      const chat = response.data
      // Only set selected chat if it's not closed
      if (chat && !chat.isClosed) {
        setSelectedChat(chat)
      } else {
        // Chat is closed or doesn't exist, clear selection
        setSelectedChat(null)
      }
      // Don't refresh chat list here to avoid loops - let parent handle it
    } catch (error) {
      console.error('Error fetching chat:', error)
      // On error, clear selection to prevent issues
      setSelectedChat(null)
    } finally {
      fetchingChatRef.current = false
    }
  }, [])

  useEffect(() => {
    // Don't run if user manually selected a chat
    if (manualSelectionRef.current) {
      return
    }
    
    if (activeChat) {
      const chat = safeChats.find(c => c._id === activeChat || c._id?.toString() === activeChat?.toString())
      if (chat && !chat.isClosed) {
        setSelectedChat(prev => {
          // Only update if different from current selection
          if (!prev || prev._id?.toString() !== chat._id?.toString()) {
            // If chat doesn't have messages, fetch full data
            if (!chat.messages || chat.messages.length === 0) {
              fetchChatById(chat._id)
              return prev // Keep previous selection while fetching
            }
            return chat
          }
          return prev
        })
      } else if (chat && chat.isClosed) {
        // Don't select closed chats
        setSelectedChat(null)
      } else {
        // Fetch the chat directly if not in the list yet
        fetchChatById(activeChat)
      }
    } else if (safeChats.length > 0 && !activeChat && !selectedChat) {
      // Only auto-select first non-closed chat if no activeChat is set AND no chat is currently selected
      const firstOpenChat = safeChats.find(c => !c.isClosed)
      if (firstOpenChat) {
        // If chat doesn't have messages, fetch full data first
        if (!firstOpenChat.messages || firstOpenChat.messages.length === 0) {
          fetchChatById(firstOpenChat._id)
        } else {
          setSelectedChat(firstOpenChat)
        }
      }
    } else if (safeChats.length === 0) {
      // No chats available, clear selected chat
      setSelectedChat(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat, safeChats.length])

  // Update selectedChat when chats list updates (to get latest booking/proposal data)
  // Only update if selectedChat exists and is still in the chats list
  // Use a ref to track previous chats to avoid unnecessary updates
  const prevChatsRef = useRef(safeChats)
  
  useEffect(() => {
    // If no chat is selected and we have chats, select the first open one
    // BUT only if user hasn't manually selected a chat
    if (!selectedChat || !selectedChat._id) {
      // Reset manual selection flag if no chat is selected
      manualSelectionRef.current = false
      
      if (safeChats.length > 0) {
        const firstOpenChat = safeChats.find(c => !c.isClosed)
        if (firstOpenChat) {
          // If chat doesn't have messages, fetch full data
          if (!firstOpenChat.messages || firstOpenChat.messages.length === 0) {
            fetchChatById(firstOpenChat._id)
          } else {
            setSelectedChat(firstOpenChat)
          }
        }
      }
      prevChatsRef.current = safeChats
      return
    }
    
    // If user manually selected a chat, don't override it
    if (manualSelectionRef.current) {
      prevChatsRef.current = safeChats
      return
    }
    
    if (safeChats.length === 0) {
      // Chats list is empty, clear selection
      setSelectedChat(null)
      prevChatsRef.current = safeChats
      return
    }
    
    const updatedChat = safeChats.find(c => c._id?.toString() === selectedChat._id?.toString())
    if (!updatedChat) {
      // Selected chat no longer exists in the list (might have been closed/deleted)
      // Try to select the first open chat
      manualSelectionRef.current = false // Reset flag
      const firstOpenChat = safeChats.find(c => !c.isClosed)
      if (firstOpenChat) {
        if (!firstOpenChat.messages || firstOpenChat.messages.length === 0) {
          fetchChatById(firstOpenChat._id)
        } else {
          setSelectedChat(firstOpenChat)
        }
      } else {
        setSelectedChat(null)
      }
      prevChatsRef.current = safeChats
      return
    }
    
    // If the chat was closed, try to select another open chat
    if (updatedChat.isClosed) {
      manualSelectionRef.current = false // Reset flag
      const firstOpenChat = safeChats.find(c => !c.isClosed)
      if (firstOpenChat) {
        if (!firstOpenChat.messages || firstOpenChat.messages.length === 0) {
          fetchChatById(firstOpenChat._id)
        } else {
          setSelectedChat(firstOpenChat)
        }
      } else {
        setSelectedChat(null)
      }
      prevChatsRef.current = safeChats
      return
    }
    
    // Find the previous version of this chat
    const prevChat = prevChatsRef.current.find(c => c._id?.toString() === selectedChat._id?.toString())
    
    // Only update if booking or priceProposal changed (not messages to avoid loops)
    const bookingChanged = prevChat ? JSON.stringify(updatedChat.booking) !== JSON.stringify(prevChat.booking) : updatedChat.booking !== selectedChat.booking
    const proposalChanged = prevChat ? JSON.stringify(updatedChat.priceProposal) !== JSON.stringify(prevChat.priceProposal) : JSON.stringify(updatedChat.priceProposal) !== JSON.stringify(selectedChat.priceProposal)
    
    if (bookingChanged || proposalChanged) {
      setSelectedChat(updatedChat)
    }
    
    prevChatsRef.current = safeChats
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeChats])

  useEffect(() => {
    if (socket && selectedChat && selectedChat._id) {
      const chatId = selectedChat._id.toString()
      
      // Only join if we haven't already joined this chat
      if (joinedChatIdRef.current !== chatId) {
        // Leave previous chat if we were in one
        if (joinedChatIdRef.current) {
          socket.emit('leave-chat', joinedChatIdRef.current)
        }
        
        console.log('Joining chat:', chatId)
        socket.emit('join-chat', chatId)
        joinedChatIdRef.current = chatId
      }
      
      // Listen for price proposal updates
      const handlePriceProposalUpdate = (proposalData) => {
        setSelectedChat(prev => {
          if (!prev) return prev
          const proposalChatId = proposalData.chatId
          if (!proposalChatId || prev._id.toString() !== proposalChatId.toString()) return prev
          
          // Extract proposal from data
          const proposal = proposalData.status ? {
            proposedBy: proposalData.proposedBy,
            amount: proposalData.amount,
            startDate: proposalData.startDate,
            endDate: proposalData.endDate,
            status: proposalData.status
          } : null
          
          return {
            ...prev,
            priceProposal: proposal
          }
        })
        // Also refresh chat list
        if (onChatUpdateRef.current) {
          onChatUpdateRef.current()
        }
      }
      
      socket.on('price-proposal-updated', handlePriceProposalUpdate)
      
      return () => {
        // Only leave if this is still the current chat
        if (joinedChatIdRef.current === chatId) {
          console.log('Leaving chat:', chatId)
          socket.off('price-proposal-updated', handlePriceProposalUpdate)
          socket.emit('leave-chat', chatId)
          joinedChatIdRef.current = null
        }
      }
    } else if (!selectedChat && joinedChatIdRef.current) {
      // Clear joined chat if no chat is selected
      socket.emit('leave-chat', joinedChatIdRef.current)
      joinedChatIdRef.current = null
    }
  }, [socket, selectedChat?._id])

  const handleChatSelect = async (chat) => {
    // Don't allow selecting closed chats
    if (chat && !chat.isClosed) {
      // Mark as manual selection to prevent auto-selection from overriding
      manualSelectionRef.current = true
      
      // Always fetch full chat data when switching to ensure fresh messages
      try {
        const response = await api.get(`/chats/${chat._id}`)
        const fullChat = response.data
        if (fullChat && !fullChat.isClosed) {
          // Set the selected chat with fresh data including messages
          setSelectedChat(fullChat)
        }
      } catch (error) {
        console.error('Error fetching chat details:', error)
        // Fallback: set chat even if fetch fails (might have messages from list)
        setSelectedChat(chat)
      }
      
      // Reset manual selection flag after a delay to allow all updates to complete
      setTimeout(() => {
        manualSelectionRef.current = false
      }, 2000)
    }
  }

  const handleChatClose = async () => {
    if (!selectedChat) return
    
    const chatIdToClose = selectedChat._id
    
    try {
      // Clear selected chat first to prevent UI issues
      setSelectedChat(null)
      
      // Close the chat on backend
      await api.post(`/chats/${chatIdToClose}/close`)
      
      // Update chat list
      if (onChatUpdate) {
        await onChatUpdate()
      }
      
      // After update, if there are open chats available, select the first one
      // This will be handled by the useEffect when chats update
    } catch (error) {
      console.error('Error closing chat:', error)
      alert(error.response?.data?.message || 'Failed to close chat')
      // Re-fetch chats to restore state
      if (onChatUpdate) {
        await onChatUpdate()
      }
    }
  }

  return (
    <div className="chat-panel">
      {error && (
        <div className="error-message" style={{ padding: '16px', background: '#ffebee', color: '#c62828', margin: '16px' }}>
          {error}
        </div>
      )}
      <div className="chat-sidebar">
        <h3>Your Chats</h3>
        <div className="chat-list">
          {safeChats && safeChats.length > 0 ? safeChats.map(chat => {
            const otherUser = user?.role === 'tenant' ? chat.owner : chat.tenant
            const lastMessage = chat.messages && chat.messages.length > 0
              ? chat.messages[chat.messages.length - 1]
              : null

            return (
              <div
                key={chat._id}
                className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''} ${chat.isClosed ? 'closed' : ''}`}
                onClick={() => handleChatSelect(chat)}
                style={{ cursor: chat.isClosed ? 'not-allowed' : 'pointer', opacity: chat.isClosed ? 0.7 : 1 }}
              >
                <div className="chat-item-header">
                  <h4>{otherUser?.name || 'Unknown User'}</h4>
                  {chat.property && (
                    <span className="chat-property">{chat.property.title}</span>
                  )}
                </div>
                {lastMessage && (
                  <p className="chat-item-preview">
                    {lastMessage.content || 'Image'}
                  </p>
                )}
                {chat.isClosed && (
                  <span className="chat-closed-badge">Closed</span>
                )}
              </div>
            )
          }) : (
            <p className="empty-state">No chats yet. Start a conversation from a property page!</p>
          )}
        </div>
      </div>
      <div className="chat-main">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat}
            onClose={handleChatClose}
            onUpdate={onChatUpdate}
          />
        ) : (
          <div className="no-chat-selected">
            <p>Select a chat to start conversing</p>
          </div>
        )}
      </div>

      {/* Price Proposal Sidebar */}
      {selectedChat && (
        <div className="chat-proposal-sidebar">
          {/* Show booking status if there's a booking */}
          {selectedChat.booking && (
            <div className="booking-status-info">
              <h4>Booking Status</h4>
              <div className="booking-info">
                <p><strong>Status:</strong> <span className={`booking-status-badge ${selectedChat.booking.status}`}>{selectedChat.booking.status}</span></p>
                <p><strong>Amount:</strong> ₹{selectedChat.booking.amount}</p>
                <p><strong>Dates:</strong> {new Date(selectedChat.booking.startDate).toLocaleDateString()} - {new Date(selectedChat.booking.endDate).toLocaleDateString()}</p>
                {selectedChat.booking.status === 'pending' && user.role === 'tenant' && (
                  <p className="booking-message">Waiting for owner to accept/reject your booking request...</p>
                )}
                {selectedChat.booking.status === 'pending' && user.role === 'owner' && (
                  <p className="booking-message">Please accept or reject this booking request in your bookings panel.</p>
                )}
              </div>
            </div>
          )}

          {/* Show PriceProposal only if there's NO booking */}
          {!selectedChat.booking && (
            <>
              {(selectedChat.priceProposal?.status === 'pending' || (!selectedChat.priceProposal && !selectedChat.isClosed && user.role === 'tenant')) && (
                <PriceProposal
                  chat={selectedChat}
                  proposal={selectedChat.priceProposal}
                  onUpdate={onChatUpdate}
                />
              )}

              {!selectedChat.priceProposal && !selectedChat.isClosed && user.role === 'owner' && (
                <div className="price-proposal-placeholder">
                  <p>Waiting for tenant to propose dates and price...</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatPanel



import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import './PriceProposal.css'

const PriceProposal = ({ chat, proposal, onUpdate }) => {
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [optimisticProposal, setOptimisticProposal] = useState(null)
  const { user } = useAuth()
  
  // Use optimistic proposal if available, otherwise use actual proposal
  const displayProposal = optimisticProposal || proposal

  useEffect(() => {
    // Clear optimistic proposal when real proposal arrives
    if (proposal && !proposal._temp) {
      setOptimisticProposal(null)
    }
    
    if (proposal && proposal.status === 'pending') {
      // For counter-proposals, always use the existing proposal dates as default
      // Dates are locked once set by tenant - only price can be changed
      if (proposal.startDate) {
        const start = new Date(proposal.startDate)
        setStartDate(start.toISOString().split('T')[0])
      }
      if (proposal.endDate) {
        const end = new Date(proposal.endDate)
        setEndDate(end.toISOString().split('T')[0])
      }
      // Set amount from proposal as default (user can change it)
      setAmount(proposal.amount?.toString() || '')
    } else if (chat.lockedDates && chat.lockedDates.startDate && chat.lockedDates.endDate) {
      // If there are locked dates (from a previous proposal), use those
      const start = new Date(chat.lockedDates.startDate)
      const end = new Date(chat.lockedDates.endDate)
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [proposal, chat.lockedDates])

  // Check if dates are locked (if there's an existing proposal with dates OR locked dates exist)
  const areDatesLocked = (displayProposal && displayProposal.startDate && displayProposal.endDate) ||
                         (chat.lockedDates && chat.lockedDates.startDate && chat.lockedDates.endDate)

  const isTenant = user.role === 'tenant'
  const isOwner = user.role === 'owner'
  const canPropose = displayProposal
    ? (displayProposal.proposedBy === 'tenant' && isOwner && displayProposal.status === 'pending') ||
      (displayProposal.proposedBy === 'owner' && isTenant && displayProposal.status === 'pending')
    : true

  const canRespond = displayProposal && displayProposal.status === 'pending' && 
    ((displayProposal.proposedBy === 'tenant' && isOwner) || 
     (displayProposal.proposedBy === 'owner' && isTenant))

  const handlePropose = async () => {
    if (!amount || !startDate || !endDate) {
      alert('Please fill in all fields')
      return
    }

    // Validate price bounds
    const proposedAmount = parseFloat(amount)
    if (priceBounds.min !== null && proposedAmount < priceBounds.min) {
      alert(`Proposed amount must be at least ₹${priceBounds.min} (last proposed price)`)
      return
    }
    if (priceBounds.max !== null && proposedAmount > priceBounds.max) {
      alert(`Proposed amount cannot exceed ₹${priceBounds.max} (calculated maximum based on rental period)`)
      return
    }

    // If dates are locked, ensure we use the locked dates from the proposal or chat
    let finalStartDate = startDate
    let finalEndDate = endDate
    if (areDatesLocked) {
      if (displayProposal && displayProposal.startDate && displayProposal.endDate) {
        finalStartDate = new Date(displayProposal.startDate).toISOString().split('T')[0]
        finalEndDate = new Date(displayProposal.endDate).toISOString().split('T')[0]
      } else if (chat.lockedDates && chat.lockedDates.startDate && chat.lockedDates.endDate) {
        finalStartDate = new Date(chat.lockedDates.startDate).toISOString().split('T')[0]
        finalEndDate = new Date(chat.lockedDates.endDate).toISOString().split('T')[0]
      }
    }

    const start = new Date(finalStartDate)
    const end = new Date(finalEndDate)

    if (start >= end) {
      alert('End date must be after start date')
      return
    }

    setLoading(true)
    
    // Create optimistic proposal to show immediately
    const tempProposal = {
      proposedBy: user.role === 'tenant' ? 'tenant' : 'owner',
      amount: parseFloat(amount),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      status: 'pending',
      _temp: true
    }
    
    // Show optimistic proposal immediately
    setOptimisticProposal(tempProposal)
    const savedAmount = amount
    setAmount('') // Clear amount immediately

    try {
      const response = await api.post(`/chats/${chat._id}/propose-price`, {
        amount: parseFloat(savedAmount),
        startDate: start.toISOString(),
        endDate: end.toISOString()
      })
      
      // Clear optimistic proposal - real one will come via socket or onUpdate
      setOptimisticProposal(null)
      
      // Update will be handled by socket or onUpdate callback
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error proposing price:', error)
      // Remove optimistic proposal on error
      setOptimisticProposal(null)
      // Restore form values on error
      setAmount(savedAmount)
      alert(error.response?.data?.message || 'Failed to propose price')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (action) => {
    setLoading(true)
    try {
      await api.post(`/chats/${chat._id}/price-response`, { action })
      onUpdate()
    } catch (error) {
      console.error('Error responding to proposal:', error)
      alert('Failed to respond')
    } finally {
      setLoading(false)
    }
  }

  if (displayProposal && displayProposal.status === 'accepted') {
    return null // Price proposal is accepted and removed
  }

  // Get locked dates info for display
  const getLockedDatesInfo = () => {
    if (displayProposal && displayProposal.startDate && displayProposal.endDate) {
      return {
        startDate: displayProposal.startDate,
        endDate: displayProposal.endDate
      }
    }
    if (chat.lockedDates && chat.lockedDates.startDate && chat.lockedDates.endDate) {
      return {
        startDate: chat.lockedDates.startDate,
        endDate: chat.lockedDates.endDate
      }
    }
    return null
  }

  const lockedDatesInfo = getLockedDatesInfo()

  // Calculate price bounds
  const calculatePriceBounds = () => {
    // Get dates - prefer locked dates, then proposal dates
    const datesToUse = lockedDatesInfo || (displayProposal && displayProposal.startDate && displayProposal.endDate 
      ? { startDate: displayProposal.startDate, endDate: displayProposal.endDate }
      : (startDate && endDate ? { startDate, endDate: null } : null))
    
    // If we have dates but not in the right format, convert them
    let finalDates = datesToUse
    if (!finalDates && startDate && endDate) {
      finalDates = { startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() }
    }
    
    if (!finalDates || !chat.property || !chat.property.price) {
      return { min: null, max: null }
    }

    const start = new Date(finalDates.startDate)
    const end = new Date(finalDates.endDate)
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { min: null, max: null }
    }
    
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
    const monthlyPrice = chat.property.price
    const dailyRate = monthlyPrice / 30
    const calculatedMax = Math.round((dailyRate * totalDays) / 100) * 100 // Round to nearest hundred
    
    // Minimum is the last proposed price (if there's a pending proposal)
    const min = displayProposal && displayProposal.status === 'pending' ? displayProposal.amount : null
    
    return { min, max: calculatedMax }
  }

  const priceBounds = calculatePriceBounds()

  return (
    <div className="price-proposal">
      <h4>Price Proposal</h4>
      
      {displayProposal && displayProposal.status === 'pending' && (
        <div className="proposal-info">
          <p><strong>Proposed by:</strong> {displayProposal.proposedBy === 'tenant' ? 'Tenant' : 'Owner'}</p>
          <p><strong>Amount:</strong> ₹{displayProposal.amount}</p>
          <p><strong>Dates:</strong> {new Date(displayProposal.startDate).toLocaleDateString()} - {new Date(displayProposal.endDate).toLocaleDateString()}</p>
        </div>
      )}

      {/* Show locked dates info even when no proposal exists */}
      {!displayProposal && lockedDatesInfo && (
        <div className="proposal-info" style={{ 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          marginBottom: '16px' 
        }}>
          <p><strong>📅 Locked Rental Period:</strong> {new Date(lockedDatesInfo.startDate).toLocaleDateString()} - {new Date(lockedDatesInfo.endDate).toLocaleDateString()}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            These dates were set by the tenant and cannot be changed. You can only negotiate the price.
          </p>
        </div>
      )}

      {canPropose && (
        <div className="proposal-form">
          {areDatesLocked && (
            <div className="dates-locked-notice" style={{ 
              padding: '12px', 
              backgroundColor: '#fff3e0', 
              border: '1px solid #ffb74d', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '14px',
              color: '#e65100'
            }}>
              <strong>📅 Dates are locked:</strong> The rental period ({lockedDatesInfo 
                ? `${new Date(lockedDatesInfo.startDate).toLocaleDateString()} - ${new Date(lockedDatesInfo.endDate).toLocaleDateString()}`
                : 'N/A'}) cannot be changed. You can only negotiate the price.
            </div>
          )}
          
          <div className="form-group">
            <label className="form-label">Proposed Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={loading}
              min={priceBounds.min !== null ? priceBounds.min : undefined}
              max={priceBounds.max !== null ? priceBounds.max : undefined}
            />
            {priceBounds.min !== null && priceBounds.max !== null && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Price range: ₹{priceBounds.min} - ₹{priceBounds.max}
              </p>
            )}
            {priceBounds.min !== null && priceBounds.max === null && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Minimum: ₹{priceBounds.min} (last proposed price)
              </p>
            )}
            {priceBounds.min === null && priceBounds.max !== null && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Maximum: ₹{priceBounds.max} (calculated based on rental period)
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Start Date {areDatesLocked && <span style={{ color: '#e65100' }}>(Locked)</span>}</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading || areDatesLocked}
              min={new Date().toISOString().split('T')[0]}
              style={areDatesLocked ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            />
            {areDatesLocked && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Dates cannot be changed once set by the tenant
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">End Date {areDatesLocked && <span style={{ color: '#e65100' }}>(Locked)</span>}</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading || areDatesLocked}
              min={startDate || new Date().toISOString().split('T')[0]}
              style={areDatesLocked ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
            />
            {areDatesLocked && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Dates cannot be changed once set by the tenant
              </p>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handlePropose}
            disabled={loading || !amount || !startDate || !endDate}
          >
            {displayProposal ? 'Propose New Price' : 'Propose Price'}
          </button>
        </div>
      )}

      {canRespond && (
        <div className="proposal-actions">
          <button
            className="btn btn-success"
            onClick={() => handleResponse('accept')}
            disabled={loading}
          >
            Accept
          </button>
          <button
            className="btn btn-danger"
            onClick={() => handleResponse('reject')}
            disabled={loading}
          >
            Reject
          </button>
        </div>
      )}

      {displayProposal && displayProposal.status === 'pending' && !canPropose && !canRespond && (
        <p className="proposal-waiting">Waiting for response...</p>
      )}
    </div>
  )
}

export default PriceProposal



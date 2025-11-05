import { useState, useEffect } from 'react'
import Calendar from 'react-calendar'
import { format, isSameDay } from 'date-fns'
import 'react-calendar/dist/Calendar.css'
import './BookingCalendar.css'

const BookingCalendar = ({ startDate, endDate, onStartDateChange, onEndDateChange, bookedDates = [], minDays = 15 }) => {
  const [selectedStart, setSelectedStart] = useState(startDate)
  const [selectedEnd, setSelectedEnd] = useState(endDate)

  useEffect(() => {
    setSelectedStart(startDate)
    setSelectedEnd(endDate)
  }, [startDate, endDate])

  // Calculate days between selected dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 0
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
  }

  const handleDateChange = (date) => {
    // Prevent selecting booked dates
    const datesToCheck = Array.isArray(date) ? date : [date]
    for (const checkDate of datesToCheck) {
      if (checkDate && isDateBooked(checkDate)) {
        return // Don't allow selection of booked dates
      }
    }

    if (Array.isArray(date)) {
      // Range selection
      setSelectedStart(date[0])
      setSelectedEnd(date[1])
      onStartDateChange?.(date[0])
      onEndDateChange?.(date[1])
    } else {
      // Single date selection
      if (!selectedStart || (selectedStart && selectedEnd)) {
        // Start new selection
        setSelectedStart(date)
        setSelectedEnd(null)
        onStartDateChange?.(date)
        onEndDateChange?.(null)
      } else {
        // Complete selection
        if (date < selectedStart) {
          setSelectedEnd(selectedStart)
          setSelectedStart(date)
          onStartDateChange?.(date)
          onEndDateChange?.(selectedStart)
        } else {
          setSelectedEnd(date)
          onEndDateChange?.(date)
        }
      }
    }
  }

  const isDateBooked = (date) => {
    if (!bookedDates || !Array.isArray(bookedDates) || bookedDates.length === 0) return false
    try {
      return bookedDates.some(bookedDate => {
        if (!bookedDate) return false
        try {
          const bookedDateObj = new Date(bookedDate)
          if (isNaN(bookedDateObj.getTime())) return false
          return isSameDay(bookedDateObj, date)
        } catch {
          return false
        }
      })
    } catch (error) {
      console.error('Error checking booked date:', error)
      return false
    }
  }

  const isDateInRange = (date) => {
    if (!selectedStart) return false
    if (selectedStart && !selectedEnd) {
      return isSameDay(selectedStart, date)
    }
    if (selectedStart && selectedEnd) {
      return (date >= selectedStart && date <= selectedEnd)
    }
    return false
  }

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const classes = []
      // Check if date is booked
      if (isDateBooked(date)) {
        classes.push('booked-date')
      }
      // Check if date is in selected range
      if (isDateInRange(date)) {
        classes.push('selected-date')
      }
      return classes.length > 0 ? classes.join(' ') : null
    }
    return null
  }

  const tileDisabled = ({ date, view }) => {
    if (view === 'month') {
      // Disable past dates and booked dates (booked dates will be styled but still disabled)
      return isDateBooked(date) || date < new Date()
    }
    return false
  }

  return (
    <div className="booking-calendar">
      <Calendar
        onChange={handleDateChange}
        value={selectedStart && selectedEnd ? [selectedStart, selectedEnd] : selectedStart}
        selectRange={true}
        tileClassName={tileClassName}
        tileDisabled={tileDisabled}
        minDate={new Date()}
      />
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color booked"></span>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <span className="legend-color selected"></span>
          <span>Selected</span>
        </div>
        {selectedStart && (
          <div className="selected-dates">
            <p><strong>Start:</strong> {format(selectedStart, 'PPP')}</p>
            {selectedEnd && (
              <>
                <p><strong>End:</strong> {format(selectedEnd, 'PPP')}</p>
                {(() => {
                  const totalDays = calculateDays(selectedStart, selectedEnd)
                  const isValid = totalDays >= minDays
                  return (
                    <>
                      <p><strong>Total Days:</strong> {totalDays} days</p>
                      {!isValid && (
                        <p className="date-warning" style={{ color: '#f57c00', fontWeight: '600', marginTop: '8px' }}>
                          ⚠ Minimum rental period is {minDays} days for PG accommodations. Please select a longer period.
                        </p>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingCalendar



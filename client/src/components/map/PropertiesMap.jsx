import { useMemo, useRef, useState } from 'react'
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api'
import { useNavigate } from 'react-router-dom'
import { getImageUrl } from '../../utils/imageUtils'
import './PropertiesMap.css'

const libraries = ['places']

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px'
}

const defaultCenter = {
  lat: 28.6139, // Delhi coordinates as default
  lng: 77.2090
}

const PropertiesMap = ({ properties, workplaceLocation }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  const mapRef = useRef(null)
  const navigate = useNavigate()
  const [selectedProperty, setSelectedProperty] = useState(null)

  // Filter properties with location first
  const propertiesWithLocation = useMemo(() => {
    if (!properties || properties.length === 0) return []
    return properties.filter(
      p => p.location && p.location.latitude && p.location.longitude
    )
  }, [properties])

  // Calculate map center based on properties or workplace
  const mapCenter = useMemo(() => {
    // If we have properties with location, use their average center
    if (propertiesWithLocation.length > 0) {
      const validProperties = propertiesWithLocation.filter(
        p => !isNaN(parseFloat(p.location.latitude)) && !isNaN(parseFloat(p.location.longitude))
      )
      
      if (validProperties.length > 0) {
        const avgLat = validProperties.reduce(
          (sum, p) => sum + parseFloat(p.location.latitude), 0
        ) / validProperties.length
        const avgLng = validProperties.reduce(
          (sum, p) => sum + parseFloat(p.location.longitude), 0
        ) / validProperties.length
        return { lat: avgLat, lng: avgLng }
      }
    }
    
    // Fallback to workplace location if no properties
    if (workplaceLocation) {
      return workplaceLocation
    }
    
    // Default center
    return defaultCenter
  }, [propertiesWithLocation, workplaceLocation])

  if (loadError) {
    return (
      <div className="map-error">
        <p>Error loading maps. Please check your Google Maps API key.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="map-loading">
        <div className="spinner"></div>
        <p>Loading map...</p>
      </div>
    )
  }
  
  const getPropertyImage = (property) => {
    if (property.images && property.images.length > 0) {
      return getImageUrl(property.images[0])
    }
    return '/-2.jpg'
  }

  return (
    <div className="properties-map">
      <h3>Property Locations</h3>
      {propertiesWithLocation.length === 0 && !workplaceLocation ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p>No properties with location data available.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Property owners need to set location when creating/editing properties.
          </p>
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={propertiesWithLocation.length === 0 ? 10 : propertiesWithLocation.length === 1 ? 15 : 12}
            center={mapCenter}
            options={{
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: true,
              disableDefaultUI: false
            }}
            onLoad={(map) => {
              mapRef.current = map
              // Fit bounds to show all markers
              if (window.google && propertiesWithLocation.length > 0) {
                setTimeout(() => {
                  const bounds = new window.google.maps.LatLngBounds()
                  
                  propertiesWithLocation.forEach(property => {
                    const lat = parseFloat(property.location.latitude)
                    const lng = parseFloat(property.location.longitude)
                    if (!isNaN(lat) && !isNaN(lng)) {
                      bounds.extend({ lat, lng })
                    }
                  })
                  
                  if (workplaceLocation) {
                    bounds.extend(workplaceLocation)
                  }
                  
                  if (!bounds.isEmpty() && mapRef.current) {
                    mapRef.current.fitBounds(bounds, { padding: 50 })
                  }
                }, 200)
              }
            }}
            onClick={() => setSelectedProperty(null)}
          >
            {propertiesWithLocation.map((property) => {
              const lat = parseFloat(property.location.latitude)
              const lng = parseFloat(property.location.longitude)
              
              if (isNaN(lat) || isNaN(lng)) {
                return null
              }
              
              const isSelected = selectedProperty && selectedProperty._id === property._id
              
              return (
                <Marker
                  key={property._id}
                  position={{
                    lat: lat,
                    lng: lng
                  }}
                  title={`${property.title} - ₹${property.price}/month`}
                  label={{
                    text: `₹${property.price}`,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                  animation={window.google?.maps?.Animation?.DROP}
                  onClick={() => {
                    setSelectedProperty(isSelected ? null : property)
                  }}
                  icon={
                    window.google
                      ? {
                          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(40, 40)
                        }
                      : undefined
                  }
                >
                  {isSelected && window.google && (
                    <InfoWindow
                      onCloseClick={() => setSelectedProperty(null)}
                    >
                      <div className="property-info-window">
                        <img 
                          src={getPropertyImage(property)} 
                          alt={property.title}
                          style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                          onError={(e) => {
                            e.target.src = '/-2.jpg'
                          }}
                        />
                        <h4 style={{ margin: '8px 0 4px 0', fontSize: '16px', fontWeight: 'bold' }}>
                          {property.title}
                        </h4>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                          {property.address?.fullAddress || property.address?.city || 'Location not specified'}
                        </p>
                        <p style={{ margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: '#2e7d32' }}>
                          ₹{property.price}/month
                        </p>
                        {property.distanceFromWorkplace !== undefined && (
                          <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                            📍 {property.distanceFromWorkplace.toFixed(2)} km from workplace
                          </p>
                        )}
                        <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                          Available: {property.availableCapacity}/{property.capacity}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/property/${property._id}`)
                            setSelectedProperty(null)
                          }}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#9d8e7a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            width: '100%'
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              )
            })}
            {workplaceLocation && (
              <Marker
                position={workplaceLocation}
                title="Your Workplace"
                label={{
                  text: '🏢',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}
              />
            )}
          </GoogleMap>
          <div className="map-legend">
            <p><span className="legend-marker">📍</span> Property locations</p>
            {workplaceLocation && (
              <p><span className="legend-marker">🏢</span> Your workplace</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PropertiesMap


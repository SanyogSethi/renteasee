import { useState, useEffect, useCallback, useRef } from 'react'
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api'
import './MapLocationPicker.css'

const libraries = ['places']

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
}

const defaultCenter = {
  lat: 28.6139, // Delhi coordinates as default
  lng: 77.2090
}

const MapLocationPicker = ({ onLocationSelect, initialLocation, address }) => {
  const [selectedLocation, setSelectedLocation] = useState(
    initialLocation || null
  )
  const [mapCenter, setMapCenter] = useState(
    initialLocation || defaultCenter
  )
  const [searchAddress, setSearchAddress] = useState(address || '')
  const mapRef = useRef(null)
  const searchInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  })

  useEffect(() => {
    if (address && address !== searchAddress) {
      setSearchAddress(address)
    }
  }, [address, searchAddress])

  useEffect(() => {
    if (initialLocation) {
      const locationChanged = 
        !selectedLocation ||
        Math.abs(initialLocation.lat - selectedLocation.lat) > 0.0001 ||
        Math.abs(initialLocation.lng - selectedLocation.lng) > 0.0001
      
      if (locationChanged) {
        setSelectedLocation(initialLocation)
        setMapCenter(initialLocation)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation?.lat, initialLocation?.lng])

  const onMapClick = useCallback((e) => {
    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    }
    setSelectedLocation(location)
    setMapCenter(location)
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }, [onLocationSelect])

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
    
    // Initialize autocomplete for address search only once
    if (searchInputRef.current && window.google && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current
      )
      
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (place.geometry) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
          setSelectedLocation(location)
          setMapCenter(location)
          if (mapRef.current) {
            mapRef.current.setCenter(location)
            mapRef.current.setZoom(15)
          }
          if (onLocationSelect) {
            onLocationSelect(location)
          }
        }
      })
    }
  }, [onLocationSelect])

  const handleSearch = useCallback(() => {
    if (searchInputRef.current && mapRef.current && window.google) {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        { address: searchInputRef.current.value },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng()
            }
            setSelectedLocation(location)
            setMapCenter(location)
            mapRef.current.setCenter(location)
            mapRef.current.setZoom(15)
            if (onLocationSelect) {
              onLocationSelect(location)
            }
          }
        }
      )
    }
  }, [onLocationSelect])

  if (loadError) {
    return (
      <div className="map-error">
        <p>Error loading maps. Please check your Google Maps API key.</p>
        <p className="map-error-hint">
          Add VITE_GOOGLE_MAPS_API_KEY to your .env file
        </p>
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

  return (
    <div className="map-location-picker">
      <div className="map-search-bar">
        <input
          ref={searchInputRef}
          type="text"
          className="map-search-input"
          placeholder="Search address or click on map to set location"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSearch}
        >
          Search
        </button>
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={selectedLocation ? 15 : 10}
        center={mapCenter}
        onClick={onMapClick}
        onLoad={onMapLoad}
      >
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            draggable={true}
            onDragEnd={(e) => {
              const location = {
                lat: e.latLng.lat(),
                lng: e.latLng.lng()
              }
              setSelectedLocation(location)
              if (onLocationSelect) {
                onLocationSelect(location)
              }
            }}
          />
        )}
      </GoogleMap>
      {selectedLocation && (
        <div className="selected-coordinates">
          <p>
            <strong>Selected Location:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
        </div>
      )}
      {!selectedLocation && (
        <div className="map-instructions">
          <p>Click on the map or search for an address to set the property location</p>
        </div>
      )}
    </div>
  )
}

export default MapLocationPicker


import { useState, useEffect, useRef } from 'react'
import { getImageUrl } from '../../utils/imageUtils'
import './PropertyImageCarousel.css'

const PropertyImageCarousel = ({ images, propertyTitle }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState({})
  const [imageLoading, setImageLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const imageRefs = useRef({})

  const imageUrls = images && images.length > 0 
    ? images.map(img => {
        const url = getImageUrl(img)
        // Only log in development
        if (!import.meta.env.PROD) {
          console.log('🖼️ Image URL:', { original: img, constructed: url })
        }
        return url
      })
    : ['/-2.jpg']

  useEffect(() => {
    // Auto-rotate images every 5 seconds
    if (imageUrls.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % imageUrls.length)
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [imageUrls.length])

  const goToPrevious = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const goToNext = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length)
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const goToSlide = (index) => {
    if (isTransitioning || index === currentIndex) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const handleImageError = (index, event) => {
    // Only log in development
    if (!import.meta.env.PROD) {
      console.error(`❌ Image failed to load:`, {
        index,
        url: imageUrls[index],
        originalPath: images[index]
      })
    }
    
    // Fallback to default image if not already using it
    const imgElement = event.target
    if (imgElement && !imgElement.src.includes('/-2.jpg')) {
      imgElement.src = '/-2.jpg'
      setImageError(prev => ({ ...prev, [index]: false })) // Reset error since we're using fallback
    } else {
      setImageError(prev => ({ ...prev, [index]: true }))
    }
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  return (
    <div className="property-image-carousel">
      <div className="carousel-container">
        <div 
          className="carousel-slider"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: isTransitioning ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        >
          {imageUrls.map((url, index) => (
            <div key={index} className="carousel-slide">
              {imageLoading && index === currentIndex && (
                <div className="carousel-loading">
                  <div className="spinner"></div>
                </div>
              )}
              <img
                ref={el => imageRefs.current[index] = el}
                src={url}
                alt={`${propertyTitle || 'Property'} - Image ${index + 1}`}
                className={`carousel-image ${imageLoading && index === currentIndex ? 'loading' : ''}`}
                onLoad={handleImageLoad}
                onError={(e) => handleImageError(index, e)}
              />
              {imageError[index] && (
                <div className="carousel-error">
                  <span>Image unavailable</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Navigation arrows - only show if more than one image */}
        {imageUrls.length > 1 && (
          <>
            <button 
              className="carousel-arrow carousel-arrow-left" 
              onClick={goToPrevious}
              aria-label="Previous image"
              disabled={isTransitioning}
            >
              ‹
            </button>
            <button 
              className="carousel-arrow carousel-arrow-right" 
              onClick={goToNext}
              aria-label="Next image"
              disabled={isTransitioning}
            >
              ›
            </button>
          </>
        )}

        {/* Dots indicator - only show if more than one image */}
        {imageUrls.length > 1 && (
          <div className="carousel-dots">
            {imageUrls.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to image ${index + 1}`}
                disabled={isTransitioning}
              />
            ))}
          </div>
        )}

        {/* Image counter */}
        {imageUrls.length > 1 && (
          <div className="carousel-counter">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        )}
      </div>
    </div>
  )
}

export default PropertyImageCarousel


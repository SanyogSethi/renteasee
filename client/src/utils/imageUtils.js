// Utility function to get API base URL for images and assets
export const getApiBaseUrl = () => {
  // In production, use the API URL from environment
  // In development, use localhost
  if (import.meta.env.PROD) {
    // Production: use VITE_API_URL but remove /api suffix for image paths and Socket.io
    const apiUrl = import.meta.env.VITE_API_URL || ''
    console.log('🔍 VITE_API_URL:', apiUrl)
    if (apiUrl) {
      // Remove /api suffix if present (for Socket.io and image paths)
      const baseUrl = apiUrl.replace(/\/api$/, '')
      console.log('🔍 Base URL for images:', baseUrl)
      return baseUrl
    }
    // Fallback (should not happen if env var is set correctly)
    return 'https://rentease-backend-c8wm.onrender.com'
  }
  return 'http://localhost:5050'
}

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    console.log('⚠️ No image path provided')
    return '/-2.jpg'
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    console.log('🔍 Already full URL:', imagePath)
    return imagePath
  }
  
  // Check if it's a MongoDB ObjectId (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/
  if (objectIdPattern.test(imagePath)) {
    // It's an image ID, use the image serving endpoint
    const baseUrl = getApiBaseUrl()
    const imageUrl = `${baseUrl}/api/images/${imagePath}`
    console.log('🔍 MongoDB Image ID:', { imagePath, imageUrl })
    return imageUrl
  }
  
  // Legacy path-based images (for backward compatibility)
  // Normalize the path
  let normalizedPath = imagePath
  if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.startsWith('/') ? normalizedPath : `uploads/${normalizedPath}`
  }
  normalizedPath = normalizedPath.replace(/^\/+/, '')
  
  const baseUrl = getApiBaseUrl()
  const fullUrl = `${baseUrl}/${normalizedPath}`
  console.log('🔍 Legacy path-based image:', { imagePath, normalizedPath, baseUrl, fullUrl })
  
  return fullUrl
}


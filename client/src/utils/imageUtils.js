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
  
  // Normalize the path
  let normalizedPath = imagePath
  if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.startsWith('/') ? normalizedPath : `uploads/${normalizedPath}`
  }
  normalizedPath = normalizedPath.replace(/^\/+/, '')
  
  const baseUrl = getApiBaseUrl()
  const fullUrl = `${baseUrl}/${normalizedPath}`
  console.log('🔍 Constructed image URL:', { imagePath, normalizedPath, baseUrl, fullUrl })
  
  return fullUrl
}


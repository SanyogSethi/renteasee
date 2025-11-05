// Utility function to get API base URL for images and assets
export const getApiBaseUrl = () => {
  // In production, use the API URL from environment
  // In development, use localhost
  if (import.meta.env.PROD) {
    // Production: use VITE_API_URL but remove /api suffix for image paths and Socket.io
    const apiUrl = import.meta.env.VITE_API_URL || ''
    if (apiUrl) {
      // Remove /api suffix if present (for Socket.io and image paths)
      const baseUrl = apiUrl.replace(/\/api$/, '')
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
    return '/-2.jpg'
  }
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // Check if it's a MongoDB ObjectId (24 hex characters)
  const objectIdPattern = /^[0-9a-fA-F]{24}$/
  if (objectIdPattern.test(imagePath)) {
    // It's an image ID, use the image serving endpoint
    const baseUrl = getApiBaseUrl()
    const imageUrl = `${baseUrl}/api/images/${imagePath}`
    return imageUrl
  }
  
  // Legacy path-based images (for backward compatibility)
  // Check if it's a chat image path
  if (imagePath.includes('/chats/') || imagePath.startsWith('chats/')) {
    // Chat images: try MongoDB first, then fallback to static
    const baseUrl = getApiBaseUrl()
    // Try to extract potential ObjectId from path, or use path directly
    const normalizedPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
    const fullUrl = `${baseUrl}/${normalizedPath}`
    return fullUrl
  }
  
  // Property images or other paths
  let normalizedPath = imagePath
  if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.startsWith('/') ? normalizedPath : `uploads/${normalizedPath}`
  }
  normalizedPath = normalizedPath.replace(/^\/+/, '')
  
  const baseUrl = getApiBaseUrl()
  const fullUrl = `${baseUrl}/${normalizedPath}`
  
  return fullUrl
}


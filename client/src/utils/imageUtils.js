// Utility function to get API base URL for images and assets
export const getApiBaseUrl = () => {
  // In production, use the API URL from environment
  // In development, use localhost
  if (import.meta.env.PROD) {
    // Production: use VITE_API_URL but remove /api suffix for image paths
    const apiUrl = import.meta.env.VITE_API_URL || ''
    return apiUrl.replace(/\/api$/, '') || 'https://your-backend.railway.app'
  }
  return 'http://localhost:5050'
}

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/-2.jpg'
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // Normalize the path
  let normalizedPath = imagePath
  if (!normalizedPath.startsWith('uploads/') && !normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.startsWith('/') ? normalizedPath : `uploads/${normalizedPath}`
  }
  normalizedPath = normalizedPath.replace(/^\/+/, '')
  
  return `${getApiBaseUrl()}/${normalizedPath}`
}


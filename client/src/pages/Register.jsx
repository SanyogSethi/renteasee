import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './Auth.css'

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'tenant',
    document: null,
    documentNumber: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [documentError, setDocumentError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  // Allowed file formats and size (JPEG only for document verification)
  const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg']
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg']
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

  const validateDocument = (file) => {
    if (!file) {
      setDocumentError('')
      return { valid: true, error: '' }
    }

    // Check file type - only JPEG allowed
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    const isValidFormat = ALLOWED_FORMATS.includes(file.type) || 
                         ALLOWED_EXTENSIONS.includes(fileExtension)

    if (!isValidFormat) {
      // Check if PDF was uploaded
      if (fileExtension === '.pdf' || file.type === 'application/pdf') {
        const errorMsg = `❌ PDF files are not allowed. Please upload only JPEG format.`
        setDocumentError(errorMsg)
        return { valid: false, error: errorMsg }
      }
      // Other unsupported formats
      const errorMsg = `❌ Unsupported file format. Please upload only JPEG format.`
      setDocumentError(errorMsg)
      return { valid: false, error: errorMsg }
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
      const errorMsg = `❌ File size too large (${fileSizeMB} MB). Maximum allowed size: ${maxSizeMB} MB`
      setDocumentError(errorMsg)
      return { valid: false, error: errorMsg }
    }

    // Clear any previous errors
    setDocumentError('')
    return { valid: true, error: '' }
  }

  const handleChange = (e) => {
    if (e.target.name === 'document') {
      const file = e.target.files[0]
      if (file) {
        const validation = validateDocument(file)
        if (validation.valid) {
          setFormData({ ...formData, document: file })
          setError('') // Clear general error when valid file is selected
        } else {
          // Clear the file input if validation fails
          e.target.value = ''
          setFormData({ ...formData, document: null })
        }
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDocumentError('')

    // Validate document before submission
    if (!formData.document) {
      setError('Please upload a government-issued document for verification')
      return
    }

    // Re-validate document on submit
    const validation = validateDocument(formData.document)
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    if (!formData.documentNumber) {
      setError('Please enter your document number (Aadhaar/PAN/License number)')
      return
    }

    setLoading(true)

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('email', formData.email)
      data.append('password', formData.password)
      data.append('phone', formData.phone)
      data.append('role', formData.role)
      data.append('document', formData.document)
      data.append('documentNumber', formData.documentNumber)
      data.append('documentType', 'aadhar') // Default, can be enhanced

      await register(data)
      navigate('/dashboard')
    } catch (err) {
      console.error('Registration error:', err)
      
      // Handle network errors
      if (!err.response) {
        // Check if it's a network error or a file validation error from multer
        if (err.message && (err.message.includes('Only image and PDF') || err.message.includes('file size'))) {
          setError(`❌ ${err.message}`)
        } else {
          setError('Network error: Unable to connect to server. Please check your internet connection and try again.')
        }
        setLoading(false)
        return
      }
      
      // Handle backend validation errors
      const status = err.response?.status
      let errorMessage = err.response?.data?.message || 'Registration failed'
      
      // Check for specific file-related errors
      if (errorMessage.includes('Only JPEG') || errorMessage.includes('JPEG format') || errorMessage.includes('file')) {
        setError(`❌ Document Error: ${errorMessage}`)
      } else if (status === 400) {
        // Bad request - show the specific error message
        setError(`❌ ${errorMessage}`)
      } else if (status === 413) {
        // Payload too large
        setError('❌ File size too large. Maximum allowed size is 5 MB. Please upload a smaller file.')
      } else if (status === 500) {
        // Server error
        setError(`Server error: ${errorMessage}. Please try again later.`)
      } else {
        // Other errors
        setError(errorMessage)
      }
      
      // If parameters are provided, show them
      if (err.response?.data?.parameters) {
        const params = err.response.data.parameters
        const passedParams = params.filter(p => p.passed).map(p => p.name)
        const failedParams = params.filter(p => !p.passed).map(p => p.name)
        
        errorMessage += `\n\nPassed: ${passedParams.join(', ') || 'None'}\nFailed: ${failedParams.join(', ') || 'None'}`
        setError(errorMessage)
      }
      
      // Show recommendations if available
      if (err.response?.data?.recommendations) {
        errorMessage += `\n\nTips: ${err.response.data.recommendations.join(', ')}`
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Join RentEase</h2>
          <p className="auth-subtitle">Upload a government-issued document for verification</p>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">I am a</label>
              <select
                name="role"
                className="form-input"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="tenant">Tenant</option>
                <option value="owner">Property Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Government ID Document (Aadhar/PAN/License)</label>
              <input
                type="file"
                name="document"
                className="form-input"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={handleChange}
                required
              />
              {documentError && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {documentError}
                </small>
              )}
              <small className="form-hint" style={{ marginTop: '4px', display: 'block' }}>
                📄 Allowed format: JPEG only (JPG/JPEG)
              </small>
              <small className="form-hint" style={{ display: 'block' }}>
                📏 Maximum file size: 5 MB
              </small>
              <small className="form-hint" style={{ display: 'block', marginTop: '4px' }}>
                Upload a clear JPEG image of your government-issued ID (Aadhaar, PAN, License, or Passport)
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">
                Document Number <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="documentNumber"
                className="form-input"
                value={formData.documentNumber}
                onChange={handleChange}
                placeholder="Enter your Aadhaar/PAN/License number"
                required
                style={{ borderColor: !formData.documentNumber ? '#ff4444' : '' }}
              />
              <small className="form-hint" style={{ color: !formData.documentNumber ? '#ff4444' : '#666' }}>
                {!formData.documentNumber ? '⚠️ Document number is required' : 'Enter the number from your uploaded document'}
              </small>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <p className="auth-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Register



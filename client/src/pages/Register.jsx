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
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    documentNumber: ''
  })
  const { register } = useAuth()
  const navigate = useNavigate()

  // Allowed file formats and size (JPEG only for document verification)
  const ALLOWED_FORMATS = ['image/jpeg', 'image/jpg']
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg']
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB in bytes

  // Validation functions
  const validateName = (name) => {
    if (!name || name.trim() === '') {
      return 'Full name is required'
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters long'
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Name can only contain letters and spaces'
    }
    return ''
  }

  const validateEmail = (email) => {
    if (!email || email.trim() === '') {
      return 'Email is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  const validatePhone = (phone) => {
    if (!phone || phone.trim() === '') {
      return 'Phone number is required'
    }
    // Remove spaces, dashes, and plus signs for validation
    const cleanedPhone = phone.replace(/[\s\-+]/g, '')
    // Indian phone number: 10 digits, or 12 digits if starts with 91
    if (!/^(\d{10}|91\d{10})$/.test(cleanedPhone)) {
      return 'Please enter a valid 10-digit phone number'
    }
    return ''
  }

  const validatePassword = (password) => {
    if (!password || password === '') {
      return 'Password is required'
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    if (!/[a-zA-Z]/.test(password)) {
      return 'Password must contain at least one letter'
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number'
    }
    return ''
  }

  const validateDocumentNumber = (documentNumber) => {
    if (!documentNumber || documentNumber.trim() === '') {
      return 'Document number is required'
    }
    const cleaned = documentNumber.trim().replace(/\s/g, '')
    
    // Aadhaar: 12 digits
    if (/^\d{12}$/.test(cleaned)) {
      return ''
    }
    // PAN: 10 alphanumeric characters (e.g., ABCDE1234F)
    if (/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(cleaned.toUpperCase())) {
      return ''
    }
    // License: Alphanumeric, typically 15-16 characters
    if (/^[A-Z0-9]{10,20}$/i.test(cleaned)) {
      return ''
    }
    // If none match, show generic error
    return 'Please enter a valid document number (Aadhaar: 12 digits, PAN: 10 characters, License: 10-20 characters)'
  }

  // Handle field blur validation
  const handleBlur = (e) => {
    const fieldName = e.target.name
    const fieldValue = e.target.value

    let error = ''
    switch (fieldName) {
      case 'name':
        error = validateName(fieldValue)
        break
      case 'email':
        error = validateEmail(fieldValue)
        break
      case 'phone':
        error = validatePhone(fieldValue)
        break
      case 'password':
        error = validatePassword(fieldValue)
        break
      case 'documentNumber':
        error = validateDocumentNumber(fieldValue)
        break
      default:
        break
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
  }

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
          setDocumentError('') // Clear document error
        } else {
          // Clear the file input if validation fails
          e.target.value = ''
          setFormData({ ...formData, document: null })
        }
      }
    } else {
      const fieldName = e.target.name
      const fieldValue = e.target.value
      setFormData({ ...formData, [fieldName]: fieldValue })
      
      // Clear field error when user starts typing (only if error exists)
      if (fieldErrors[fieldName]) {
        setFieldErrors(prev => ({
          ...prev,
          [fieldName]: ''
        }))
      }
    }
  }

  // Handle document file blur/change
  const handleDocumentBlur = (e) => {
    if (formData.document) {
      const validation = validateDocument(formData.document)
      if (!validation.valid) {
        setDocumentError(validation.error)
      }
    } else {
      setDocumentError('Please upload a government-issued document for verification')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate all fields before submission
    const nameError = validateName(formData.name)
    const emailError = validateEmail(formData.email)
    const phoneError = validatePhone(formData.phone)
    const passwordError = validatePassword(formData.password)
    const documentNumberError = validateDocumentNumber(formData.documentNumber)
    
    // Validate document
    let docError = ''
    if (!formData.document) {
      docError = 'Please upload a government-issued document for verification'
    } else {
      const validation = validateDocument(formData.document)
      if (!validation.valid) {
        docError = validation.error
      }
    }

    // Set all field errors
    setFieldErrors({
      name: nameError,
      email: emailError,
      phone: phoneError,
      password: passwordError,
      documentNumber: documentNumberError
    })
    setDocumentError(docError)

    // If any validation fails, stop submission
    if (nameError || emailError || phoneError || passwordError || documentNumberError || docError) {
      setError('Please fix all errors before submitting')
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
                onBlur={handleBlur}
                required
                style={{ borderColor: fieldErrors.name ? '#ff4444' : '' }}
              />
              {fieldErrors.name && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {fieldErrors.name}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                style={{ borderColor: fieldErrors.email ? '#ff4444' : '' }}
              />
              {fieldErrors.email && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {fieldErrors.email}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="10-digit phone number"
                required
                style={{ borderColor: fieldErrors.phone ? '#ff4444' : '' }}
              />
              {fieldErrors.phone && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {fieldErrors.phone}
                </small>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                minLength={6}
                style={{ borderColor: fieldErrors.password ? '#ff4444' : '' }}
              />
              {fieldErrors.password && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {fieldErrors.password}
                </small>
              )}
              {!fieldErrors.password && formData.password && (
                <small className="form-hint" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  Password must be at least 6 characters with letters and numbers
                </small>
              )}
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
                onBlur={handleDocumentBlur}
                required
                style={{ borderColor: documentError ? '#ff4444' : '' }}
              />
              {documentError && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {documentError}
                </small>
              )}
              {!documentError && (
                <>
                  <small className="form-hint" style={{ marginTop: '4px', display: 'block' }}>
                    📄 Allowed format: JPEG only (JPG/JPEG)
                  </small>
                  <small className="form-hint" style={{ display: 'block' }}>
                    📏 Maximum file size: 5 MB
                  </small>
                  <small className="form-hint" style={{ display: 'block', marginTop: '4px' }}>
                    Upload a clear JPEG image of your government-issued ID (Aadhaar, PAN, License, or Passport)
                  </small>
                </>
              )}
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
                onBlur={handleBlur}
                placeholder="Enter your Aadhaar/PAN/License number"
                required
                style={{ borderColor: fieldErrors.documentNumber ? '#ff4444' : '' }}
              />
              {fieldErrors.documentNumber && (
                <small className="form-hint" style={{ color: '#ff4444', display: 'block', marginTop: '4px' }}>
                  {fieldErrors.documentNumber}
                </small>
              )}
              {!fieldErrors.documentNumber && (
                <small className="form-hint" style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  Enter the number from your uploaded document (Aadhaar: 12 digits, PAN: 10 characters, License: 10-20 characters)
                </small>
              )}
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



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
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    if (e.target.name === 'document') {
      setFormData({ ...formData, document: e.target.files[0] })
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.document) {
      setError('Please upload a government-issued document for verification')
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
      const errorMessage = err.response?.data?.message || 'Registration failed'
      let detailedError = errorMessage
      
      // If parameters are provided, show them
      if (err.response?.data?.parameters) {
        const params = err.response.data.parameters
        const passedParams = params.filter(p => p.passed).map(p => p.name)
        const failedParams = params.filter(p => !p.passed).map(p => p.name)
        
        detailedError = `${errorMessage}\n\nPassed: ${passedParams.join(', ') || 'None'}\nFailed: ${failedParams.join(', ') || 'None'}`
      }
      
      setError(detailedError)
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
                accept="image/*,.pdf"
                onChange={handleChange}
                required
              />
              <small className="form-hint">Upload a clear image of your government-issued ID</small>
            </div>
            <div className="form-group">
              <label className="form-label">Document Number</label>
              <input
                type="text"
                name="documentNumber"
                className="form-input"
                value={formData.documentNumber}
                onChange={handleChange}
                placeholder="Enter your Aadhaar/PAN/License number"
                required
              />
              <small className="form-hint">Enter the number from your uploaded document</small>
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



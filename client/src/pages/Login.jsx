import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import './Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(formData.email, formData.password)
      // Check if login was successful
      if (response && response.user) {
        navigate('/dashboard')
      } else {
        setError('Login failed - invalid response')
      }
    } catch (err) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Login failed'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Navbar />
      <div className="auth-container">
        <div className="auth-card">
          <h2>Login to RentEase</h2>
          {error && <div className="error-message">{error}</div>}
          <form onSubmit={handleSubmit}>
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
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="auth-footer">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Login



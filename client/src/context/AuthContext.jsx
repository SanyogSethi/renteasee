import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = {
        id: response.data._id,
        name: response.data.name,
        email: response.data.email,
        role: response.data.role,
        isVerified: response.data.isVerified
      }
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data && response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setUser(response.data.user)
        return response.data
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Login error in AuthContext:', error)
      throw error
    }
  }

  const register = async (formData) => {
    const response = await api.post('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    localStorage.setItem('token', response.data.token)
    localStorage.setItem('user', JSON.stringify(response.data.user))
    setUser(response.data.user)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}


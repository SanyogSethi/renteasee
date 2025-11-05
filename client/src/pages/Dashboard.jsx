import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import TenantDashboard from '../components/dashboard/TenantDashboard'
import OwnerDashboard from '../components/dashboard/OwnerDashboard'
import AdminDashboard from '../components/dashboard/AdminDashboard'
import './Dashboard.css'

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [activeChat, setActiveChat] = useState(null)

  useEffect(() => {
    const chatId = searchParams.get('chat')
    if (chatId) {
      setActiveChat(chatId)
    }
  }, [searchParams])

  if (authLoading) {
    return (
      <div className="app">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="app">
      <Navbar />
      <div className="dashboard">
        {user.role === 'tenant' && <TenantDashboard activeChat={activeChat} />}
        {user.role === 'owner' && <OwnerDashboard activeChat={activeChat} />}
        {user.role === 'admin' && <AdminDashboard />}
      </div>
      <Footer />
    </div>
  )
}

export default Dashboard



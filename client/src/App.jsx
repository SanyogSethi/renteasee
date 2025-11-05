import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PropertyDetails from './pages/PropertyDetails'
import PrivateRoute from './components/PrivateRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route path="/property/:id" element={<PropertyDetails />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App



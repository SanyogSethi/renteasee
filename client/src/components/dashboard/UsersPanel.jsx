import { useState, useEffect } from 'react'
import api from '../../utils/api'
import './DashboardPanels.css'

const UsersPanel = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async (userId, action) => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return

    try {
      await api.patch(`/admin/users/${userId}/block`, { action })
      fetchUsers()
    } catch (error) {
      console.error('Error blocking user:', error)
      alert('Failed to update user')
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await api.delete(`/admin/users/${userId}`)
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>
  }

  return (
    <div className="users-panel">
      <h2>User Management</h2>
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td className="user-role">{user.role}</td>
                <td>{user.isVerified ? '✓' : '✗'}</td>
                <td>{user.isBlocked ? 'Blocked' : 'Active'}</td>
                <td>
                  <div className="user-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleBlock(user._id, user.isBlocked ? 'unblock' : 'block')}
                    >
                      {user.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(user._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="empty-state">No users found</p>
        )}
      </div>
    </div>
  )
}

export default UsersPanel



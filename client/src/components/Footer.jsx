import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './Footer.css'

const Footer = () => {
  const { user } = useAuth()
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3 className="footer-title">RentEase</h3>
              <p className="footer-description">
                Your trusted platform for finding the perfect PG accommodation. 
                Connect with property owners and tenants seamlessly.
              </p>
            </div>

            <div className="footer-section">
              <h4 className="footer-heading">Quick Links</h4>
              <ul className="footer-links">
                <li><Link to="/">Home</Link></li>
                {user ? (
                  <li><Link to="/dashboard">Dashboard</Link></li>
                ) : (
                  <>
                    <li><Link to="/login">Login</Link></li>
                    <li><Link to="/register">Register</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div className="footer-section">
              <h4 className="footer-heading">Contact</h4>
              <ul className="footer-contact">
                <li>
                  <span className="footer-icon">📧</span>
                  <span>help.rease@gmail.com</span>
                </li>
                <li>
                  <span className="footer-icon">📞</span>
                  <span>+91 7009614242</span>
                </li>
                <li>
                  <span className="footer-icon">📍</span>
                  <span>India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} RentEase. All rights reserved.</p>
            <div className="footer-legal">
              <Link to="/">Privacy Policy</Link>
              <span className="footer-separator">|</span>
              <Link to="/">Terms of Service</Link>
              <span className="footer-separator">|</span>
              <Link to="/">About Us</Link>
            </div>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button 
          className="scroll-to-top" 
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}
    </>
  )
}

export default Footer


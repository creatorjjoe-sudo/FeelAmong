import React, { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import { replaceWithRoutedModal } from '../../utils/routedModal'
import '../../styles/components/dashboard/profile-menu.css'

function ProfileMenuModal({ open, onClose, anchorRef }) {
  const [anchorStyle, setAnchorStyle] = React.useState({})
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useContext(AuthContext)
  const isAnonymous = !user || user.isAnonymous === true

  React.useEffect(() => {
    if (!open) return undefined

    const updateAnchor = () => {
      if (window.innerWidth < 800) {
        setAnchorStyle({})
        return
      }
      const bounds = anchorRef?.current?.getBoundingClientRect()
      if (bounds) {
        setAnchorStyle({
          left: `${bounds.left}px`,
          bottom: `${Math.max(window.innerHeight - bounds.bottom, 12)}px`,
          width: `${bounds.width}px`,
        })
      }
    }

    updateAnchor()
    window.addEventListener('resize', updateAnchor)
    return () => window.removeEventListener('resize', updateAnchor)
  }, [anchorRef, open])

  React.useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  const openDestination = (path) => {
    replaceWithRoutedModal(navigate, path, null, location)
  }

  const handleAccountAction = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div
      className="profile-menu-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="profile-menu-panel"
        style={anchorStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Profile menu"
      >
        <div className="profile-menu-heading">
          <h2>Account</h2>
          <button className="profile-menu-close" type="button" onClick={onClose} aria-label="Close account menu">
            Close
          </button>
        </div>
        <nav className="profile-menu-options" aria-label="Account options">
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/profile')}>
            <span className="profile-menu-option-icon profile-menu-user-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <span className="profile-menu-option-copy">
              <span>View profile</span>
              <small>Your profile and posts</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/saved')}>
            <span className="profile-menu-option-icon" aria-hidden="true">
              <img src={ICONS.saved} alt="" />
            </span>
            <span className="profile-menu-option-copy">
              <span>Saved items</span>
              <small>Your saved posts and videos</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/settings')}>
            <span className="profile-menu-option-icon" aria-hidden="true">
              <img src={ICONS.settings} alt="" />
            </span>
            <span className="profile-menu-option-copy">
              <span>Settings</span>
              <small>Coming soon</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option profile-menu-logout" onClick={handleAccountAction}>
            <span className="profile-menu-option-icon profile-menu-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </span>
            <span className="profile-menu-option-copy">
              <span>{isAnonymous ? 'Login' : 'Logout'}</span>
              <small>{isAnonymous ? 'Return to the login page' : 'Sign out of this account'}</small>
            </span>
          </button>
        </nav>
      </section>
    </div>
  )
}

export default ProfileMenuModal

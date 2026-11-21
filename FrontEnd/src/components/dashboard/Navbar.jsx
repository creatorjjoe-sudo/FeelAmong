import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import SearchModal from './SearchModal'
import ProfileMenuModal from './ProfileMenuModal'
import LoginRequiredModal from './LoginRequiredModal'
import NotificationBell from './NotificationBell'
import { getProfileAvatar } from '../../utils/profileAvatar'
import '../../styles/components/dashboard/navbar.css'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'

function Navbar({ activeView, switchActive, unreadMessageCount = 0, isOwnProfileRoute, unreadNotificationCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)
  const navbarRef = React.useRef(null)
  const profileButtonRef = React.useRef(null)
  const searchOpen = location.state?.routedModal === 'desktop-search'
  const profileMenuOpen = location.state?.routedModal === 'desktop-profile-menu'
  const isLoginRequiredOpen = location.state?.routedModal === 'navbar-login-required'
  const openSearch = () => pushRoutedModal(navigate, location, 'desktop-search')
  const closeSearch = () => closeRoutedModal(navigate, location)
  const openProfileMenu = () => pushRoutedModal(navigate, location, 'desktop-profile-menu')
  const closeProfileMenu = () => closeRoutedModal(navigate, location)

  const posts = []
  const videos = []

  React.useEffect(() => {
    if (location.pathname.includes('/profile')) switchActive(isOwnProfileRoute ? 'profile' : '')
    else if (location.pathname.includes('/notifications')) switchActive('notifications')
    else if (location.pathname.includes('/friends')) switchActive('friends')
    else if (location.pathname.includes('/for-you')) switchActive('for-you')
    else if (location.pathname.includes('/messages')) switchActive('messages')
    else if (location.pathname.includes('/videos')) switchActive('videos')
  }, [isOwnProfileRoute, location.pathname, switchActive])

  function handleCreate() {
    if (!user || user.isAnonymous === true) {
      pushRoutedModal(navigate, location, 'navbar-login-required')
      return
    }

    navigate(user.isCompany ? '/video-create-one' : '/post-create-one')
  }

  async function handleLogin() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="navbar-wrapper" ref={navbarRef}>
      <h1 className="app-logo">feelamong</h1>

      <button className="search-wrapper" type="button" onClick={openSearch}>
        <img className="search-icon" src={ICONS.search} alt="" />
        <span className="search-holder">Search</span>
      </button>

      <Link className="dash-link" to="/for-you">
        <div className="nav-title for-you">
          <div className="icon-wrapper home">
            <img className={activeView !== 'for-you' ? 'inactive-nav-icon' : undefined} src={activeView !== 'for-you' ? ICONS.homeInactive : ICONS.homeActive} alt="" />
            {posts.length > 0 && <p className="notif-length home">{posts.length}</p>}
          </div>
          <h2 className={`title ${activeView === 'for-you' ? 'active' : ''}`}>For you</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/messages">
        <div className="nav-title msgs">
          <div className="icon-wrapper msg">
            <img className={activeView !== 'messages' ? 'inactive-nav-icon' : undefined} src={activeView !== 'messages' ? ICONS.messageInactive : ICONS.messageActive} alt="" />
            {unreadMessageCount > 0 && <p className="notif-length msg">{unreadMessageCount}</p>}
          </div>
          <h2 className={`title ${activeView === 'messages' ? 'active' : ''}`}>Messages</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/friends" aria-label="Friends">
        <div className="nav-title friends">
          <div className="icon-wrapper friends-nav-icon">
            <svg viewBox="0 0 24 24" className={activeView === 'friends' ? 'is-active' : undefined} aria-hidden="true">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
              <path d="M16 5.2a3.3 3.3 0 0 1 0 6.3M17 14a5.7 5.7 0 0 1 4.5 5.5" />
            </svg>
          </div>
          <h2 className={`title ${activeView === 'friends' ? 'active' : ''}`}>Friends</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/videos">
        <div className="nav-title videos">
          <div className="icon-wrapper video">
            <img className={activeView !== 'videos' ? 'inactive-nav-icon' : undefined} src={activeView !== 'videos' ? ICONS.videoInactive : ICONS.videoActive} alt="" />
            {videos.length > 0 && <p className="notif-length video">{videos.length}</p>}
          </div>
          <h2 className={`title ${activeView === 'videos' ? 'active' : ''}`}>Videos</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/notifications">
        <div className="nav-title notifications">
          <div className="icon-wrapper notifications-nav-icon">
            <svg
              viewBox="2.5 1.5 19 21.5"
              className={activeView === 'notifications' ? 'is-active' : undefined}
              aria-hidden="true"
            >
              <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />
              <path d="M12 2a7 7 0 0 0-7 7v3.28l-1.6 3.2A1 1 0 0 0 4.31 17h15.38a1 1 0 0 0 .9-1.52L19 12.28V9a7 7 0 0 0-7-7Z" />
            </svg>
            {unreadNotificationCount > 0 && (
              <p className="notif-length notification">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</p>
            )}
          </div>
          <h2 className={`title ${activeView === 'notifications' ? 'active' : ''}`}>Updates</h2>
        </div>
      </Link>

      <button className="create-btn" type="button" onClick={handleCreate}>
        {user?.isCompany ? 'Create video' : 'Create post'}
      </button>



      <button
        ref={profileButtonRef}
        className="dash-link profile-nav-link"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={profileMenuOpen}
        onClick={openProfileMenu}
      >
        <div className="nav-title profile">
          <div className={`icon-wrapper profile-nav-icon${activeView === 'profile' ? ' is-active' : ''}`}>
            {typeof user?.avatar === 'string' && user.avatar.trim()
              ? <img className="profile-nav-avatar" src={getProfileAvatar(user)} alt="" />
              : (
                <svg viewBox="0 0 24 24" role="img" aria-label="Profile">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              )}
          </div>
          <h2 className={`title ${activeView === 'profile' ? 'active' : ''}`}>{user?.username || 'You'}</h2>
        </div>
      </button>
      <SearchModal
        open={searchOpen}
        onClose={closeSearch}
        anchorRef={navbarRef}
        modalKey="desktop-search"
      />
      <ProfileMenuModal
        open={profileMenuOpen}
        onClose={closeProfileMenu}
        anchorRef={profileButtonRef}
      />
      {isLoginRequiredOpen && (
        <LoginRequiredModal
          message="Please login to create a post"
          onClose={() => closeRoutedModal(navigate, location)}
          onLogin={handleLogin}
        />
      )}
    </div>
  )
}

export default Navbar

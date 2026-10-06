import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import SearchModal from './SearchModal'
import LoginRequiredModal from './LoginRequiredModal'
import CreatePostMenu from './CreatePostMenu'
import '../../styles/components/dashboard/navbar.css'

function Navbar({ activeView, switchActive, unreadMessageCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)
  const navbarRef = React.useRef(null)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [showLoginModal, setShowLoginModal] = React.useState(false)
  const isAnonymous = !user || user.isAnonymous === true

  const posts = []
  const videos = []

  React.useEffect(() => {
    if (location.pathname.includes('/profile')) switchActive('profile')
    else if (location.pathname.includes('/for-you')) switchActive('for-you')
    else if (location.pathname.includes('/messages')) switchActive('messages')
    else if (location.pathname.includes('/videos')) switchActive('videos')
  }, [location.pathname, switchActive])

  async function handleAccountAction() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleCreate(toggleMenu) {
    if (!user || user.isAnonymous === true) {
      setShowLoginModal(true)
      return
    }

    toggleMenu()
  }

  function handlePostTypeSelect(postType) {
    navigate(`/post-create-one?type=${postType}`)
  }

  async function handleLogin() {
    setShowLoginModal(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="navbar-wrapper" ref={navbarRef}>
      <h1 className="app-logo">feelamong</h1>

      <button className="search-wrapper" type="button" onClick={() => setSearchOpen(true)}>
        <img className="search-icon" src={ICONS.search} alt="" />
        <span className="search-holder">Search</span>
      </button>

      <Link className="dash-link" to="/for-you">
        <div className="nav-title for-you">
          <div className="icon-wrapper home">
            <img src={activeView !== 'for-you' ? ICONS.homeInactive : ICONS.homeActive} alt="" />
            {posts.length > 0 && <p className="notif-length home">{posts.length}</p>}
          </div>
          <h2 className={`title ${activeView === 'for-you' ? 'active' : ''}`}>For you</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/messages">
        <div className="nav-title msgs">
          <div className="icon-wrapper msg">
            <img src={activeView !== 'messages' ? ICONS.messageInactive : ICONS.messageActive} alt="" />
            {unreadMessageCount > 0 && <p className="notif-length msg">{unreadMessageCount}</p>}
          </div>
          <h2 className={`title ${activeView === 'messages' ? 'active' : ''}`}>Messages</h2>
        </div>
      </Link>

      <Link className="dash-link" to="/for-you/videos">
        <div className="nav-title videos">
          <div className="icon-wrapper video">
            <img src={activeView !== 'videos' ? ICONS.videoInactive : ICONS.videoActive} alt="" />
            {videos.length > 0 && <p className="notif-length video">{videos.length}</p>}
          </div>
          <h2 className={`title ${activeView === 'videos' ? 'active' : ''}`}>Videos</h2>
        </div>
      </Link>

      <CreatePostMenu onSelect={handlePostTypeSelect}>
        {({ isOpen, toggle }) => (
          <button
            className="create-btn"
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            onClick={() => handleCreate(toggle)}
          >
            Create
          </button>
        )}
      </CreatePostMenu>

      <button
        className="logout-btn"
        type="button"
        onClick={handleAccountAction}
      >
        {isAnonymous ? 'Login' : 'Logout'}
      </button>
      <Link className="dash-link profile-nav-link" to="/for-you/profile">
        <div className="nav-title profile">
          <div className={`icon-wrapper profile-nav-icon${activeView === 'profile' ? ' is-active' : ''}`}>
            <svg viewBox="0 0 24 24" role="img" aria-label="Profile">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>
          <h2 className={`title ${activeView === 'profile' ? 'active' : ''}`}>You</h2>
        </div>
      </Link>
      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        anchorRef={navbarRef}
      />
      {showLoginModal && (
        <LoginRequiredModal
          message="Please login to create a post"
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  )
}

export default Navbar
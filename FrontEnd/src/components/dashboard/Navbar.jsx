import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import '../../styles/components/dashboard/navbar.css'

function Navbar({ activeView, switchActive }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useContext(AuthContext)

  const posts = []
  const messages = [1, 2, 3]
  const videos = []

  React.useEffect(() => {
    if (location.pathname.includes('/for-you')) switchActive('for-you')
    if (location.pathname.includes('/messages')) switchActive('messages')
    if (location.pathname.includes('/videos')) switchActive('videos')
  }, [location.pathname, switchActive])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="navbar-wrapper">
      <h1 className="app-logo">feelamong</h1>

      <div className="search-wrapper">
        <img className="search-icon" src={ICONS.search} alt="" />
        <span className="search-holder">Search</span>
      </div>

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
            {messages.length > 0 && <p className="notif-length msg">{messages.length}</p>}
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

      <Link to="/post-create-one" className="create-post-link">
        <button className="create-btn" type="button">Create</button>
      </Link>

      <button className="logout-btn" type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

export default Navbar
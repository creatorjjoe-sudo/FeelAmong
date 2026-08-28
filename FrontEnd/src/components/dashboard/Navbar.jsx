import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/navbar.css'

function Navbar() {
  const [activeView, setActiveView] = React.useState('for-you')
  const posts = []
  const messages = [1, 2, 3,]
  const videos = []
  return (
    <div className='navbar-wrapper'>
      <img className='app-logo' src={ICONS.appLogo} alt="" />

      <div className="search-wrapper">
        <img className='search-icon' src={ICONS.search} alt="" />
        <span>Search</span>
      </div>

      <div className="nav-title for-you" onClick={() => setActiveView('for-you')}>
        <div className="icon-wrapper home">
          <img src={ICONS.homeActive} alt="" />
          {posts.length > 0 && <p className='notif-length home'>{posts.length}</p>}
        </div>
        <h2 className={`title ${activeView === 'for-you' ? 'active' : ''}`}>For you</h2>
      </div>

      <div className="nav-title msgs" onClick={() => setActiveView('messages')}>
        <div className="icon-wrapper msg">
          <img src={ICONS.messageInactive} alt="" />
          {messages.length > 0 && <p className='notif-length msg'>{messages.length}</p>}
        </div>
        <h2 className={`title ${activeView === 'messages' ? 'active' : ''}`}>Messages</h2>
      </div>

      <div className="nav-title videos" onClick={() => setActiveView('videos')}>
        <div className="icon-wrapper video">
          <img src={ICONS.videoInactive} alt="" />
          {videos.length > 0 && <p className='notif-length video'>{videos.length}</p>}
        </div>
        <h2 className={`title ${activeView === 'videos' ? 'active' : ''}`}>Videos</h2>
      </div>
    <button className='create-btn'>Create</button>
    </div>
  )
}

export default Navbar
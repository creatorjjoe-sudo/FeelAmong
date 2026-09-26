import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/mobilefooter.css'

function MobileFooter({activeView, switchActive}) {

  const location = useLocation()

  const posts = []
  const messages = []
  const videos = []

  React.useEffect(() => {
    if(location.pathname.includes('/for-you')) setForYou()
    if(location.pathname.includes('/messages')) setMessages()
    if(location.pathname.includes('/videos')) setVideos()
  }, [location.pathname])

  function setForYou() {
    switchActive('for-you')
  }
  function setMessages() {
    switchActive('messages')
  }
  function setVideos() {
    switchActive('videos')
  }
  return (
    <div className='footer-wrapper'>

      <Link className='dash-link' to={'/for-you'}>
      <div className="nave-title for-you">
        <h2 className={`title ${activeView === 'for-you' ? 'active' : ''}`}>For you</h2>
        <div className="icon-wrapper home">
          <img src={activeView !== 'for-you' ? ICONS.homeInactive : ICONS.homeActive} alt="" />
          {posts.length > 0 && <p className='notif-length home'>{posts.length}</p>}
        </div>
      </div>
      </Link>

      <Link className='dash-link' to={'/for-you/messages'}>
      <div className="nave-title msgs">
        <h2 className={`title ${activeView === 'messages' ? 'active' : ''}`}>Messages</h2>
        <div className="icon-wrapper msg">
          <img src={activeView !== 'messages'? ICONS.messageInactive : ICONS.messageActive} alt="" />
          {messages.length > 0 && <p className='notif-length msg'>{messages.length}</p>}
        </div>
      </div>
      </Link>

      <Link className='dash-link' to={'/for-you/videos'}>
      <div className="nave-title videos">
        <h2 className={`title ${activeView === 'videos' ? 'active' : ''}`}>Videos</h2>
        <div className="icon-wrapper video">
          <img src={activeView !== 'videos' ? ICONS.videoInactive : ICONS.videoActive} alt="" />
          {videos.length > 0 && <p className='notif-length video'>{videos.length}</p>}
        </div>
      </div>
      </Link>
    </div>
  )
}

export default MobileFooter
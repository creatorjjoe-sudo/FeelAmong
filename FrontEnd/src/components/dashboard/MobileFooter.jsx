import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/mobilefooter.css'

function MobileFooter({activeView, switchActive}) {

  const posts = []
  const messages = [1, 2, 3,]
  const videos = []

  function setForYou() {
    switchActive('for-you')
    navigate('/dashboard/posts')
  }
  function setMessages() {
    switchActive('messages')
    navigate('/dashboard/messages')
  }
  function setVideos() {
    switchActive('videos')
    navigate('/dashboard/videos')
  }
  return (
    <div className='footer-wrapper'>

      <div className="nave-title for-you" onClick={setForYou}>
        <h2 className={`title ${activeView === 'for-you' ? 'active' : ''}`}>For you</h2>
        <div className="icon-wrapper home">
          <img src={ICONS.homeActive} alt="" />
          {posts.length > 0 && <p className='notif-length home'>{posts.length}</p>}
        </div>
      </div>

      <div className="nave-title msgs" onClick={setMessages}>
        <h2 className={`title ${activeView === 'messages' ? 'active' : ''}`}>Messages</h2>
        <div className="icon-wrapper msg">
          <img src={ICONS.messageInactive} alt="" />
          {messages.length > 0 && <p className='notif-length msg'>{messages.length}</p>}
        </div>
      </div>

      <div className="nave-title videos" onClick={setVideos}>
        <h2 className={`title ${activeView === 'videos' ? 'active' : ''}`}>Videos</h2>
        <div className="icon-wrapper video">
          <img src={ICONS.videoInactive} alt="" />
          {videos.length > 0 && <p className='notif-length video'>{videos.length}</p>}
        </div>
      </div>
    </div>
  )
}

export default MobileFooter
import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/navbar.css'

function Navbar() {
  const posts = []
  const messages = [1, 2, 3,]
  const videos = []
  return (
    <div className='navbar-wrapper'>

      <div className="icon-wrapper home">
        <img src={ICONS.homeActive} alt="" />
        {posts.length > 0 && <p className='notif-length home'>{posts.length}</p>}
      </div>

      <div className="icon-wrapper msg">
        <img src={ICONS.messageInactive} alt="" />
        {messages.length > 0 &&<p className='notif-length msg'>{messages.length}</p>}
      </div>
      <div className="icon-wrapper video">
        <img src={ICONS.videoInactive} alt="" />
        {videos.length > 0 && <p className='notif-length video'>{videos.length}</p>}
      </div>

    </div>
  )
}

export default Navbar
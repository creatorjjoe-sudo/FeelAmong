import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/navbar.css'

function Navbar() {
  return (
    <div className='navbar-wrapper'>

      <div className="home-icon-wrapper">
        <img src={ICONS.homeActive} alt="" />
      </div>

      <div className="msg-icon-wrapper">
        <img src={ICONS.messageInactive} alt="" />
        <p className='msg-length'>3</p>
      </div>
      <div className="msg-icon-wrapper">
        <img src={ICONS.videoInactive} alt="" />
      </div>

    </div>
  )
}

export default Navbar
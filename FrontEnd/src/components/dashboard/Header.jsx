import React from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/header.css'

function Header() {
  return (
    <div className='header-container'>
     <div className="header-left">
      <img className='app-logo' src={ICONS.appLogo} alt="app-logo" />
      <div className="search-bar">
       <label className='label-desktop' htmlFor="search-input"><img src={ICONS.search} alt="" /></label> <input id='search-input' type="text" placeholder='search feelamong' />
       </div>
     </div>
     <label htmlFor="search-input"><img className='search-icon-mobile' src={ICONS.search} alt="search-icon" /></label>
     <img className='user-avata' src={ICONS.avata} alt="user-avata" />
    </div>
  )
}

export default Header
import React from 'react'
import { Link } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/mobileheader.css'

function MobileHeader() {
 return (
  <div className='header-wrapper'>
   <img className='app-logo' src={ICONS.appLogo} alt="" />
   <div className="right-elems">
    <div className="search-wrapper">
    <img className='search-icon' src={ICONS.search} alt="" />
   </div>
   <Link to={'/post-create-one'}>
    <img className='plus-circle' src={ICONS.pluscircle} alt="" />
   </Link>
   <img className='user-avata' src={ICONS.avata} alt="" />
   </div>
  </div>
 )
}

export default MobileHeader
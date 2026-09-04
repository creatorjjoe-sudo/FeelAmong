import React from 'react'
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
   <img className='plus-circle' src={ICONS.pluscircle} alt="" />
   <img className='user-avata' src={ICONS.avata} alt="" />
   </div>
  </div>
 )
}

export default MobileHeader
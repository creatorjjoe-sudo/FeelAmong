import React from 'react'
import { Link } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import SearchModal from './SearchModal'
import '../../styles/components/dashboard/mobileheader.css'

function MobileHeader() {
 const headerRef = React.useRef(null)
 const [searchOpen, setSearchOpen] = React.useState(false)

 return (
    <div className='header-wrapper' ref={headerRef}>
   <img className='app-logo' src={ICONS.appLogo} alt="" />
   <div className="right-elems">
    <button className="search-wrapper" type="button" aria-label="Open search" onClick={() => setSearchOpen(true)}>
    <img className='search-icon' src={ICONS.search} alt="" />
    </button>
   <Link to={'/post-create-one'}>
    <img className='plus-circle' src={ICONS.pluscircle} alt="" />
   </Link>
   <img className='user-avata' src={ICONS.avata} alt="" />
   </div>
    <SearchModal
     open={searchOpen}
     onClose={() => setSearchOpen(false)}
     anchorRef={headerRef}
    />
  </div>
 )
}

export default MobileHeader
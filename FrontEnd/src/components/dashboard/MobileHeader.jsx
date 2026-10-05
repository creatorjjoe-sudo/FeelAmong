import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import SearchModal from './SearchModal'
import LoginRequiredModal from './LoginRequiredModal'
import '../../styles/components/dashboard/mobileheader.css'

function MobileHeader() {
 const headerRef = React.useRef(null)
 const [searchOpen, setSearchOpen] = React.useState(false)
 const [showLoginModal, setShowLoginModal] = React.useState(false)
 const { user, logout } = useContext(AuthContext)
 const navigate = useNavigate()

 async function handleCreate() {
  if (!user || user.isAnonymous === true) {
   setShowLoginModal(true)
   return
  }

  navigate('/post-create-one')
 }

 async function handleLogin() {
  setShowLoginModal(false)
  await logout()
  navigate('/', { replace: true })
 }

 return (
    <div className='header-wrapper' ref={headerRef}>
   <img className='app-logo' src={ICONS.appLogo} alt="" />
   <div className="right-elems">
    <button className="search-wrapper" type="button" aria-label="Open search" onClick={() => setSearchOpen(true)}>
    <img className='search-icon' src={ICONS.search} alt="" />
    </button>
   <button className="create-post-mobile" type="button" onClick={handleCreate} aria-label="Create post">
    <img className='plus-circle' src={ICONS.pluscircle} alt="" />
   </button>
   <img className='user-avata' src={ICONS.avata} alt="" />
   </div>
    <SearchModal
     open={searchOpen}
     onClose={() => setSearchOpen(false)}
     anchorRef={headerRef}
    />
    {showLoginModal && (
     <LoginRequiredModal
      message="Please login to create a post"
      onClose={() => setShowLoginModal(false)}
      onLogin={handleLogin}
     />
    )}
  </div>
 )
}

export default MobileHeader
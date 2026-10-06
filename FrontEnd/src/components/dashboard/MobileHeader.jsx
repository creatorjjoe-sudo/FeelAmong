import React, { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import SearchModal from './SearchModal'
import LoginRequiredModal from './LoginRequiredModal'
import CreatePostMenu from './CreatePostMenu'
import '../../styles/components/dashboard/mobileheader.css'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'

function MobileHeader() {
 const headerRef = React.useRef(null)
 const [showLoginModal, setShowLoginModal] = React.useState(false)
 const { user, logout } = useContext(AuthContext)
 const navigate = useNavigate()
 const location = useLocation()
 const searchOpen = location.state?.routedModal === 'mobile-search'
 const openSearch = () => pushRoutedModal(navigate, location, 'mobile-search')
 const closeSearch = () => closeRoutedModal(navigate, location)

 function handleCreate(toggleMenu) {
  if (!user || user.isAnonymous === true) {
   setShowLoginModal(true)
   return
  }

  toggleMenu()
 }

 function handlePostTypeSelect(postType) {
  navigate(`/post-create-one?type=${postType}`)
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
    <button className="search-wrapper" type="button" aria-label="Open search" onClick={openSearch}>
    <img className='search-icon' src={ICONS.search} alt="" />
    </button>
   <CreatePostMenu className="create-post-menu-mobile" onSelect={handlePostTypeSelect}>
    {({ isOpen, toggle }) => (
     <button className="create-post-mobile" type="button" onClick={() => handleCreate(toggle)} aria-label="Create post" aria-expanded={isOpen} aria-haspopup="menu">
      <img className='plus-circle' src={ICONS.pluscircle} alt="" />
     </button>
    )}
   </CreatePostMenu>
   <button className="profile-shortcut" type="button" aria-label="Open profile" onClick={() => navigate('/for-you/profile')}>
    <img className='user-avata' src={getProfileAvatar(user)} alt="" />
   </button>
   </div>
    <SearchModal
     open={searchOpen}
     onClose={closeSearch}
     anchorRef={headerRef}
     modalKey="mobile-search"
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
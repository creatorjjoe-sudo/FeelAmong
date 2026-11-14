import React, { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import SearchModal from './SearchModal'
import ProfileMenuModal from './ProfileMenuModal'
import LoginRequiredModal from './LoginRequiredModal'
import '../../styles/components/dashboard/mobileheader.css'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'

function MobileHeader() {
 const headerRef = React.useRef(null)
 const profileButtonRef = React.useRef(null)
 const { user, logout } = useContext(AuthContext)
 const navigate = useNavigate()
 const location = useLocation()
 const searchOpen = location.state?.routedModal === 'mobile-search'
 const profileMenuOpen = location.state?.routedModal === 'mobile-profile-menu'
 const isLoginRequiredOpen = location.state?.routedModal === 'mobile-header-login-required'
 const openSearch = () => pushRoutedModal(navigate, location, 'mobile-search')
 const closeSearch = () => closeRoutedModal(navigate, location)
 const openProfileMenu = () => pushRoutedModal(navigate, location, 'mobile-profile-menu')
 const closeProfileMenu = () => closeRoutedModal(navigate, location)

 function handleCreate() {
  if (!user || user.isAnonymous === true) {
   pushRoutedModal(navigate, location, 'mobile-header-login-required')
   return
  }

  navigate('/post-create-one')
 }

 async function handleLogin() {
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
   <button className="create-post-mobile" type="button" onClick={handleCreate} aria-label="Create post">
    <img className='plus-circle' src={ICONS.pluscircle} alt="" />
   </button>
   <button ref={profileButtonRef} className="profile-shortcut" type="button" aria-label="Open account menu" aria-haspopup="dialog" aria-expanded={profileMenuOpen} onClick={openProfileMenu}>
    <img className='user-avata' src={getProfileAvatar(user)} alt="" />
   </button>
   </div>
    <SearchModal
     open={searchOpen}
     onClose={closeSearch}
     anchorRef={headerRef}
     modalKey="mobile-search"
    />
    <ProfileMenuModal
     open={profileMenuOpen}
     onClose={closeProfileMenu}
     anchorRef={profileButtonRef}
    />
    {isLoginRequiredOpen && (
     <LoginRequiredModal
      message="Please login to create a post"
      onClose={() => closeRoutedModal(navigate, location)}
      onLogin={handleLogin}
     />
    )}
  </div>
 )
}

export default MobileHeader
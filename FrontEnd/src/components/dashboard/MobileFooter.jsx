import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import FriendsNavIcon from './FriendsNavIcon'
import '../../styles/components/dashboard/mobilefooter.css'
import '../../styles/components/dashboard/navbar.css'

function MobileFooter({
  activeView,
  switchActive,
  unreadMessageCount = 0,
  pendingFriendRequestCount = 0,
  unreadNotificationCount = 0,
  isOwnProfileRoute
}) {

  const location = useLocation()

  const posts = []
  const videos = []

  const wrapperRef = React.useRef(null)
  const iconRefs = React.useRef({})
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 })

  React.useEffect(() => {
    if (location.pathname.includes('/profile')) switchActive(isOwnProfileRoute ? 'profile' : '')
    else if (location.pathname.includes('/notifications')) switchActive('notifications')
    else if (location.pathname.includes('/friends')) switchActive('friends')
    else if (location.pathname.includes('/messages')) switchActive('messages')
    else if (location.pathname.includes('/videos')) switchActive('videos')
    else if (location.pathname.includes('/for-you')) switchActive('for-you')
  }, [isOwnProfileRoute, location.pathname, switchActive])

  // Keep the sliding indicator aligned with the active tab's icon
  React.useLayoutEffect(() => {
    function updateIndicator() {
      const iconEl = iconRefs.current[activeView]
      const wrapperEl = wrapperRef.current
      if (!iconEl || !wrapperEl) {
        setIndicator((prev) => prev.width === 0 ? prev : { left: 0, width: 0 })
        return
      }
      const rect = iconEl.getBoundingClientRect()
      const wrapperRect = wrapperEl.getBoundingClientRect()
      // Wider than the icon itself, still centered on it
      const width = Math.min(rect.width + 40, wrapperRect.width / 5)
      setIndicator({
        left: rect.left - wrapperRect.left + rect.width / 2 - width / 2,
        width
      })
    }
    // Run after layout settles so the newly active tab is measured correctly
    const frame = requestAnimationFrame(updateIndicator)
    window.addEventListener('resize', updateIndicator)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeView, location.pathname])

  return (
    <div className='footer-wrapper' ref={wrapperRef}>
      <span
        className={`footer-slide-indicator${indicator.width === 0 ? ' is-hidden' : ''}`}
        style={{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }}
        aria-hidden='true'
      />

      <Link className='dash-link' to={'/for-you'}>
        <div className="nave-title for-you">
          <div className="icon-wrapper home" ref={(el) => { iconRefs.current['for-you'] = el }}>
            <img className={activeView !== 'for-you' ? 'inactive-nav-icon' : undefined} src={activeView !== 'for-you' ? ICONS.homeInactive : ICONS.homeActive} alt="" />
            {posts.length > 0 && <p className='notif-length home'>{posts.length}</p>}
          </div>
        </div>
      </Link>

      <Link className='dash-link' to={'/for-you/messages'}>
        <div className="nave-title msgs">
          <div className="icon-wrapper msg" ref={(el) => { iconRefs.current['messages'] = el }}>
            <img className={activeView !== 'messages' ? 'inactive-nav-icon' : undefined} src={activeView !== 'messages' ? ICONS.messageInactive : ICONS.messageActive} alt="" />
            {unreadMessageCount > 0 && <p className='notif-length msg'>{unreadMessageCount}</p>}
          </div>
        </div>
      </Link>

      <Link
        className='dash-link'
        to={'/for-you/friends'}
        aria-label={pendingFriendRequestCount
          ? `Friends, ${pendingFriendRequestCount} pending request${pendingFriendRequestCount === 1 ? '' : 's'}`
          : 'Friends'}
      >
        <div className="nave-title friends">
          <div className="icon-wrapper friends-nav-icon" ref={(el) => { iconRefs.current['friends'] = el }}>
            <FriendsNavIcon active={activeView === 'friends'} />
            {pendingFriendRequestCount > 0 && (
              <p className='notif-length friend'>
                {pendingFriendRequestCount > 99 ? '99+' : pendingFriendRequestCount}
              </p>
            )}
          </div>
        </div>
      </Link>

      <Link className='dash-link' to={'/for-you/videos'}>
        <div className="nave-title videos">
          <div className="icon-wrapper video" ref={(el) => { iconRefs.current['videos'] = el }}>
            <img className={activeView !== 'videos' ? 'inactive-nav-icon' : undefined} src={activeView !== 'videos' ? ICONS.videoInactive : ICONS.videoActive} alt="" />
            {videos.length > 0 && <p className='notif-length video'>{videos.length}</p>}
          </div>
        </div>
      </Link>

      <Link className='dash-link' to={'/for-you/notifications'} aria-label='Updates'>
        <div className="nave-title notifications">
          <div className="icon-wrapper notifications-nav-icon" ref={(el) => { iconRefs.current['notifications'] = el }}>
            <svg
              viewBox="2.5 1.5 19 21.5"
              className={activeView === 'notifications' ? 'is-active' : undefined}
              aria-hidden="true"
            >
              <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />
              <path d="M12 2a7 7 0 0 0-7 7v3.28l-1.6 3.2A1 1 0 0 0 4.31 17h15.38a1 1 0 0 0 .9-1.52L19 12.28V9a7 7 0 0 0-7-7Z" />
            </svg>
            {unreadNotificationCount > 0 && (
              <p className='notif-length notification'>{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</p>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

export default MobileFooter

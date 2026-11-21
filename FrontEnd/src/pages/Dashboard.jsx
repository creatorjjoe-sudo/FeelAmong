import React, { useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'
import MobileHeader from '../components/dashboard/MobileHeader'
import MobileFooter from '../components/dashboard/MobileFooter'
import Videos from '../components/dashboard/VideosFeed'
import Messages from '../components/dashboard/Messages'
import Notifications from '../components/dashboard/Notifications'
import FriendsPage from './FriendsPage'
import ProfilePage from './ProfilePage'
import SavedItemsPage from './SavedItemsPage'
import SaveToContainerPage from './SaveToContainerPage'
import CreateContainerPage from './CreateContainerPage'
import SettingsPage from './SettingsPage'
import CreateCompanyPage from './CreateCompanyPage'
import { AuthContext } from '../api/context/AuthContext'

function Dashboard({ isDarkMode, setIsDarkMode }) {
  const { user } = React.useContext(AuthContext)
  const location = useLocation()
  const profilePath = location.pathname.match(/^\/for-you\/profile(?:\/([^/]+))?\/?$/)
  const isOwnProfileRoute = Boolean(
    profilePath && (!profilePath[1] || profilePath[1] === String(user?._id))
  )
  const isVideosView = location.pathname.endsWith('/videos')
  const isSavePage = location.pathname.endsWith('/save')
  const isCreateContainerPage = location.pathname.endsWith('/create-container')
  const isFriendsPage = location.pathname.endsWith('/friends')
  const isUpdatesPage = location.pathname.endsWith('/notifications')
  const isDashboardModalPage = isSavePage || isCreateContainerPage || isFriendsPage
  const isForYouHome = /^\/for-you\/?$/.test(location.pathname)
  const shouldRenderPosts = isForYouHome || isDashboardModalPage
  const [activeView, setActiveView] = React.useState('for-you')
  const [unreadMessageCount, setUnreadMessageCount] = React.useState(0)
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0)
  // While the chrome's own data (unread counts) is still loading, the
  // navbar / mobile header / mobile footer shimmer on their real elements.
  const [isChromeLoading, setIsChromeLoading] = React.useState(true)
  const locationRef = React.useRef(location)
  const socketRef = React.useRef(null)
  const switchActive = useCallback((value) => {
    setActiveView(value)
  }, [])
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const API_ORIGIN = 'http://localhost:5000'

  const refreshUnreadMessageCount = useCallback(async () => {
    if (!user?._id || !token || user.isAnonymous) {
      setUnreadMessageCount(0)
      return
    }

    const response = await fetch(`${API_ORIGIN}/api/chats/unread/count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Could not load unread message count.')
    setUnreadMessageCount(Number(result.count) || 0)
  }, [token, user])

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!user?._id || !token || user.isAnonymous) {
      setUnreadNotificationCount(0)
      return
    }
    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not load notification count.')
      setUnreadNotificationCount(Number(result.unreadCount) || 0)
    } catch (error) {
      console.error(error.message)
    }
  }, [token, user])

  React.useEffect(() => {
    locationRef.current = location
  }, [location])

  React.useEffect(() => {
    let isActive = true

    async function loadUnreadCount() {
      try {
        await Promise.all([refreshUnreadMessageCount(), refreshUnreadNotificationCount()])
      } catch (error) {
        if (isActive) console.error(error.message)
      } finally {
        // The first completed count fetch ends the chrome's shimmer state.
        if (isActive) setIsChromeLoading(false)
      }
    }

    const handleUnreadChange = () => loadUnreadCount()
    window.addEventListener('unread-messages-changed', handleUnreadChange)
    window.addEventListener('unread-notifications-changed', handleUnreadChange)
    loadUnreadCount()
    return () => {
      isActive = false
      window.removeEventListener('unread-messages-changed', handleUnreadChange)
      window.removeEventListener('unread-notifications-changed', handleUnreadChange)
    }
  }, [refreshUnreadMessageCount, refreshUnreadNotificationCount, location.pathname, location.search])

  React.useEffect(() => {
    if (!user?._id || !token || user.isAnonymous) return undefined

    const socket = io(API_ORIGIN)
    socketRef.current = socket
    const syncChatPresence = (currentLocation) => {
      const contactId = currentLocation.pathname.endsWith('/messages')
        ? new URLSearchParams(currentLocation.search).get('user')
        : null
      socket.emit('set_chat_presence', contactId)
      if (contactId) {
        socket.emit('get_presence', contactId, (presence) => {
          if (presence && !presence.error) {
            window.dispatchEvent(new CustomEvent('user-presence-updated', { detail: presence }))
          }
        })
      }
    }
    socket.on('connect', () => {
      socket.emit('join_room', user._id)
      syncChatPresence(locationRef.current)
    })
    socket.on('presence_updated', (presence) => {
      window.dispatchEvent(new CustomEvent('user-presence-updated', { detail: presence }))
    })
    const requestPresence = (event) => {
      const contactId = event.detail?.userId
      if (!contactId) return
      socket.emit('get_presence', contactId, (presence) => {
        if (presence && !presence.error) {
          window.dispatchEvent(new CustomEvent('user-presence-updated', { detail: presence }))
        }
      })
    }
    window.addEventListener('request-user-presence', requestPresence)
    const forwardTyping = (event) => {
      if (event.detail) socket.emit('typing', event.detail)
    }
    socket.on('user_typing', (typing) => {
      window.dispatchEvent(new CustomEvent('user-typing-updated', { detail: typing }))
    })
    window.addEventListener('chat-typing', forwardTyping)
    // A message was edited or deleted-for-everywhere on another device:
    // surface the updated message to the open chat view.
    socket.on('message_updated', (message) => {
      if (message) window.dispatchEvent(new CustomEvent('chat-message-updated', { detail: message }))
    })
    socket.on('messages_read', (receipt) => {
      if (receipt) window.dispatchEvent(new CustomEvent('chat-messages-read', { detail: receipt }))
    })
    socket.on('receive_message', async (message) => {
      const senderId = String(message.sender?._id || message.sender)
      const currentLocation = locationRef.current
      const queryUserId = new URLSearchParams(currentLocation.search).get('user')
      const isOpenConversation = currentLocation.pathname.endsWith('/messages') && queryUserId === senderId

      try {
        if (isOpenConversation) {
          const response = await fetch(`${API_ORIGIN}/api/chats/${senderId}/read`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!response.ok) {
            const result = await response.json()
            throw new Error(result.message || 'Could not mark this conversation as read.')
          }
        }
        await refreshUnreadMessageCount()
        window.dispatchEvent(new CustomEvent('chat-message-received', { detail: message }))
      } catch (error) {
        console.error(error.message)
      }
    })

    // Live activity notifications (likes, comments, friend requests…)
    socket.on('notification', (notification) => {
      if (!notification) return
      window.dispatchEvent(new CustomEvent('notification-received', { detail: notification }))
      window.dispatchEvent(new CustomEvent('unread-notifications-changed', { detail: notification }))
    })

    return () => {
      window.removeEventListener('request-user-presence', requestPresence)
      window.removeEventListener('chat-typing', forwardTyping)
      socketRef.current = null
      socket.disconnect()
    }
  }, [refreshUnreadMessageCount, token, user?._id, user?.isAnonymous])

  React.useEffect(() => {
    locationRef.current = location
    const socket = socketRef.current
    if (!socket?.connected) return

    const contactId = location.pathname.endsWith('/messages')
      ? new URLSearchParams(location.search).get('user')
      : null
    socket.emit('set_chat_presence', contactId)
    if (contactId) {
      socket.emit('get_presence', contactId, (presence) => {
        if (presence && !presence.error) {
          window.dispatchEvent(new CustomEvent('user-presence-updated', { detail: presence }))
        }
      })
    }
  }, [location.pathname, location.search])

  return (
    <div className={`dashboard-container${isVideosView ? ' videos-active' : ''}${isUpdatesPage ? ' is-updates-page' : ''}${isChromeLoading && !isDashboardModalPage ? ' is-loading' : ''}`}>
      <title>Feelamong | Dashboard</title>
      {shouldRenderPosts && (
        <div
          className={`dashboard-posts-layer${isDashboardModalPage ? ' is-modal-underlay' : ''}`}
          aria-hidden={isDashboardModalPage}
          inert={isDashboardModalPage}
        >
          <Posts />
        </div>
      )}
      <MobileHeader />
      <Navbar
        activeView={activeView}
        switchActive={switchActive}
        unreadMessageCount={unreadMessageCount}
        isOwnProfileRoute={isOwnProfileRoute}
        unreadNotificationCount={unreadNotificationCount}
      />
      <MobileFooter
        activeView={activeView}
        switchActive={switchActive}
        unreadMessageCount={unreadMessageCount}
        unreadNotificationCount={unreadNotificationCount}
        isOwnProfileRoute={isOwnProfileRoute}
      />
      <Routes>
        <Route path="messages" element={<Messages />} />
        <Route path="videos" element={<Videos />} />
        <Route
          path="notifications"
          element={
            <Notifications
              unreadCount={unreadNotificationCount}
              onUnreadCountChanged={refreshUnreadNotificationCount}
            />
          }
        />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:userId" element={<ProfilePage />} />
        <Route path="company-create" element={<CreateCompanyPage />} />
        <Route path="saved" element={<SavedItemsPage />} />
        <Route path="save" element={<SaveToContainerPage />} />
        <Route path="save/create-container" element={<CreateContainerPage />} />
        <Route
          path="settings"
          element={<SettingsPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
        />
      </Routes>
    </div>
  )
}

export default Dashboard
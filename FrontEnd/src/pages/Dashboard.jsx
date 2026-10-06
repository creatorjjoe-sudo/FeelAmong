import React, { useCallback } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'
import MobileHeader from '../components/dashboard/MobileHeader'
import MobileFooter from '../components/dashboard/MobileFooter'
import Videos from '../components/dashboard/Videos'
import Messages from '../components/dashboard/Messages'
import ProfilePage from './ProfilePage'
import SavedItemsPage from './SavedItemsPage'
import SettingsPage from './SettingsPage'
import { AuthContext } from '../api/context/AuthContext'

function Dashboard({ isDarkMode, setIsDarkMode }) {
  const { user } = React.useContext(AuthContext)
  const location = useLocation()
  const [activeView, setActiveView] = React.useState('for-you')
  const [unreadMessageCount, setUnreadMessageCount] = React.useState(0)
  const locationRef = React.useRef(location)
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

  React.useEffect(() => {
    locationRef.current = location
  }, [location])

  React.useEffect(() => {
    let isActive = true

    async function loadUnreadCount() {
      try {
        await refreshUnreadMessageCount()
      } catch (error) {
        if (isActive) console.error(error.message)
      }
    }

    const handleUnreadChange = () => loadUnreadCount()
    window.addEventListener('unread-messages-changed', handleUnreadChange)
    loadUnreadCount()
    return () => {
      isActive = false
      window.removeEventListener('unread-messages-changed', handleUnreadChange)
    }
  }, [refreshUnreadMessageCount, location.pathname, location.search])

  React.useEffect(() => {
    if (!user?._id || !token || user.isAnonymous) return undefined

    const socket = io(API_ORIGIN)
    socket.on('connect', () => socket.emit('join_room', user._id))
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

    return () => {
      socket.disconnect()
    }
  }, [refreshUnreadMessageCount, token, user?._id, user?.isAnonymous])

  return (
    <div className='dashboard-container'>
      <title>Feelamong | Dashboard</title>
      <MobileHeader />
      <Navbar
        activeView={activeView}
        switchActive={switchActive}
        unreadMessageCount={unreadMessageCount}
      />

      <MobileFooter
        activeView={activeView}
        switchActive={switchActive}
        unreadMessageCount={unreadMessageCount}
      />

      <Routes>
        <Route index element={<Posts />} />
        <Route path="messages" element={<Messages />} />
        <Route path="videos" element={<Videos />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="profile/:userId" element={<ProfilePage />} />
        <Route path="saved" element={<SavedItemsPage />} />
        <Route
          path="settings"
          element={<SettingsPage isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
        />
      </Routes>
    </div>
  )
}

export default Dashboard
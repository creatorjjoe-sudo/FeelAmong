import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import '../../styles/components/dashboard/notifications.css'

const API_ORIGIN = 'http://localhost:5000'

function formatTimeAgo(createdAt) {
  if (!createdAt) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(createdAt).toLocaleDateString()
}

function buildActorName(actor) {
  if (!actor) return 'Someone'
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.username || 'Someone'
}

function buildMessage(type, actorName) {
  switch (type) {
    case 'like':
      return `${actorName} liked your post`
    case 'video_like':
      return `${actorName} liked your video`
    case 'comment':
      return `${actorName} commented on your post`
    case 'comment_reply':
      return `${actorName} replied to your comment`
    case 'video_comment':
      return `${actorName} commented on your video`
    case 'share':
      return `${actorName} shared your post`
    case 'post':
      return `${actorName} published a new post`
    case 'friend_request':
      return `${actorName} sent you a friend request`
    case 'friend_accept':
      return `${actorName} accepted your friend request`
    default:
      return `${actorName} interacted with you`
  }
}

// Small avatar for the actor of a notification
function ActorAvatar({ actor }) {
  return (
    <span className="notification-actor-avatar">
      {actor?.avatar
        ? <img src={getProfileAvatar(actor)} alt="" />
        : (
          <svg viewBox="0 0 24 24" role="img" aria-label="">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        )}
    </span>
  )
}

// Full-page notifications view, reachable from the navbar like
// For you / Messages / Videos.
function Notifications({ unreadCount, onUnreadCountChanged }) {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [notifications, setNotifications] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(10)
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  function getAuthHeaders() {
    return { Authorization: `Bearer ${token}` }
  }

  async function loadNotifications() {
    if (!token || user?.isAnonymous) return
    setIsLoading(true)
    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications?limit=50`, { headers: getAuthHeaders() })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not load notifications')
      setNotifications(result.notifications || [])
      setHasMore(Boolean(result.hasMore))
    } catch (error) {
      console.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?._id])

  // Listen for live notifications pushed over socket.io
  React.useEffect(() => {
    function handleLiveNotification(event) {
      const notification = event.detail
      if (!notification) return
      setNotifications((current) => [notification, ...current])
      onUnreadCountChanged?.()
    }
    window.addEventListener('notification-received', handleLiveNotification)
    return () => window.removeEventListener('notification-received', handleLiveNotification)
  }, [onUnreadCountChanged])

  async function markAllAsRead() {
    try {
      await fetch(`${API_ORIGIN}/api/notifications/read-all`, { method: 'PUT', headers: getAuthHeaders() })
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      onUnreadCountChanged?.()
    } catch (error) {
      console.error(error.message)
    }
  }

  async function markSingleRead(notification) {
    if (notification.isRead) return
    setNotifications((current) => current.map(
      (item) => (item._id === notification._id ? { ...item, isRead: true } : item)
    ))
    onUnreadCountChanged?.()
    try {
      await fetch(`${API_ORIGIN}/api/notifications/${notification._id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
    } catch (error) {
      console.error(error.message)
    }
  }

  async function respondToFriendRequest(notification, action) {
    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/${notification._id}/respond`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not respond to the request')
      setNotifications((current) => current.map(
        (item) => (item._id === notification._id ? { ...item, status: action, isRead: true } : item)
      ))
      onUnreadCountChanged?.()
    } catch (error) {
      console.error(error.message)
    }
  }

  function navigateToNotification(notification) {
    markSingleRead(notification)
    const { type, targetModel, actor } = notification
    if (type === 'friend_request' || type === 'friend_accept') {
      if (actor?._id) navigate(`/for-you/profile/${actor._id}`)
      return
    }
    if (targetModel === 'Video') {
      navigate('/for-you/videos')
      return
    }
    if (targetModel === 'Post') {
      navigate('/for-you')
    }
  }

  // The page isn't shown to anonymous/logged-out users
  if (!user || user.isAnonymous || !token) return null

  const shown = notifications.slice(0, visibleCount)

  return (
    <div className="notifications-page">
      <div className="notification-panel" role="region" aria-label="Notifications">
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <button className="notification-mark-all" type="button" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="notification-list">
          {isLoading && notifications.length === 0 && (
            <p className="notification-empty">Loading…</p>
          )}
          {!isLoading && notifications.length === 0 && (
            <p className="notification-empty">No notifications yet</p>
          )}

          {shown.map((notification) => {
            const actorName = buildActorName(notification.actor)
            const message = notification.message || buildMessage(notification.type, actorName)
            const isFriendRequest = notification.type === 'friend_request'
            const pending = isFriendRequest && notification.status === 'pending'
            return (
              <button
                key={notification._id}
                className={`notification-item${notification.isRead ? '' : ' is-unread'}`}
                type="button"
                onClick={() => navigateToNotification(notification)}
              >
                <ActorAvatar actor={notification.actor} />
                <span className="notification-body">
                  <span className="notification-text">{message}</span>
                  {notification.text && <span className="notification-preview">“{notification.text}”</span>}
                  <span className="notification-time">{formatTimeAgo(notification.createdAt)}</span>
                  {pending && (
                    <span className="notification-request-actions">
                      <button
                        className="notification-accept"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          respondToFriendRequest(notification, 'accepted')
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="notification-decline"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          respondToFriendRequest(notification, 'declined')
                        }}
                      >
                        Decline
                      </button>
                    </span>
                  )}
                  {isFriendRequest && notification.status === 'accepted' && (
                    <span className="notification-request-done">Friends ✓</span>
                  )}
                </span>
                {!notification.isRead && <span className="notification-dot" aria-label="Unread" />}
              </button>
            )
          })}

          {hasMore && notifications.length > visibleCount && (
            <button
              className="notification-load-more"
              type="button"
              onClick={() => setVisibleCount((count) => count + 10)}
            >
              Show more
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications

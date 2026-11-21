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

function getGroupKey(notification) {
  const isLike = notification.type === 'like' || notification.type === 'video_like'
  const targetId = notification.target?._id || notification.target
  if (!isLike || !targetId) return String(notification._id)
  return `${notification.type}:${notification.targetModel}:${targetId}`
}

function groupNotifications(notifications) {
  const groups = new Map()
  notifications.forEach((notification) => {
    const key = getGroupKey(notification)
    if (!groups.has(key)) {
      groups.set(key, { id: key, notification, notifications: [] })
    }
    groups.get(key).notifications.push(notification)
  })

  return [...groups.values()].sort(
    (first, second) => new Date(second.notification.createdAt) - new Date(first.notification.createdAt)
  )
}

function getCategory(type) {
  if (type === 'like' || type === 'video_like') return 'Likes'
  if (type === 'share') return 'Shares'
  if (type === 'comment' || type === 'comment_reply' || type === 'video_comment') return 'Comments'
  if (type === 'friend_request' || type === 'friend_accept') return 'Friends'
  return 'Posts'
}

function getNotificationCopy(group) {
  const notification = group.notification
  const isLike = notification.type === 'like' || notification.type === 'video_like'
  if (isLike && group.notifications.length > 1) {
    const actors = new Map()
    group.notifications.forEach((item) => {
      const actorId = item.actor?._id || item.actor || item.actorName || item._id
      if (!actors.has(String(actorId))) actors.set(String(actorId), item)
    })
    const uniqueActors = [...actors.values()]
    if (uniqueActors.length > 1) {
      const names = uniqueActors.slice(0, 2).map((item) => item.actorName || buildActorName(item.actor))
      const others = uniqueActors.length - names.length
      return {
        actorText: `${names.join(', ')}${others ? ` and ${others} other${others === 1 ? '' : 's'}` : ''}`,
        actionText: notification.type === 'video_like' ? ' liked your video' : ' liked your post'
      }
    }
  }

  const actorName = notification.actorName || buildActorName(notification.actor)
  const message = notification.message || buildMessage(notification.type, actorName)
  if (message.toLowerCase().startsWith(actorName.toLowerCase())) {
    return {
      actorText: message.slice(0, actorName.length),
      actionText: message.slice(actorName.length)
    }
  }
  return { message }
}

function getNotificationPreview(notification) {
  if (notification.text) return { text: notification.text, isComment: true }
  const target = notification.target
  const text = target?.title || target?.description || target?.shareCaption || target?.caption || ''
  return { text, isComment: false }
}

function ActorAvatar({ actor }) {
  return (
    <span className="update-avatar">
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
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasMore, setHasMore] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(10)
  const [collapsedGroups, setCollapsedGroups] = React.useState(() => new Set())
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  function getAuthHeaders() {
    return { Authorization: `Bearer ${token}` }
  }

  React.useEffect(() => {
    let active = true
    if (!token || user?.isAnonymous) return () => { active = false }

    async function loadNotifications() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/notifications?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load notifications')
        if (!active) return
        setNotifications(result.notifications || [])
        setHasMore(Boolean(result.hasMore))
      } catch (error) {
        if (active) console.error(error.message)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadNotifications()
    return () => { active = false }
  }, [token, user?._id, user?.isAnonymous])

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

  function navigateToNotification(notification, groupNotifications = [notification]) {
    groupNotifications.forEach(markSingleRead)
    const { type, targetModel, actor } = notification
    const targetId = notification.target?._id || notification.target
    if (type === 'friend_request' || type === 'friend_accept') {
      if (actor?._id) navigate(`/for-you/profile/${actor._id}`)
      return
    }
    if (targetModel === 'Video') {
      navigate('/for-you/videos')
      return
    }
    if (targetModel === 'Post') {
      if (targetId) {
        navigate(`/for-you?post=${encodeURIComponent(String(targetId))}`)
        return
      }
      navigate('/for-you')
    }
  }

  function toggleGroup(groupId) {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // The page isn't shown to anonymous/logged-out users
  if (!user || user.isAnonymous || !token) return null

  const groups = groupNotifications(notifications)
  const shown = groups.slice(0, visibleCount)

  return (
    <div className="notifications-page updates-page">
      <section className="updates-panel" role="region" aria-label="Updates">
        <header className="updates-header">
          <h1>Updates</h1>
          <div className="updates-menu-wrap">
            <button
              className="updates-menu-button"
              type="button"
              aria-label="More update options"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            {isMenuOpen && (
              <div className="updates-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={unreadCount === 0}
                  onClick={() => {
                    markAllAsRead()
                    setIsMenuOpen(false)
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="updates-list">
          {isLoading && notifications.length === 0 && <p className="notification-empty">Loading updates…</p>}
          {!isLoading && notifications.length === 0 && <p className="notification-empty">No updates yet</p>}

          {shown.map((group) => {
            const notification = group.notification
            const category = getCategory(notification.type)
            const copy = getNotificationCopy(group)
            const preview = getNotificationPreview(notification)
            const isFriendRequest = notification.type === 'friend_request'
            const pending = isFriendRequest && notification.status === 'pending'
            const isCollapsed = collapsedGroups.has(group.id)
            const isUnread = group.notifications.some((item) => !item.isRead)
            return (
              <article
                key={group.id}
                className={`update-item${isUnread ? ' is-unread' : ''}`}
              >
                <ActorAvatar actor={notification.actor} />
                <div className="update-content">
                  <div className="update-topline">
                    <span className={`update-category update-category-${category.toLowerCase()}`}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        {category === 'Likes' ? (
                          <path d="M7.5 10.2 11 4.5c.4-.7 1.1-.9 1.7-.6.7.3.9 1.1.7 1.8l-.9 2.8h4.8c1.2 0 1.9 1.1 1.6 2.2l-1.6 6.1c-.2.8-.9 1.3-1.7 1.3H8.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 0-.9ZM4 10h2v8H4z" />
                        ) : category === 'Shares' ? (
                          <path d="M14 4 22 11l-8 7v-4c-4.1 0-6.7 1.2-9 4 0-5.8 3-9 9-9V4Z" />
                        ) : category === 'Comments' ? (
                          <path d="M4 4h16v13H9l-5 4V4Z" />
                        ) : category === 'Friends' ? (
                          <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0m1-12a3 3 0 0 1 0 6m1 2a5 5 0 0 1 4 4" /></>
                        ) : (
                          <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
                        )}
                      </svg>
                      {category}
                    </span>
                    <button
                      className={`update-collapse${isCollapsed ? ' is-collapsed' : ''}`}
                      type="button"
                      aria-label={isCollapsed ? 'Expand update' : 'Collapse update'}
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m5 9 7 7 7-7" />
                      </svg>
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="update-details">
                      <button
                        className="update-open"
                        type="button"
                        onClick={() => navigateToNotification(notification, group.notifications)}
                      >
                        <span className="update-message">
                          {copy.actorText && <strong className="update-actor">{copy.actorText}</strong>}
                          {copy.actionText && <span className="update-action">{copy.actionText}</span>}
                          {copy.message && <span className="update-action">{copy.message}</span>}
                        </span>
                        {preview.text && (
                          <span className={`update-preview${preview.isComment ? ' is-comment' : ''}`}>
                            {preview.isComment ? `“${preview.text}”` : `: ${preview.text}`}
                          </span>
                        )}
                        <span className="update-time">{formatTimeAgo(notification.createdAt)}</span>
                      </button>
                      {pending && (
                        <div className="notification-request-actions">
                          <button
                            className="notification-accept"
                            type="button"
                            onClick={() => respondToFriendRequest(notification, 'accepted')}
                          >
                            Accept
                          </button>
                          <button
                            className="notification-decline"
                            type="button"
                            onClick={() => respondToFriendRequest(notification, 'declined')}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {isFriendRequest && notification.status === 'accepted' && (
                        <span className="notification-request-done">Friends ✓</span>
                      )}
                    </div>
                  )}
                </div>
              </article>
            )
          })}

          {hasMore && groups.length > visibleCount && (
            <button
              className="notification-load-more"
              type="button"
              onClick={() => setVisibleCount((count) => count + 10)}
            >
              Show more
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export default Notifications

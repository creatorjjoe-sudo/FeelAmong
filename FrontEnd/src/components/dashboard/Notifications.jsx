import React, { useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedDropdown, dismissRoutedDropdown, pushRoutedDropdown } from '../../utils/routedDropdown'
import '../../styles/components/dashboard/notifications.css'

import { API_ORIGIN } from '../../api/config'

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
      const displayedActors = uniqueActors.slice(0, 3)
      const others = uniqueActors.length - displayedActors.length
      const segments = []
      displayedActors.forEach((item, index) => {
        if (index > 0) {
          segments.push({
            text: others || index < displayedActors.length - 1 ? ', ' : ' and ',
            type: 'separator'
          })
        }
        segments.push({
          text: item.actorName || buildActorName(item.actor),
          type: 'actor',
          userId: item.actor?._id || (typeof item.actor === 'string' ? item.actor : '')
        })
      })
      if (others) {
        segments.push({ text: ' and ', type: 'separator' })
        segments.push({
          count: others,
          type: 'others',
          participants: uniqueActors.slice(3).map((item) => ({
            actor: item.actor,
            name: item.actorName || buildActorName(item.actor),
            userId: item.actor?._id || (typeof item.actor === 'string' ? item.actor : '')
          }))
        })
      }
      segments.push({
        text: notification.type === 'video_like' ? 'liked your video' : 'liked your post',
        type: 'action'
      })
      return segments
    }
  }

  const actorName = notification.actorName || buildActorName(notification.actor)
  const message = notification.message || buildMessage(notification.type, actorName)
  if (message.toLowerCase().startsWith(actorName.toLowerCase())) {
    return [
      {
        text: message.slice(0, actorName.length),
        type: 'actor',
        userId: notification.actor?._id || (typeof notification.actor === 'string' ? notification.actor : '')
      },
      { text: message.slice(actorName.length).trimStart(), type: 'action' }
    ]
  }
  return [{ text: message, type: 'action' }]
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
  const location = useLocation()
  const activeDropdown = location.state?.routedDropdown
  const [notifications, setNotifications] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasMore, setHasMore] = React.useState(false)
  const [visibleCount, setVisibleCount] = React.useState(10)
  const isMenuOpen = activeDropdown?.type === 'notifications-page-actions'
  const openUpdateMenuId = activeDropdown?.type === 'notification-actions'
    ? String(activeDropdown.id)
    : null
  const openParticipantsGroupId = activeDropdown?.type === 'notification-participants'
    ? String(activeDropdown.id)
    : null
  const [actionError, setActionError] = React.useState('')
  const updateMenuRefs = React.useRef(new Map())
  const participantsListRefs = React.useRef(new Map())
  const pageMenuRef = React.useRef(null)
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  function toggleDropdown(type, id) {
    if (activeDropdown?.type === type && String(activeDropdown.id || '') === String(id || '')) {
      closeRoutedDropdown(navigate, location, type)
      return
    }

    pushRoutedDropdown(navigate, location, { type, id })
  }

  const closeNotificationDropdown = React.useCallback(() => {
    if (activeDropdown?.type?.startsWith('notification')) {
      closeRoutedDropdown(navigate, location, activeDropdown.type)
    }
  }, [activeDropdown, location, navigate])

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

  React.useEffect(() => {
    if (!activeDropdown?.type?.startsWith('notification')) return undefined

    function handlePointerDown(event) {
      const dropdownRef = activeDropdown.type === 'notifications-page-actions'
        ? pageMenuRef
        : activeDropdown.type === 'notification-actions'
          ? { current: updateMenuRefs.current.get(String(activeDropdown.id)) }
          : { current: participantsListRefs.current.get(String(activeDropdown.id)) }
      if (!dropdownRef.current?.contains(event.target)) {
        closeNotificationDropdown()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeNotificationDropdown()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeDropdown, closeNotificationDropdown])
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
    if (activeDropdown?.type?.startsWith('notification')) {
      dismissRoutedDropdown(navigate, location, activeDropdown.type)
    }
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
        navigate(`/for-you?post=${encodeURIComponent(String(targetId))}`, {
          state: {
            postPreviewReturn: {
              url: `${location.pathname}${location.search}${location.hash}`,
              state: location.state || null,
            },
          },
        })
        return
      }
      navigate('/for-you')
    }
  }

  async function markUpdateUnread(group) {
    setActionError('')
    closeNotificationDropdown()
    const results = await Promise.all(group.notifications.map(async (notification) => {
      try {
        const response = await fetch(`${API_ORIGIN}/api/notifications/${notification._id}/read`, {
          method: 'PUT',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: false })
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not mark the update as unread')
        return { id: notification._id, error: '' }
      } catch (error) {
        return { id: notification._id, error: error.message }
      }
    }))
    const updatedIds = new Set(results.filter((result) => !result.error).map((result) => result.id))
    setNotifications((current) => current.map((notification) => (
      updatedIds.has(notification._id) ? { ...notification, isRead: false } : notification
    )))
    if (updatedIds.size) onUnreadCountChanged?.()
    const failure = results.find((result) => result.error)
    if (failure) setActionError(failure.error)
  }

  function updateReadState(group) {
    const markAsUnread = group.notifications.every((notification) => notification.isRead)
    if (markAsUnread) {
      markUpdateUnread(group)
    } else {
      group.notifications.forEach(markSingleRead)
      closeNotificationDropdown()
    }
  }

  async function deleteUpdate(group) {
    setActionError('')
    const results = await Promise.all(group.notifications.map(async (notification) => {
      try {
        const response = await fetch(`${API_ORIGIN}/api/notifications/${notification._id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not delete the update')
        return { id: notification._id, error: '' }
      } catch (error) {
        return { id: notification._id, error: error.message }
      }
    }))
    const deletedIds = new Set(results.filter((result) => !result.error).map((result) => result.id))
    setNotifications((current) => current.filter((notification) => !deletedIds.has(notification._id)))
    if (deletedIds.size) onUnreadCountChanged?.()
    const failures = results.filter((result) => result.error)
    if (failures.length) setActionError(failures[0].error)
    closeNotificationDropdown()
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
          <div className="updates-menu-wrap" ref={pageMenuRef}>
            <button
              className="updates-menu-button"
              type="button"
              aria-label="More update options"
              aria-expanded={isMenuOpen}
              onClick={() => toggleDropdown('notifications-page-actions')}
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
                    closeNotificationDropdown()
                    markAllAsRead()
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </header>

        {actionError && <p className="updates-action-error" role="alert">{actionError}</p>}

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
            const isUnread = group.notifications.some((item) => !item.isRead)
            const hasContentTarget = notification.targetModel === 'Post' || notification.targetModel === 'Video'
            return (
              <article
                key={group.id}
                className={`update-item${isUnread ? ' is-unread' : ''}`}
              >
                {notification.actor?._id ? (
                  <button
                    className="update-avatar-link"
                    type="button"
                    aria-label={`View ${buildActorName(notification.actor)} profile`}
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(`/for-you/profile/${notification.actor._id}`)
                    }}
                  >
                    <ActorAvatar actor={notification.actor} />
                  </button>
                ) : (
                  <ActorAvatar actor={notification.actor} />
                )}
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
                    <div
                      className="update-options-wrap"
                      ref={(element) => {
                        if (element) updateMenuRefs.current.set(group.id, element)
                        else updateMenuRefs.current.delete(group.id)
                      }}
                    >
                      <button
                        className="update-options-trigger"
                        type="button"
                        aria-label="Update options"
                        aria-expanded={openUpdateMenuId === group.id}
                        aria-haspopup="menu"
                        onClick={() => toggleDropdown('notification-actions', group.id)}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m5 9 7 7 7-7" />
                        </svg>
                      </button>
                      {openUpdateMenuId === group.id && (
                        <ul className="update-more-options" role="menu" aria-label="Update options">
                          <li role="none">
                            <button
                              className="update-more-option"
                              type="button"
                              role="menuitem"
                              onClick={() => updateReadState(group)}
                            >
                              {isUnread ? 'Mark update as read' : 'Mark as unread'}
                            </button>
                          </li>
                          <li role="none">
                            <button
                              className="update-more-option"
                              type="button"
                              role="menuitem"
                              onClick={() => deleteUpdate(group)}
                            >
                              Delete update
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="update-details">
                    <div className="update-open">
                      <div className="update-message">
                        {copy.map((segment, index) => {
                          if (segment.type === 'actor' && segment.userId) {
                            return (
                              <button
                                className="update-actor-link"
                                type="button"
                                key={`${group.id}-text-${index}`}
                                onClick={() => {
                                  dismissRoutedDropdown(navigate, location, 'notification-participants')
                                  navigate(`/for-you/profile/${segment.userId}`)
                                }}
                              >
                                {segment.text}
                              </button>
                            )
                          }
                          if (segment.type === 'others') {
                            return (
                              <div
                                className="update-others-wrap"
                                key={`${group.id}-text-${index}`}
                                ref={(element) => {
                                  if (element) participantsListRefs.current.set(group.id, element)
                                  else participantsListRefs.current.delete(group.id)
                                }}
                              >
                                <button
                                  className="update-others-link"
                                  type="button"
                                  aria-haspopup="dialog"
                                  aria-expanded={openParticipantsGroupId === group.id}
                                  onClick={() => toggleDropdown('notification-participants', group.id)}
                                >
                                  <strong className="update-emphasis">{segment.count}</strong>
                                  {segment.count === 1 ? ' other' : ' others'}
                                </button>
                                {openParticipantsGroupId === group.id && (
                                  <div className="update-participants-popover" role="dialog" aria-label="Other participants">
                                    <ul>
                                      {segment.participants.map((participant) => (
                                        <li key={participant.userId || participant.name}>
                                          {participant.userId ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                dismissRoutedDropdown(navigate, location, 'notification-participants')
                                                navigate(`/for-you/profile/${participant.userId}`)
                                              }}
                                            >
                                              <img src={getProfileAvatar(participant.actor)} alt="" />
                                              <span>{participant.name}</span>
                                            </button>
                                          ) : (
                                            <span>{participant.name}</span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          if (segment.type === 'action' && hasContentTarget) {
                            return (
                              <button
                                className="update-action-link"
                                type="button"
                                key={`${group.id}-text-${index}`}
                                onClick={() => navigateToNotification(notification, group.notifications)}
                              >
                                {segment.text}
                              </button>
                            )
                          }
                          return (
                            <span
                              className={segment.type === 'actor'
                                ? 'update-emphasis'
                                : segment.type === 'action'
                                  ? 'update-action update-action-copy'
                                  : 'update-action'}
                              key={`${group.id}-text-${index}`}
                            >
                              {segment.text}
                            </span>
                          )
                        })}
                      </div>
                      {preview.text && (hasContentTarget && !preview.isComment ? (
                        <button
                          className="update-preview-link"
                          type="button"
                          onClick={() => navigateToNotification(notification, group.notifications)}
                        >
                          <span className={`update-preview${preview.isComment ? ' is-comment' : ''}`}>
                            {preview.isComment ? `“${preview.text}”` : `: ${preview.text}`}
                          </span>
                        </button>
                      ) : (
                        <span className={`update-preview${preview.isComment ? ' is-comment' : ''}`}>
                          {preview.isComment ? `“${preview.text}”` : `: ${preview.text}`}
                        </span>
                      ))}
                      <span className="update-time">{formatTimeAgo(notification.createdAt)}</span>
                    </div>
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

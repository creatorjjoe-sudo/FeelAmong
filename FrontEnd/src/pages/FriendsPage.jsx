import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import { getProfileAvatar } from '../utils/profileAvatar'
import '../styles/pages/friends-page.css'

import { API_ORIGIN } from '../api/config'

function getDisplayName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ')
    || person?.username
    || 'User'
}

function FriendAvatar({ person }) {
  return (
    <img
      className="friends-avatar"
      src={getProfileAvatar(person)}
      alt=""
    />
  )
}

function FriendsPage() {
  const { user } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const [requests, setRequests] = React.useState([])
  const [suggestions, setSuggestions] = React.useState([])
  const [dismissedIds, setDismissedIds] = React.useState(() => new Set())
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [pendingActionId, setPendingActionId] = React.useState('')
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  React.useEffect(() => {
    let active = true

    async function loadFriendsData() {
      setIsLoading(true)
      setError('')
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [suggestionsResponse, notificationsResponse] = await Promise.all([
          fetch(`${API_ORIGIN}/api/users/suggestions`, { headers }),
          fetch(`${API_ORIGIN}/api/notifications?limit=100`, { headers }),
        ])
        const [suggestionsResult, notificationsResult] = await Promise.all([
          suggestionsResponse.json(),
          notificationsResponse.json(),
        ])
        if (!suggestionsResponse.ok) {
          throw new Error(suggestionsResult.message || 'Could not load friend suggestions.')
        }
        if (!notificationsResponse.ok) {
          throw new Error(notificationsResult.message || 'Could not load friend requests.')
        }
        if (!active) return
        setSuggestions(suggestionsResult.suggestions || [])
        setRequests((notificationsResult.notifications || []).filter(
          (notification) => notification.type === 'friend_request' && notification.status === 'pending'
        ))
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadFriendsData()
    return () => {
      active = false
    }
  }, [token, user?._id])

  async function respondToRequest(notification, action) {
    setPendingActionId(String(notification._id))
    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/${notification._id}/respond`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not respond to the friend request.')
      setRequests((current) => current.filter((item) => item._id !== notification._id))
      if (action === 'accepted' && notification.actor?._id) {
        setSuggestions((current) => current.filter(
          (person) => String(person._id) !== String(notification.actor._id)
        ))
      }
      window.dispatchEvent(new CustomEvent('unread-notifications-changed'))
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setPendingActionId('')
    }
  }

  async function addFriend(person) {
    setPendingActionId(String(person._id))
    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/users/${person._id}/friend`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not add this friend.')
      setSuggestions((current) => current.filter(
        (suggestion) => String(suggestion._id) !== String(person._id)
      ))
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setPendingActionId('')
    }
  }

  function dismissSuggestion(person) {
    setDismissedIds((current) => new Set([...current, String(person._id)]))
  }

  const visibleSuggestions = suggestions.filter((person) => !dismissedIds.has(String(person._id)))

  function closeFriends() {
    const historyIndex = window.history.state?.idx
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1)
      return
    }
    navigate('/for-you', { replace: true })
  }

  return (
    <div className="friends-page-backdrop" role="presentation">
      <section className="friends-page-dialog" role="dialog" aria-modal="true" aria-labelledby="friends-page-title">
        <header className="friends-page-header">
          <h1 id="friends-page-title">Friends</h1>
          <button type="button" className="friends-page-close" onClick={closeFriends} aria-label="Close friends">
            ×
          </button>
        </header>

        <div className="friends-page-content">
          {error && <p className="friends-page-error" role="alert">{error}</p>}

          <section className="friends-requests" aria-labelledby="friends-requests-title">
            <h2 id="friends-requests-title">Friend request</h2>
            {isLoading ? (
              <p className="friends-page-state">Loading friend requests...</p>
            ) : requests.length === 0 ? (
              <div className="friends-empty-state">
                <svg viewBox="0 0 220 180" aria-hidden="true">
                  <circle cx="110" cy="48" r="32" />
                  <path d="M37 158c2-37 30-58 73-58s71 21 73 58H37Z" />
                  <path d="m25 18 170 150" className="friends-empty-slash" />
                </svg>
                <h3>Friend request</h3>
                <p>You do not have pending friend request</p>
              </div>
            ) : (
              <div className="friends-request-list">
                {requests.map((notification) => (
                  <article className="friends-person-card" key={notification._id}>
                    <FriendAvatar person={notification.actor} />
                    <div className="friends-person-details">
                      <strong>{getDisplayName(notification.actor)}</strong>
                      <span>Sent you a friend request</span>
                    </div>
                    <div className="friends-person-actions">
                      <button
                        type="button"
                        className="friends-add-button"
                        disabled={pendingActionId === String(notification._id)}
                        onClick={() => respondToRequest(notification, 'accepted')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="friends-remove-button"
                        disabled={pendingActionId === String(notification._id)}
                        onClick={() => respondToRequest(notification, 'declined')}
                      >
                        Decline
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="friends-suggestions" aria-labelledby="friends-suggestions-title">
            <h2 id="friends-suggestions-title">You may know these people</h2>
            {isLoading ? (
              <p className="friends-page-state">Loading suggestions...</p>
            ) : visibleSuggestions.length === 0 ? (
              <p className="friends-page-state">No friend suggestions right now.</p>
            ) : (
              <div className="friends-suggestion-list">
                {visibleSuggestions.map((person) => (
                  <article className="friends-person-card" key={person._id}>
                    <FriendAvatar person={person} />
                    <div className="friends-person-details">
                      <strong>{getDisplayName(person)}</strong>
                      <span>
                        {person.commonFriendsCount
                          ? `${person.commonFriendsCount} common friend${person.commonFriendsCount === 1 ? '' : 's'}`
                          : 'No common friends'}
                      </span>
                    </div>
                    <div className="friends-person-actions">
                      <button
                        type="button"
                        className="friends-add-button"
                        disabled={pendingActionId === String(person._id)}
                        onClick={() => addFriend(person)}
                      >
                        Add friend
                      </button>
                      <button
                        type="button"
                        className="friends-remove-button"
                        onClick={() => dismissSuggestion(person)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

export default FriendsPage

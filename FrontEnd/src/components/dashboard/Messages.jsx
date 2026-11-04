import React, { useContext } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams, Link } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/message.css'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'

const API_ORIGIN = 'http://localhost:5000'

// Messages from the same sender sent less than this apart render as one
// bubble group: the corners where bubbles touch are squared off.
const GROUP_WINDOW_MS = 60 * 1000

// Formats a group timestamp: "Just now" within a minute of now, otherwise a
// clock time like "5:16 pm".
function formatGroupTime(timestamp) {
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return ''
  if (Date.now() - time < 60 * 1000) return 'Just now'
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(time).toLowerCase()
}

// Day header above a group: "Today", "Yesterday", or a weekday + date like
// "Saturday 17 Oct" for anything older.
function formatGroupDay(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThatDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysAgo = Math.round((startOfToday - startOfThatDay) / (24 * 60 * 60 * 1000))

  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function isSameDay(previousTimestamp, currentTimestamp) {
  const previous = new Date(previousTimestamp)
  const current = new Date(currentTimestamp)
  if (Number.isNaN(previous.getTime()) || Number.isNaN(current.getTime())) return true
  return previous.getFullYear() === current.getFullYear()
    && previous.getMonth() === current.getMonth()
    && previous.getDate() === current.getDate()
}

function isGroupedWith(previousMessage, currentMessage) {
  if (!previousMessage || !currentMessage) return false

  const previousSender = previousMessage.sender?._id || previousMessage.sender
  const currentSender = currentMessage.sender?._id || currentMessage.sender
  if (String(previousSender) !== String(currentSender)) return false

  const previousTime = new Date(previousMessage.createdAt).getTime()
  const currentTime = new Date(currentMessage.createdAt).getTime()
  if (Number.isNaN(previousTime) || Number.isNaN(currentTime)) return false

  return currentTime - previousTime >= 0 && currentTime - previousTime < GROUP_WINDOW_MS
}

function Messages() {
  const { user } = useContext(AuthContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedUserId = searchParams.get('user')
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const hasHistoryRef = React.useRef(false)

  const [windWidth, setWindWidth] = React.useState(window.innerWidth)
  const [selectedContact, setSelectedContact] = React.useState(null)
  const [conversations, setConversations] = React.useState([])
  const activeContact = selectedContact
  const chatActive = Boolean(requestedUserId && selectedContact?._id === requestedUserId)
  const [messages, setMessages] = React.useState([])
  const [messagesLoading, setMessagesLoading] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState('')
  const [openMessageMenuId, setOpenMessageMenuId] = React.useState(null)
  const messageMenuAnchorsRef = React.useRef(new Map())
  const longPressRef = React.useRef(null)
  const [replyToMessage, setReplyToMessage] = React.useState(null)
  const [editingMessageId, setEditingMessageId] = React.useState(null)
  const [editDraft, setEditDraft] = React.useState('')
  const [confirmDeleteMessage, setConfirmDeleteMessage] = React.useState(null)
  // Scope for the pending delete: 'everyone' (own messages, default) or 'me'.
  const [deleteScope, setDeleteScope] = React.useState('everyone')
  const [selectableMessageId, setSelectableMessageId] = React.useState(null)
  const selectableTextareaRef = React.useRef(null)

  // Close the message dropdown on outside click / Escape (same pattern as posts).
  React.useEffect(() => {
    if (!openMessageMenuId) return undefined

    function handlePointerDown(event) {
      if (!messageMenuAnchorsRef.current.get(openMessageMenuId)?.contains(event.target)) {
        setOpenMessageMenuId(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpenMessageMenuId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMessageMenuId])

  React.useEffect(() => {
    const handleResize = () => {
      setWindWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  React.useEffect(() => {
    if (!requestedUserId) return undefined

    let isActive = true

    async function loadContact() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/users/${requestedUserId}`)
        const contact = await response.json()
        if (!response.ok) throw new Error(contact.message || 'Could not load this user.')
        if (String(contact._id) === String(user?._id)) {
          throw new Error('You cannot start a chat with yourself.')
        }
        if (isActive) setSelectedContact(contact)
      } catch (loadError) {
        if (isActive) setError(loadError.message)
      }
    }

    loadContact()
    return () => {
      isActive = false
    }
  }, [requestedUserId, user?._id])

  React.useEffect(() => {
    if (!token || !user?._id) return undefined

    let isActive = true
    async function loadConversations() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/chats/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load conversations.')
        if (isActive) setConversations(Array.isArray(result) ? result : [])
      } catch (loadError) {
        if (isActive) setError(loadError.message)
      }
    }

    loadConversations()
    return () => {
      isActive = false
    }
  }, [token, user?._id, requestedUserId])

  React.useEffect(() => {
    const loadMessages = async () => {
      try {
        setMessagesLoading(true)
        if (!token) throw new Error('Log in to load this conversation.')
        const res = await fetch(`${API_ORIGIN}/api/chats/${activeContact._id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        })

        if (!res.ok) {
          const result = await res.json()
          throw new Error(result.message || 'Unable to load messages')
        }

        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
        const conversationsResponse = await fetch(`${API_ORIGIN}/api/chats/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const conversationData = await conversationsResponse.json()
        if (!conversationsResponse.ok) {
          throw new Error(conversationData.message || 'Could not refresh conversations.')
        }
        setConversations(Array.isArray(conversationData) ? conversationData : [])
        window.dispatchEvent(new Event('unread-messages-changed'))
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setMessagesLoading(false)
      }
    }

    if (!requestedUserId || !activeContact || String(activeContact._id) !== requestedUserId) return
    loadMessages()
  }, [requestedUserId, activeContact, token, user?._id, user?.token])

  React.useEffect(() => {
    const handleIncomingMessage = (event) => {
      const message = event.detail
      if (message && String(message.sender?._id || message.sender) === String(requestedUserId)) {
        setMessages((current) => (
          current.some((item) => String(item._id) === String(message._id))
            ? current
            : [...current, message]
        ))
      }

      if (!token) return
      fetch(`${API_ORIGIN}/api/chats/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response) => {
          const result = await response.json()
          if (!response.ok) throw new Error(result.message || 'Could not refresh conversations.')
          setConversations(Array.isArray(result) ? result : [])
        })
        .catch((loadError) => setError(loadError.message))
    }
    window.addEventListener('chat-message-received', handleIncomingMessage)
    const handleMessageUpdated = (event) => {
      const updated = event.detail
      if (!updated) return
      // "Delete for everyone" tombstones the message: swap the old bubble
      // content for the "This message was deleted" placeholder so the row
      // keeps its place in the feed instead of leaving a blank gap.
      setMessages((current) => current.map((item) => (
        String(item._id) === String(updated._id) ? { ...item, ...updated } : item
      )))
    }
    window.addEventListener('chat-message-updated', handleMessageUpdated)
    return () => {
      window.removeEventListener('chat-message-received', handleIncomingMessage)
      window.removeEventListener('chat-message-updated', handleMessageUpdated)
    }
  }, [requestedUserId, token])

  const middleClassName = windWidth < 800 && chatActive ? 'middle-section-mobile' : windWidth > 800 && chatActive ? 'middle-section-desk' : 'middle-section'
  const leftClassName = windWidth < 800 && chatActive ? 'left-section-active' : 'left-section'

  const handleSend = async (e) => {
    e.preventDefault()

    const trimmedMessage = draft.trim()
    if (!trimmedMessage || !token || !activeContact?._id) return

    const pendingMessage = {
      _id: `pending-${Date.now()}`, sender: user._id, recipient: activeContact._id, text: trimmedMessage, createdAt: new Date().toISOString(), replyTo: replyToMessage
    }
    setMessages((prev) => [...prev, pendingMessage]); setDraft(''); setSending(true); setError('')

    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({ recipientId: activeContact._id, text: trimmedMessage, replyTo: replyToMessage?._id || null })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Unable to send message')
      }

      setReplyToMessage(null)

      setMessages((prev) => prev.map((msg) => (msg._id === pendingMessage._id ? data : msg))
      )
      const conversationsResponse = await fetch(`${API_ORIGIN}/api/chats/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const conversationData = await conversationsResponse.json()
      if (!conversationsResponse.ok) {
        throw new Error(conversationData.message || 'Message sent, but conversations could not refresh.')
      }
      setConversations(Array.isArray(conversationData) ? conversationData : [])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.filter((msg) => msg._id !== pendingMessage._id))
    } finally {
      setSending(false)
    }
  }

  const handleSelect = (contactId) => {
    setError('')
    setReplyToMessage(null)
    setEditingMessageId(null)
    setOpenMessageMenuId(null)

    // If the same contact is clicked again, just reload their messages
    // instead of clearing them (the URL param won't change, so the
    // effects won't re-run and the chat would stay blank).
    if (String(selectedContact?._id) === String(contactId) && requestedUserId === String(contactId)) {
      const reload = async () => {
        try {
          const res = await fetch(`${API_ORIGIN}/api/chats/${contactId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (!res.ok) {
            const result = await res.json()
            throw new Error(result.message || 'Unable to load messages')
          }
          const data = await res.json()
          setMessages(Array.isArray(data) ? data : [])
        } catch (err) {
          setError(err.message)
        }
      }
      reload()
      return
    }

    setMessages([])
    // Push a history entry only for the first selected contact so the back
    // button returns to /for-you/messages. Subsequent selections replace the
    // entry, so back never walks through previously selected users.
    setSearchParams({ user: contactId }, { replace: hasHistoryRef.current })
    hasHistoryRef.current = true
  }

  function startReply(message) {
    setReplyToMessage(message)
    setOpenMessageMenuId(null)
  }

  function startSelect(message) {
    setSelectableMessageId(message._id)
    setOpenMessageMenuId(null)
  }

  function exitSelect() {
    setSelectableMessageId(null)
  }

  function startEdit(message) {
    setEditingMessageId(message._id)
    setEditDraft(message.text)
    setOpenMessageMenuId(null)
  }

  function cancelEdit() {
    setEditingMessageId(null)
    setEditDraft('')
  }

  async function saveEdit(event, message) {
    event.preventDefault()
    const trimmed = editDraft.trim()
    if (!trimmed || String(trimmed) === String(message.text)) {
      cancelEdit()
      return
    }
    try {
      const response = await fetch(`${API_ORIGIN}/api/chats/messages/${message._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: trimmed })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not edit the message.')
      setMessages((current) => current.map((item) => (
        String(item._id) === String(result._id)
          ? { ...item, text: result.text, editedAt: result.editedAt }
          : item
      )))
    } catch (editError) {
      setError(editError.message)
    } finally {
      cancelEdit()
    }
  }

  async function confirmDelete() {
    const message = confirmDeleteMessage
    if (!message) return
    const scope = deleteScope
    setConfirmDeleteMessage(null)
    try {
      const response = await fetch(`${API_ORIGIN}/api/chats/messages/${message._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scope })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not delete the message.')
      if (scope === 'me') {
        // Delete-for-me just removes the message from this user's view.
        setMessages((current) => current.filter((item) => String(item._id) !== String(result._id)))
      } else {
        setMessages((current) => current.map((item) => (
          String(item._id) === String(result._id)
            ? { ...item, text: result.text, deletedAt: result.deletedAt, replyTo: null }
            : item
        )))
      }
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className='chat-cover'>
      <div className="padder"></div>
      <div className="main-screen">

        <div className={leftClassName}>
          <h1>Chats</h1>
          {conversations.map((conversation) => (
            <button
              className={`chat-conversation-row${requestedUserId === String(conversation._id) ? ' is-selected' : ''}${conversation.unreadCount > 0 ? ' is-unread' : ''}`} key={conversation._id} type="button" onClick={() => handleSelect(String(conversation._id))}
            >
              <img
                className="user-avata-msg"
                src={getProfileAvatar(conversation)}
                alt=""
              />
              <span className="user-container">
                <span className="chat-conversation-text">
                  <p className="chat-conversation-name">{conversation.username}</p>
                  <p className="chat-conversation-preview">
                    {String(conversation.lastMessageSender) === String(user?._id) ? 'You: ' : ''}
                    {conversation.lastMessage || 'Say hello!'}
                  </p>
                </span>
                {conversation.unreadCount > 0 && <span className="msg-unread">{conversation.unreadCount}</span>}
              </span>
            </button>
          ))}
          {requestedUserId && selectedContact && !conversations.some((item) => String(item._id) === requestedUserId) && (
            <button className="chat-conversation-row is-selected" type="button" onClick={() => handleSelect(selectedContact._id)}>
              <img
                className="user-avata-msg"
                src={getProfileAvatar(selectedContact)}
                alt=""
              />
              <span className="user-container">
                <span className="chat-conversation-text">
                  <p className="chat-conversation-name">{selectedContact.username}</p>
                  <p className="chat-conversation-preview">Say hello!</p>
                </span>
              </span>
            </button>
          )}
          {!conversations.length && !requestedUserId && <p className="chat-empty-state">No conversations yet.</p>}
        </div>

        <div className={middleClassName}>
          <div className="chat-top"></div>
          {
            <div className="mobile-active-chat-header">
              <div className="header-left">
                <Link to={-1}>
                  <img className='back-icon' src={ICONS.backArrow} alt="" />
                </Link>
                <div className="active-user">
                  <img className='user-avata-msg' src={getProfileAvatar(selectedContact)} alt="" />
                  <div className="name-timeago">
                    <h2 className='active-user-username'>{selectedContact?.username}</h2>
                    <p>Active</p>
                  </div>
                </div>
              </div>

              <div className="header-right">
                <h2>Call</h2>
                <h2>Settings</h2>
              </div>
            </div>
          }
          {!chatActive ? (
            <div className="chat-no-user-selected">
              <svg
                className="chat-no-user-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
              </svg>
              <h2>No user is selected</h2>
            </div>
          ) : (
            <>
              <div className={`message-feed${messagesLoading ? ' is-loading' : ''}`}>
                {!messagesLoading && !messages.length && (
                  <p className="chat-empty-state">No messages yet. Say hello!</p>
                )}
                {messages.map((msg, index) => {
                  const isMine = String(msg.sender?._id || msg.sender) === String(user?._id)
                  // Squared-off corners sit where consecutive messages touch:
                  // for my messages (right-aligned) that is the bottom-right,
                  // for theirs (left-aligned) the bottom-left.
                  const groupedWithPrevious = isGroupedWith(messages[index - 1], msg)
                  const groupedWithNext = isGroupedWith(msg, messages[index + 1])
                  const tailCorner = isMine ? 'bottom-right' : 'bottom-left'

                  // A new day starts a group of its own, so a timestamp can
                  // only close a group when the next message is in it and on
                  // the same day (otherwise this bubble ends the day too).
                  const nextMessage = messages[index + 1]
                  const endsGroup = !groupedWithNext
                    || (nextMessage && !isSameDay(msg.createdAt, nextMessage.createdAt))
                  const startsNewDay = index === 0
                    || (messages[index - 1] && !isSameDay(messages[index - 1].createdAt, msg.createdAt))

                  const classes = ['message-row', isMine ? 'mine' : 'their']
                  if (groupedWithPrevious) classes.push('grouped-top')
                  if (groupedWithNext && !endsGroup) classes.push('grouped-bottom')

                  // A message still in flight (its id starts with "pending-")
                  // shows "Sending" in place of the timestamp, then swaps
                  // back to the normal clock time once the server confirms it.
                  const isPending = String(msg._id).startsWith('pending-')
                  const dayLabel = startsNewDay ? formatGroupDay(msg.createdAt) : null
                  const timeLabel = isPending
                    ? 'Sending'
                    : (endsGroup ? formatGroupTime(msg.createdAt) : null)

                  const timeElement = timeLabel && (
                    <time
                      key={`time-${msg._id}`}
                      className={`message-group-time${isPending ? ' is-sending' : ''}`}
                    >
                      {timeLabel}
                    </time>
                  )

                  // While a message is still in flight its "Sending" caption
                  // sits ABOVE the bubble (under the previous message); once
                  // the server confirms, the timestamp renders BELOW it as
                  // normal.
                  const canEdit = isMine && !isPending && !msg.deletedAt
                  // Delete is available on any message (own or the other
                  // person's) as long as it actually exists on the server.
                  const canDelete = !isPending && !msg.deletedAt
                  const isSelectable = selectableMessageId === msg._id
                  const isEditing = editingMessageId === msg._id

                  const elements = [
                    dayLabel && <strong key={`day-${msg._id}`} className="message-day-header">{dayLabel}</strong>,
                    isPending ? timeElement : null,
                    msg.replyTo && !msg.deletedAt && (
                      <div key={`reply-context-${msg._id}`} className="message-reply-context">
                        <span className="message-reply-label">
                          You replied to
                          {' '}
                          {String(msg.replyTo.sender?._id || msg.replyTo.sender) === String(user?._id)
                            ? 'yourself'
                            : (msg.replyTo.sender?.username || selectedContact?.username || 'them')}
                        </span>
                        <span className="message-reply-quote" aria-label="Replying to">
                          <span className="message-reply-quote-text">
                            {msg.replyTo.text}
                          </span>
                        </span>
                      </div>
                    ),
                    <div
                      key={msg._id}
                      data-tail={tailCorner}
                      className={classes.join(' ')}
                      onPointerDown={(event) => {
                        if (event.button !== 0 && event.pointerType === 'mouse') return
                        const startX = event.clientX
                        const startY = event.clientY
                        longPressRef.current = {
                          id: msg._id,
                          startX,
                          startY,
                          timer: setTimeout(() => {
                            longPressRef.current = null
                            setOpenMessageMenuId(msg._id)
                            if (navigator.vibrate) navigator.vibrate(30)
                          }, 500)
                        }
                      }}
                      onPointerMove={(event) => {
                        // Scrolling (finger moving) cancels the pending long-press.
                        if (!longPressRef.current) return
                        const dx = event.clientX - longPressRef.current.startX
                        const dy = event.clientY - longPressRef.current.startY
                        if (dx * dx + dy * dy > 100) {
                          clearTimeout(longPressRef.current.timer)
                          longPressRef.current = null
                        }
                      }}
                      onPointerUp={() => {
                        if (longPressRef.current) {
                          clearTimeout(longPressRef.current.timer)
                          longPressRef.current = null
                        }
                      }}
                      onPointerLeave={() => {
                        if (longPressRef.current) {
                          clearTimeout(longPressRef.current.timer)
                          longPressRef.current = null
                        }
                      }}
                      onContextMenu={(event) => {
                        // Desktop right-click also opens the menu, like a native chat app.
                        event.preventDefault()
                        setOpenMessageMenuId(msg._id)
                      }}
                      ref={(element) => {
                        if (element) messageMenuAnchorsRef.current.set(msg._id, element)
                        else messageMenuAnchorsRef.current.delete(msg._id)
                      }}
                    >
                      {isEditing ? (
                        <form className="message-edit-form" onSubmit={(event) => saveEdit(event, msg)}>
                          <input
                            autoFocus
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value)}
                            onBlur={() => cancelEdit()}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') cancelEdit()
                            }}
                            maxLength={1000}
                            aria-label="Edit message"
                          />
                          <button type="submit">Save</button>
                        </form>
                      ) : isSelectable ? (
                        // "Select" mode: the text is re-rendered inside a
                        // read-only textarea and fully pre-selected, so on
                        // mobile browsers (where a tap alone won't select
                        // bubble text) the user can immediately copy it.
                        <div className="message-select-mode">
                          <textarea
                            ref={selectableTextareaRef}
                            className="message-select-textarea"
                            readOnly
                            value={msg.text}
                            rows={Math.min(8, Math.max(1, Math.ceil((msg.text || '').length / 32)))}
                            aria-label="Select message text"
                          />
                          <div className="message-select-actions">
                            <button
                              type="button"
                              className="message-select-btn"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(msg.text)
                                } catch {
                                  selectableTextareaRef.current?.select()
                                }
                              }}
                            >
                              Copy
                            </button>
                            <button type="button" className="message-select-btn" onClick={exitSelect}>
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className={msg.deletedAt ? 'is-deleted' : ''}>
                          {msg.deletedAt ? 'This message was deleted' : msg.text}
                          {msg.editedAt && !msg.deletedAt && <em className="message-edited-badge"> (edited)</em>}
                        </p>
                      )}
                      {openMessageMenuId === msg._id && !isPending && (() => {
                        const bubbleElement = messageMenuAnchorsRef.current.get(msg._id)
                        const rect = bubbleElement?.querySelector('p, .message-edit-form, .message-reply-quote')?.getBoundingClientRect()
                          || bubbleElement?.getBoundingClientRect()
                        const menuPosition = rect
                          ? { top: rect.top + rect.height / 2 - 20, [isMine ? 'right' : 'left']: isMine ? window.innerWidth - rect.left + 10 : rect.right + 10 }
                          : { top: 0, left: 0 }
                        return (
                          <ul
                            className="message-more-options"
                            role="menu"
                            aria-label="Message options"
                            style={{
                              position: 'fixed',
                              top: menuPosition.top,
                              left: isMine ? 'auto' : menuPosition.left,
                              right: isMine ? menuPosition.right : 'auto',
                              transformOrigin: isMine ? 'right center' : 'left center',
                            }}
                          >
                          <li role="none">
                            <button className="message-more-option" type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); startReply(msg) }}>
                              <span>Reply</span>
                            </button>
                          </li>
                          {canEdit && (
                            <li role="none">
                              <button className="message-more-option" type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); startEdit(msg) }}>
                                <span>Edit</span>
                              </button>
                            </li>
                          )}
                          {!msg.deletedAt && (
                            <li role="none">
                              <button className="message-more-option" type="button" role="menuitem" onClick={(event) => { event.stopPropagation(); startSelect(msg) }}>
                                <span>Select</span>
                              </button>
                            </li>
                          )}
                          {canDelete && (
                            <li role="none">
                              <button className="message-more-option is-danger" type="button" role="menuitem" onClick={(event) => {
                                event.stopPropagation()
                                setOpenMessageMenuId(null)
                                setDeleteScope('everyone')
                                setConfirmDeleteMessage(msg)
                              }}>
                                <span>Delete</span>
                              </button>
                            </li>
                          )}
                        </ul>
                        )
                      })()}
                    </div>,
                    !isPending ? timeElement : null,
                  ]

                  return elements.filter(Boolean)
                })}
              </div>

              {error && <p className='chat-error'>{error}</p>}
            </>
          )}

          {!chatActive ? (
            <div className="msg-composer-skeleton" aria-hidden="true">
              <span className="msg-composer-skeleton-icon" />
              <span className="msg-composer-skeleton-icon msg-composer-skeleton-icon-mic" />
              <div className="msg-composer-skeleton-input">
                <span className="msg-composer-skeleton-line" />
              </div>
            </div>
          ) : (
            <form action="" className='msg-composer' onSubmit={handleSend}>
              <img className='attach-icon plus' src={ICONS.pluscircle} alt="" />
              <img className='attach-icon mic' src={ICONS.micGreen} alt="" />
              <div className="input-container">
                {replyToMessage && (
                  <div className="reply-preview-bar">
                    <div className="reply-preview-body">
                      <span className="reply-preview-label">Replying to</span>
                      <span className="reply-preview-text">{replyToMessage.text}</span>
                    </div>
                    <button type="button" className="reply-preview-cancel" aria-label="Cancel reply" onClick={() => setReplyToMessage(null)}>×</button>
                  </div>
                )}
                <div className="input-row">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder='Write message...' rows={1}></textarea>
                  <button className='send-btn' disabled={sending || !chatActive} type='submit'>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="right-section">
          <img className="chat-user-avata" src={getProfileAvatar(activeContact)} alt=""/>
          <div className="username-egts">
            {chatActive && (
              <>
                <h1>{activeContact?.username}</h1>
                <button>Add friend</button>
                <p>1.8K</p>
              </>
            )}

            {!chatActive && <h1>Last chatted user:</h1>}
          </div>
        </div>

        {confirmDeleteMessage && (() => {
          const isMineMessage = String(confirmDeleteMessage.sender?._id || confirmDeleteMessage.sender) === String(user?._id)
          // My message: choose between "everyone" (default) and "me".
          // Their message: show both options but only "me" is selectable,
          // "everyone" stays disabled.
          const dialogScope = isMineMessage ? deleteScope : 'me'
          return (
            createPortal(
              <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
                if (event.target === event.currentTarget) setConfirmDeleteMessage(null)
              }}>
                <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-message-title">
                  <h2 id="delete-message-title">Delete message</h2>
                  <div className="delete-scope-options" role="radiogroup" aria-label="Delete scope">
                    <label className={`delete-scope-option${!isMineMessage ? ' is-disabled' : ''}`}>
                      <input
                        type="radio"
                        name="delete-scope"
                        value="everyone"
                        disabled={!isMineMessage}
                        checked={isMineMessage ? dialogScope === 'everyone' : false}
                        onChange={() => setDeleteScope('everyone')}
                      />
                      <span>Delete for everyone</span>
                    </label>
                    <label className="delete-scope-option">
                      <input
                        type="radio"
                        name="delete-scope"
                        value="me"
                        checked={dialogScope === 'me'}
                        onChange={() => setDeleteScope('me')}
                      />
                      <span>Delete for me</span>
                    </label>
                  </div>
                  <p>{dialogScope === 'everyone' ? 'Delete this message for everyone? This cannot be undone.' : 'Remove this message from your chat? The other person will still see it.'}</p>
                  <div className="profile-dialog-actions">
                    <button type="button" onClick={() => setConfirmDeleteMessage(null)}>Cancel</button>
                    <button type="button" className="is-danger" onClick={confirmDelete}>Delete</button>
                  </div>
                </section>
              </div>,
              document.body
            )
          )
        })()}

      </div>
    </div>
  )
}

export default Messages
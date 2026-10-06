import React, { useContext } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/message.css'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'

const API_ORIGIN = 'http://localhost:5000'

function Messages() {
  const { user } = useContext(AuthContext)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedUserId = searchParams.get('user')
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  const [windWidth, setWindWidth] = React.useState(window.innerWidth)
  const [selectedContact, setSelectedContact] = React.useState(null)
  const [conversations, setConversations] = React.useState([])
  const activeContact = selectedContact
  const chatActive = Boolean(requestedUserId && selectedContact?._id === requestedUserId)
  const [messages, setMessages] = React.useState([])
  const [draft, setDraft] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState('')

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
    return () => window.removeEventListener('chat-message-received', handleIncomingMessage)
  }, [requestedUserId, token])

  const middleClassName = windWidth < 800 && chatActive ? 'middle-section-mobile' : windWidth > 800 && chatActive ? 'middle-section-desk' : 'middle-section'
  const leftClassName = windWidth < 800 && chatActive ? 'left-section-active' : 'left-section'

  const handleSend = async (e) => {
    e.preventDefault()

    const trimmedMessage = draft.trim()
    if (!trimmedMessage || !token || !activeContact?._id) return

    const pendingMessage = {
      _id: `pending-${Date.now()}`,
      sender: user._id,
      recipient: activeContact._id,
      text: trimmedMessage,
      createdAt: new Date().toISOString()
    }

    setMessages((prev) => [...prev, pendingMessage])
    setDraft('')
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/chats/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          recipientId: activeContact._id,
          text: trimmedMessage
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Unable to send message')
      }

      setMessages((prev) =>
        prev.map((msg) => (msg._id === pendingMessage._id ? data : msg))
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
    setMessages([])
    setError('')
    setSearchParams({ user: contactId })
  }

  return (
    <div className='chat-cover'>
      <div className="padder"></div>
      <div className="main-screen">

        <div className={leftClassName}>
          <h1>Chats</h1>
          {conversations.map((conversation) => (
            <button
              className={`chat-conversation-row${requestedUserId === String(conversation._id) ? ' is-selected' : ''}${conversation.unreadCount > 0 ? ' is-unread' : ''}`}
              key={conversation._id}
              type="button"
              onClick={() => handleSelect(String(conversation._id))}
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
          {!chatActive ? (
            <h2 className="msg-container">No user is selected</h2>
          ) : (
            <>
              <div className='message-feed'>
                {messages.map((msg) => {
                  const isMine = String(msg.sender) === String(user?._id)

                  return (
                    <div key={msg._id} className={`message-row ${isMine ? 'mine' : 'their'}`}>
                      <p>{msg.text}</p>
                    </div>
                  )
                })}
              </div>

              {error && <p className='chat-error'>{error}</p>}
            </>
          )}

          <form action="" className='msg-composer' onSubmit={handleSend}>
            <img className='attach-icon plus' src={ICONS.pluscircle} alt="" />
            <img className='attach-icon mic' src={ICONS.micGreen} alt="" />
            <div className="input-container">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder='Write message...'
                rows={1}
              ></textarea>
              <button className='send-btn' disabled={sending || !chatActive} type='submit'>
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        <div className="right-section">
          <img
            className="chat-user-avata"
            src={getProfileAvatar(activeContact)}
            alt=""
          />
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

      </div>
    </div>
  )
}

export default Messages
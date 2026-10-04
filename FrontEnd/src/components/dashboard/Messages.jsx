import React, { useContext } from 'react'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/message.css'
import { AuthContext } from '../../api/context/AuthContext'

const defaultContact = {
  _id: 'precious-philip-demo',
  username: 'Precious Philip'
}

function Messages() {
  const { user } = useContext(AuthContext)

  const [chatActive, setChatActive] = React.useState(false)
  const [windWidth, setWindWidth] = React.useState(window.innerWidth)
  const [selectedContact, setSelectedContact] = React.useState(defaultContact)
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
    const sampleMessages = [
      {
        _id: 'sample-1',
        sender: defaultContact._id,
        recipient: user?._id || 'me',
        text: 'Where are you?',
        createdAt: new Date(Date.now() - 60 * 1000).toISOString()
      },
      {
        _id: 'sample-2',
        sender: user?._id || 'me',
        recipient: defaultContact._id,
        text: 'I am on my way.',
        createdAt: new Date().toISOString()
      }
    ]

    if (!user?.token) {
      setMessages(sampleMessages)
      return
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chats/${selectedContact._id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        })

        if (!res.ok) {
          throw new Error('Unable to load messages')
        }

        const data = await res.json()
        setMessages(data.length ? data : sampleMessages)
      } catch (err) {
        setMessages(sampleMessages)
      }
    }

    loadMessages()
  }, [selectedContact._id, user?._id, user?.token])

  const middleClassName = windWidth < 800 && chatActive ? 'middle-section-mobile' : windWidth > 800 && chatActive ? 'middle-section-desk' : 'middle-section'
  const leftClassName = windWidth < 800 && chatActive ? 'left-section-active' : 'left-section'

  const handleSend = async (e) => {
    e.preventDefault()

    const trimmedMessage = draft.trim()
    if (!trimmedMessage || !user?.token || !selectedContact?._id) return

    const pendingMessage = {
      _id: `pending-${Date.now()}`,
      sender: user._id,
      recipient: selectedContact._id,
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
          recipientId: selectedContact._id,
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
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.filter((msg) => msg._id !== pendingMessage._id))
    } finally {
      setSending(false)
    }
  }

  const handleSelect = () => {
    setSelectedContact(defaultContact)
    setChatActive(true)
  }

  return (
    <div className='chat-cover'>
      <div className="padder"></div>
      <div className="main-screen">

        <div className={leftClassName}>
          <h1>Chats</h1>
          <div className="user-cover" onClick={handleSelect}>
            <div className="user-avata-msg"></div>
            <div className="user-container">
              <div className="user-username">
                <h2 className='username'>{selectedContact.username}</h2>
                <p className='msg-body'>
                  {messages.at(-1)?.text || 'Say hello!'}
                </p>
              </div>
              <p className="msg-unread">1</p>
            </div>
          </div>
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
          <div className="chat-user-avata"></div>
          <div className="username-egts">
            {chatActive && (
              <>
                <h1>{selectedContact.username}</h1>
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
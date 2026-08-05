import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [partnerChatMaps, setPartnerChatMaps] = useState({});

  // NEW STATE: Tracks mobile sidebar visibility layout shifts
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const navigate = useNavigate();

  const BACKEND_URL = 'http://localhost:8000';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/users`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) setUsers(data);
      } catch (err) {
        console.error('Failed fetching workspace directory', err);
      }
    };
    fetchUsers();

    socketRef.current = io(BACKEND_URL);
    socketRef.current.emit('user_connected', user._id);

    socketRef.current.on('presence_update', ({ onlineUsers, activeChatPartners }) => {
      setOnlineUserIds(onlineUsers);
      setPartnerChatMaps(activeChatPartners);
    });

    socketRef.current.on('receive_private_message', (incomingMessage) => {
      if (activePartner && (incomingMessage.sender === activePartner._id || incomingMessage.receiver === activePartner._id)) {
        setMessages((prev) => [...prev, incomingMessage]);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, activePartner]);

  useEffect(() => {
    if (!activePartner) return;

    const fetchChatLogs = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages/${activePartner._id}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (err) {
        console.error('Could not restore chat stream history', err);
      }
    };
    fetchChatLogs();

    socketRef.current.emit('enter_chat_view', { userId: user._id, partnerId: activePartner._id });

    return () => {
      if (socketRef.current) socketRef.current.emit('leave_chat_view', user._id);
    };
  }, [activePartner, user._id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activePartner) return;

    const customMessagePayload = { receiverId: activePartner._id, text: typedMessage };

    try {
      const res = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(customMessagePayload)
      });
      const storedMessageRecord = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, storedMessageRecord]);
        socketRef.current.emit('send_private_message', storedMessageRecord);
        setTypedMessage('');
      }
    } catch (err) {
      console.error('Failed processing message requests', err);
    }
  };

  const determineUserPresenceLabel = (targetId) => {
    const isOnline = onlineUserIds.includes(targetId);
    if (!isOnline) return { text: 'offline', classType: 'offline' };

    const targetChattingWith = partnerChatMaps[targetId];
    if (targetChattingWith === user._id && activePartner && activePartner._id === targetId) {
      return { text: 'With you', classType: 'with-you' };
    }

    return { text: 'online', classType: 'online' };
  };

  return (
    <div className="dashboard-container">
      {/* 1. MOBILE FLOATING TOGGLE ICON TRIGGER */}
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕ Close' : '☰ Menu'}
      </button>

      {/* 2. SIDEBAR: Appends dynamic .open class to hook the sliding transform animation */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Chat Rooms</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="logout-link" style={{ color: '#0078d4' }} onClick={() => navigate('/profile')}>Profile</button>
            <button className="logout-link" onClick={logout}>Logout</button>
          </div>
        </div>
        <ul className="user-list">
          {users.map((item) => (
            <li 
              key={item._id} 
              className={`user-item ${activePartner?._id === item._id ? 'active' : ''}`}
              onClick={() => {
                setActivePartner(item);
                setSidebarOpen(false); // Automatically close sidebar on click (mobile-friendly UX)
              }}
            >
              <span className="user-name">{item.username}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. MAIN CHAT CONTAINER BLOCK WINDOW */}
      <div className="chat-window" onClick={() => setSidebarOpen(false)}>
        {activePartner ? (
          <>
            <div className="chat-header">
              <h4 style={{ marginBottom: '2px' }}>{activePartner.username}</h4>
              <span 
                className={`status-badge ${determineUserPresenceLabel(activePartner._id).classType}`}
                style={{ display: 'inline-block', fontSize: '13px', padding: '0', background: 'none' }}
              >
                {determineUserPresenceLabel(activePartner._id).text === 'With you' && '• With you'}
                {determineUserPresenceLabel(activePartner._id).text === 'online' && '• Online'}
                {determineUserPresenceLabel(activePartner._id).text === 'offline' && '• Offline'}
              </span>
            </div>
            
            <div className="message-stream">
              {messages.map((msg, index) => {
                const currentMsgTime = new Date(msg.createdAt);
                
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameUserAsPrev = prevMsg && prevMsg.sender === msg.sender;
                const isWithinOneMinuteOfPrev = prevMsg && (currentMsgTime - new Date(prevMsg.createdAt)) <= 60000;
                const isConnectedToPrev = isSameUserAsPrev && isWithinOneMinuteOfPrev;

                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                const isSameUserAsNext = nextMsg && nextMsg.sender === msg.sender;
                const isWithinOneMinuteOfNext = nextMsg && (new Date(nextMsg.createdAt) - currentMsgTime) <= 60000;
                const isConnectedToNext = isSameUserAsNext && isWithinOneMinuteOfNext;

                let clusterPosition = 'single';
                if (isConnectedToPrev && isConnectedToNext) {
                  clusterPosition = 'middle';
                } else if (!isConnectedToPrev && isConnectedToNext) {
                  clusterPosition = 'first';
                } else if (isConnectedToPrev && !isConnectedToNext) {
                  clusterPosition = 'last';
                }

                return (
                  <div 
                    key={msg._id} 
                    className={`message-row ${msg.sender === user._id ? 'sent' : 'received'}`}
                    style={{ marginTop: isConnectedToPrev ? '-12px' : '0px' }}
                  >
                    <div className={`msg-bubble ${msg.sender === user._id ? 'sent' : 'received'} ${clusterPosition}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={sendChatMessage}>
              <input 
                type="text" 
                placeholder="Type your message here..." 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                required
              />
              <button type="submit" className="chat-send-btn">Send</button>
            </form>
          </>
        ) : (
          <div className="chat-blank-state">
            <p>Select a user from the directory side list layout pane to begin chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

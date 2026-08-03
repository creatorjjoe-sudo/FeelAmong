import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');

  // Presence state structures tracked dynamically over websockets
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [partnerChatMaps, setPartnerChatMaps] = useState({});

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);

  // 1. Structural Lifecycle Hook: Hydrate users roster and map socket instances
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/auth/users', {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) setUsers(data);
      } catch (err) {
        console.error('Failed fetching workspace directory', err);
      }
    };
    fetchUsers();

    // Establish persistent full duplex network bridge connection
    socketRef.current = io('http://localhost:8000');
    socketRef.current.emit('user_connected', user._id);

    // Watch live updates sent from the server's presence monitoring systems
    socketRef.current.on('presence_update', ({ onlineUsers, activeChatPartners }) => {
      setOnlineUserIds(onlineUsers);
      setPartnerChatMaps(activeChatPartners);
    });

    // Capture text messages incoming across our websocket pipe channel
    socketRef.current.on('receive_private_message', (incomingMessage) => {
      // Append to active conversation if it matches the current user context
      if (activePartner && (incomingMessage.sender === activePartner._id || incomingMessage.receiver === activePartner._id)) {
        setMessages((prev) => [...prev, incomingMessage]);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, activePartner]);

  // 2. Track historical logs every time a user changes rooms
  useEffect(() => {
    if (!activePartner) return;

    const fetchChatLogs = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/messages/${activePartner._id}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) setMessages(data);
      } catch (err) {
        console.error('Could not restore chat stream history text logs', err);
      }
    };
    fetchChatLogs();

    // Notify the network backend that the user has changed rooms
    socketRef.current.emit('enter_chat_view', { userId: user._id, partnerId: activePartner._id });

    return () => {
      if (socketRef.current) socketRef.current.emit('leave_chat_view', user._id);
    };
  }, [activePartner, user._id]);

  // Keep chat scrolls pinned down securely to show new incoming text entries
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Dispatch Message Event Logic Pipeline
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activePartner) return;

    const customMessagePayload = { receiverId: activePartner._id, text: typedMessage };

    try {
      const res = await fetch('http://localhost:8000/api/messages', {
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
        // Emit live across websockets for instant screen rendering updates
        socketRef.current.emit('send_private_message', storedMessageRecord);
        setTypedMessage('');
      }
    } catch (err) {
      console.error('Failed parsing transaction processing runtime message requests', err);
    }
  };

  // 4. Presence status check logic
  const determineUserPresenceLabel = (targetId) => {
    const isOnline = onlineUserIds.includes(targetId);
    if (!isOnline) return { text: 'offline', classType: 'offline' };

    // "With you" validation rules condition matrix match parameters
    // Check if the target user is currently viewing the active room context
    const targetChattingWith = partnerChatMaps[targetId];
    if (targetChattingWith === user._id && activePartner && activePartner._id === targetId) {
      return { text: 'With you', classType: 'with-you' };
    }

    return { text: 'online', classType: 'online' };
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Controls */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Chat Rooms</h3>
          <button className="logout-link" onClick={logout}>Logout</button>
        </div>
        <ul className="user-list">
          {users.map((item) => (
            <li
              key={item._id}
              className={`user-item ${activePartner?._id === item._id ? 'active' : ''}`}
              onClick={() => setActivePartner(item)}
            >
              <span className="user-name">{item.username}</span>
            </li>
          ))}
        </ul>

      </div>

      {/* Main Message Board Interface Panel Layout */}
      <div className="chat-window">
        {activePartner ? (
          <>
            <div className="chat-header">
              <h4 style={{ marginBottom: '2px' }}>{activePartner.username}</h4>
              {/* Live presence indicator placed exactly beneath the username */}
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
                // Convert timestamps to JavaScript Date Objects
                const currentMsgTime = new Date(msg.createdAt);

                // --- 1. Evaluate connection with PREVIOUS message ---
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const isSameUserAsPrev = prevMsg && prevMsg.sender === msg.sender;
                const isWithinOneMinuteOfPrev = prevMsg && (currentMsgTime - new Date(prevMsg.createdAt)) <= 60000;
                const isConnectedToPrev = isSameUserAsPrev && isWithinOneMinuteOfPrev;

                // --- 2. Evaluate connection with NEXT message ---
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                const isSameUserAsNext = nextMsg && nextMsg.sender === msg.sender;
                const isWithinOneMinuteOfNext = nextMsg && (new Date(nextMsg.createdAt) - currentMsgTime) <= 60000;
                const isConnectedToNext = isSameUserAsNext && isWithinOneMinuteOfNext;

                // --- 3. Determine the position inside the cluster ---
                let clusterPosition = 'single'; // Default fallback if it's just one isolated message

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
                    style={{
                      // Keep consecutive messages tightly stacked together
                      marginTop: isConnectedToPrev ? '-12px' : '0px'
                    }}
                  >
                    {/* Pass the dynamic cluster position class to the bubble */}
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
            <p>Select a user from the directory deck side list map layout pane to begin chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

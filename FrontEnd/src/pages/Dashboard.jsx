import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import './Dashboard.css';

// Import all modular sub-components cleanly
import SidebarHeader from '../components/SidebarHeader';
import UserListItem from '../components/UserListItem';
import ChatHeader from '../components/ChatHeader';
import MessageStream from '../components/MessageStream';
import MessageInputBar from '../components/MessageInputBar';
import BlankChatState from '../components/BlankChatState';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [partnerChatMaps, setPartnerChatMaps] = useState({});
  const [typingUserMaps, setTypingUserMaps] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const BACKEND_URL = 'http://localhost:8000';

  const reorderUserListToTop = (senderId) => {
    setUsers((prevUsers) => {
      const userIndex = prevUsers.findIndex((u) => u._id === senderId);
      if (userIndex <= 0) return prevUsers;
      
      const updatedUsersList = [...prevUsers];
      const [targetUser] = updatedUsersList.splice(userIndex, 1);
      return [targetUser, ...updatedUsersList];
    });
  };

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

    socketRef.current.on('presence_update', ({ onlineUsers, activeChatPartners, typingStatus }) => {
      setOnlineUserIds(onlineUsers);
      setPartnerChatMaps(activeChatPartners);
      setTypingUserMaps(typingStatus || {});
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.off('receive_private_message');
    socketRef.current.on('receive_private_message', (incomingMessage) => {
      reorderUserListToTop(incomingMessage.sender);

      if (activePartner && (incomingMessage.sender === activePartner._id || incomingMessage.receiver === activePartner._id)) {
        setMessages((prev) => [...prev, incomingMessage]);
      } else {
        setUnreadMessages((prev) => ({
          ...prev,
          [incomingMessage.sender]: (prev[incomingMessage.sender] || 0) + 1
        }));
      }
    });
  }, [activePartner]);

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

    setUnreadMessages((prev) => ({
      ...prev,
      [activePartner._id]: 0
    }));

    socketRef.current.emit('enter_chat_view', { userId: user._id, partnerId: activePartner._id });

    return () => {
      if (socketRef.current) socketRef.current.emit('leave_chat_view', user._id);
    };
  }, [activePartner, user._id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setTypedMessage(e.target.value);

    if (!activePartner || !socketRef.current) return;

    socketRef.current.emit('typing_start', { userId: user._id, partnerId: activePartner._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('typing_stop', user._id);
    }, 1500);
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activePartner) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit('typing_stop', user._id);

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
        reorderUserListToTop(activePartner._id);
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
      {/* MOBILE FLOATING TOGGLE ICON TRIGGER */}
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕ Close' : '☰ Menu'}
      </button>

      {/* LEFT SIDEBAR PANEL */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SidebarHeader logout={logout} />
        
        <ul className="user-list" style={{ listStyle: 'none', padding: 0 }}>
          {users.map((item) => (
            <UserListItem 
              key={item._id}
              item={item}
              activePartner={activePartner}
              typingUserMaps={typingUserMaps}
              currentUserId={user._id}
              unreadCount={unreadMessages[item._id] || 0}
              onSelect={() => {
                setActivePartner(item);
                setSidebarOpen(false);
              }}
            />
          ))}
        </ul>
      </div>

      {/* RIGHT CHAT WINDOW AREA */}
      <div className="chat-window" onClick={() => setSidebarOpen(false)}>
        {activePartner ? (
          <>
            <ChatHeader 
              activePartner={activePartner}
              determineUserPresenceLabel={determineUserPresenceLabel}
              typingUserMaps={typingUserMaps}
              currentUserId={user._id}
            />
            
            <MessageStream 
              messages={messages} 
              currentUserId={user._id} 
              messageEndRef={messageEndRef} 
            />

            <MessageInputBar 
              typedMessage={typedMessage} 
              onChange={handleInputChange} 
              onSubmit={sendChatMessage} 
            />
          </>
        ) : (
          <BlankChatState />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

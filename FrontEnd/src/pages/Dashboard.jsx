import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

import SidebarHeader from '../components/SidebarHeader';
import UserListItem from '../components/UserListItem';
import ChatHeader from '../components/ChatHeader';
import MessageStream from '../components/MessageStream';
import MessageInputBar from '../components/MessageInputBar';
import BlankChatState from '../components/BlankChatState';

const Dashboard = () => {
  // UPGRADED: Grabbing the global socket state directly from context
  const { user, socket, logout } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [partnerChatMaps, setPartnerChatMaps] = useState({});
  const [typingUserMaps, setTypingUserMaps] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Dynamic variable assignment
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

    if (!socket) return;

    // Listen to live presence updates
    socket.on('presence_update', ({ onlineUsers, activeChatPartners, typingStatus }) => {
      setOnlineUserIds(onlineUsers);
      setPartnerChatMaps(activeChatPartners);
      setTypingUserMaps(typingStatus || {});
    });

    return () => {
      socket.off('presence_update');
    };
  }, [user, socket]);

  useEffect(() => {
    if (!socket) return;

    socket.off('receive_private_message');
    socket.on('receive_private_message', (incomingMessage) => {
      reorderUserListToTop(incomingMessage.sender);

      if (activePartner && (incomingMessage.sender === activePartner._id || incomingMessage.receiver === activePartner._id)) {
        setMessages((prev) => [...prev, { ...incomingMessage, status: 'delivered' }]);
      } else {
        setUnreadMessages((prev) => ({
          ...prev,
          [incomingMessage.sender]: (prev[incomingMessage.sender] || 0) + 1
        }));
      }
    });

    return () => {
      socket.off('receive_private_message');
    };
  }, [activePartner, socket]);

  useEffect(() => {
    if (!activePartner || !socket) return;

    const fetchChatLogs = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/messages/${activePartner._id}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setMessages(data.map(msg => ({ ...msg, status: 'delivered' })));
        }
      } catch (err) {
        console.error('Could not restore chat stream history', err);
      }
    };
    fetchChatLogs();

    setUnreadMessages((prev) => ({
      ...prev,
      [activePartner._id]: 0
    }));

    socket.emit('enter_chat_view', { userId: user._id, partnerId: activePartner._id });

    return () => {
      socket.emit('leave_chat_view', user._id);
    };
  }, [activePartner, user._id, socket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e) => {
    setTypedMessage(e.target.value);

    if (!activePartner || !socket) return;

    socket.emit('typing_start', { userId: user._id, partnerId: activePartner._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', user._id);
    }, 1500);
  };

  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activePartner) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket) socket.emit('typing_stop', user._id);

    const messageTextSnapshot = typedMessage;
    setTypedMessage('');

    const tempClientId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempClientId,
      sender: user._id,
      receiver: activePartner._id,
      text: messageTextSnapshot,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    reorderUserListToTop(activePartner._id);

    try {
      const [res] = await Promise.all([
        fetch(`${BACKEND_URL}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ receiverId: activePartner._id, text: messageTextSnapshot })
        }),
        new Promise((resolve) => setTimeout(resolve, 2500))
      ]);

      const savedServerRecord = await res.json();

      if (res.ok) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg._id === tempClientId ? { ...savedServerRecord, status: 'sent' } : msg
          )
        );

        if (socket) socket.emit('send_private_message', savedServerRecord);

        setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === savedServerRecord._id ? { ...msg, status: 'displayed' } : msg
            )
          );
        }, 2500);
      }
    } catch (err) {
      console.error('Failed processing message requests', err);
      setMessages((prev) => prev.filter((msg) => msg._id !== tempClientId));
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
      <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕ Close' : '☰ Menu'}
      </button>

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

      <div className="chat-window" onClick={() => setSidebarOpen(false)}>
        {activePartner ? (
          <>
            <ChatHeader 
              activePartner={activePartner}
              determineUserPresenceLabel={determineUserPresenceLabel}
              typingUserMaps={typingUserMaps}
              currentUserId={user._id}
            />
            <MessageStream messages={messages} currentUserId={user._id} messageEndRef={messageEndRef} />
            <MessageInputBar typedMessage={typedMessage} onChange={handleInputChange} onSubmit={sendChatMessage} />
          </>
        ) : (
          <BlankChatState />
        )}
      </div>
    </div>
  );
};

export default Dashboard;

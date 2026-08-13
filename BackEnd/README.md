mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Engine:', process.env.MONGO_URI))
  .then(() => {
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('❌ Database boot critical exception:', err));

  import React from 'react';
import './ChatHeader.css'; // Load Component-specific localized stylesheet

const ChatHeader = ({ activePartner, determineUserPresenceLabel, typingUserMaps, currentUserId }) => {
  const presence = determineUserPresenceLabel(activePartner._id);

  return (
    <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h4 style={{ marginBottom: '2px' }}>{activePartner.username}</h4>
        <span 
          className={`status-badge ${presence.classType}`}
          style={{ display: 'inline-block', fontSize: '13px', padding: '0', background: 'none' }}
        >
          {presence.text === 'With you' && '• With you'}
          {presence.text === 'online' && '• Online'}
          {presence.text === 'offline' && '• Offline'}
        </span>
      </div>
      
      {typingUserMaps[activePartner._id] === currentUserId && presence.text === 'With you' && (
        <div style={{ fontSize: '14px', color: '#107c41', fontWeight: '600', fontStyle: 'italic' }}>
          Typing...
        </div>
      )}
    </div>
  );
};

export default ChatHeader;


import React from 'react';

const MessageStream = ({ messages, currentUserId, messageEndRef }) => {
  
  const formatSmartTimestamp = (msg) => {
    if (msg.status === 'sending') return 'sending';
    if (msg.status === 'sent') return 'sent';

    if (!msg.createdAt) return '';
    const now = new Date();
    const past = new Date(msg.createdAt);
    const msDifference = now - past;
    
    const minsAgo = Math.floor(msDifference / 60000);

    const formatTimeStr = (d) => {
      let hours = d.getHours();
      let minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      hours = hours % 12;
      hours = hours ? hours : 12;
      minutes = minutes < 10 ? '0' + minutes : minutes;
      return `${hours}:${minutes}${ampm}`;
    };

    const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (minsAgo < 1) return 'Just now';
    if (minsAgo === 1) return '1 min';
    if (minsAgo < 60) return `${minsAgo} mins`;

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);
    const sevenDaysAgoMidnight = new Date(todayMidnight.getTime() - (7 * 86400000));

    if (past >= todayMidnight) {
      return formatTimeStr(past);
    }
    if (past >= yesterdayMidnight && past < todayMidnight) {
      return `Yesterday-${formatTimeStr(past)}`;
    }
    if (past >= sevenDaysAgoMidnight) {
      return `${daysShort[past.getDay()]}-${formatTimeStr(past)}`;
    }
    return `${daysShort[past.getDay()]} ${monthsShort[past.getMonth()]} ${past.getDate()}, ${past.getFullYear()}-${formatTimeStr(past)}`;
  };

  return (
    <div className="message-stream">
      <div ref={messageEndRef} />
      
      {messages.slice().reverse().map((msg, index) => {
        const originalIndex = messages.length - 1 - index;
        const currentMsgTime = new Date(msg.createdAt);
        
        const prevMsg = originalIndex > 0 ? messages[originalIndex - 1] : null;
        const isSameUserAsPrev = prevMsg && prevMsg.sender === msg.sender;
        const isWithinOneMinuteOfPrev = prevMsg && (currentMsgTime - new Date(prevMsg.createdAt)) <= 60000;
        const isConnectedToPrev = isSameUserAsPrev && isWithinOneMinuteOfPrev;

        const nextMsg = originalIndex < messages.length - 1 ? messages[originalIndex + 1] : null;
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

        const isMe = msg.sender === currentUserId;
        const isAbsoluteLastMessage = originalIndex === messages.length - 1;

        let shouldBeVisible = clusterPosition === 'last' || clusterPosition === 'single' || isAbsoluteLastMessage;

        if (nextMsg && isAbsoluteLastMessage === false && originalIndex === messages.length - 2) {
          if (nextMsg.status === 'sending') {
            shouldBeVisible = true;
          }
        }

        if (nextMsg && originalIndex === messages.length - 2 && isSameUserAsNext) {
          if (nextMsg.status === 'sent' || nextMsg.status === 'displayed') {
            shouldBeVisible = false;
          }
        }

        return (
          <div 
            key={msg._id} 
            className={`message-row ${isMe ? 'sent' : 'received'}`}
            style={{ 
              marginBottom: isConnectedToPrev ? '-12px' : '0px',
              flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start'
            }}
          >
            <div 
              className={`msg-bubble ${isMe ? 'sent' : 'received'} ${clusterPosition}`}
              style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}
            >
              {msg.text}
            </div>
            
            <span className={`msg-timestamp-holder ${shouldBeVisible ? 'visible' : 'hidden'}`} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              padding: isMe ? '0 10px 0 0' : '0 0 0 10px'
            }}>
              {formatSmartTimestamp(msg)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default MessageStream;


.dashboard-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  overflow: hidden;
}

.sidebar {
  width: 320px;
  border-right: 1px solid #e6e9ed;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  flex-shrink: 0;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  position: relative;
}

.chat-blank-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  font-size: 16px;
  background: #f4f6f9;
}

.message-stream {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f4f6f9;
  display: flex;
  flex-direction: column-reverse; 
  gap: 16px;
}

.message-row {
  width: 100%;
  display: flex;
  flex-shrink: 0;
}

.message-row.sent {
  align-items: flex-end;    
  justify-content: flex-end; 
}

.message-row.received {
  align-items: flex-start;  
  justify-content: flex-start; 
}

.msg-bubble {
  width: 350px;               
  max-width: 85%;             
  padding: 14px 18px;
  font-size: 15px;
  line-height: 1.5;
  word-wrap: break-word;      
  overflow-wrap: break-word;  
  white-space: pre-wrap;      
  flex-shrink: 0;             
  transition: border-radius 0.1s ease;
}

.msg-bubble.sent {
  background: #0078d4;
  color: #ffffff;
}

.msg-bubble.received {
  background: #ffffff;
  color: #1a1a1a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #e1e4e8;
}

.msg-bubble.first {
  border-radius: 18px 18px 5px 5px;
}

.msg-bubble.middle {
  border-radius: 5px 5px 5px 5px;
}

.msg-bubble.last {
  border-radius: 5px 5px 18px 18px;
}

.msg-bubble.single.sent {
  border-radius: 18px 18px 18px 18px;
}
.msg-bubble.single.received {
  border-radius: 18px 18px 18px 18px;
}

.msg-timestamp-holder {
  font-size: 11px;
  color: #797775;
  font-weight: 500;
  text-transform: lowercase;
  display: block;
  overflow: hidden;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding-top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              padding-bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.msg-timestamp-holder.visible {
  opacity: 1;
  max-height: 25px; 
  padding-top: 4px;
  padding-bottom: 4px;
}

.msg-timestamp-holder.hidden {
  opacity: 0;
  max-height: 0px; 
  padding-top: 0px;
  padding-bottom: 0px;
}

.chat-input-bar {
  padding: 15px 20px;
  background: #ffffff;
  border-top: 1px solid #e6e9ed;
  display: flex;
  gap: 12px;
}

.chat-input-bar input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ccd1d9;
  border-radius: 4px;
  font-size: 15px;
  outline: none;
}

.chat-send-btn {
  padding: 0 24px;
  background: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
}

.chat-send-btn:hover {
  background: #005a9e;
}

.sidebar-toggle-btn {
  display: none;
  position: absolute;
  top: 15px;
  left: 15px;
  z-index: 1000;
  background: #0078d4;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .sidebar-toggle-btn {
    display: block;
  }

  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 999;
    box-shadow: 4px 0 15px rgba(0, 0, 0, 0.15);
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}

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

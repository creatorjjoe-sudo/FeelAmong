import React from 'react';
import './ChatHeader.css';

const ChatHeader = ({ activePartner, determineUserPresenceLabel, typingUserMaps, currentUserId }) => {
  const presence = determineUserPresenceLabel(activePartner._id);

  // Dynamic alphabet mapping fallback colors engine matching sidebar layouts matrix
  const BG_COLORS = [
    '#4a90e2', '#28a745', '#e05d5d', '#f39c12', '#8e44ad', 
    '#16a085', '#2c3e50', '#d35400', '#27ae60', '#2980b9'
  ];

  const firstLetter = activePartner.username?.charAt(0).toUpperCase() || '?';
  const charCodeSum = firstLetter.charCodeAt(0);
  const selectedBgColor = BG_COLORS[charCodeSum % BG_COLORS.length];

  const avatarUrl = activePartner.profilePic ? `http://localhost:8000${activePartner.profilePic}` : null;

  return (
    <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      
        {/* Render main view header profile image node element */}
        {avatarUrl ? (
          <img src={avatarUrl} alt={activePartner.username} className="header-avatar-circle" />
        ) : (
          <div className="header-avatar-fallback" style={{ backgroundColor: selectedBgColor }}>
            {firstLetter}
          </div>
        )}
        
        <div>
          <h4>{activePartner.username}</h4>
          <span 
            className={`status-badge ${presence.classType}`}
            style={{ display: 'inline-block', fontSize: '13px', padding: '0', background: 'none' }}
          >
            {presence.text === 'With you' && '• With you'}
            {presence.text === 'online' && '• Online'}
            {presence.text === 'offline' && '• Offline'}
          </span>
        </div>
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

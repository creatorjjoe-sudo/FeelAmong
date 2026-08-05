import React from 'react';
import './UserListItem.css';

const UserListItem = ({ item, activePartner, onSelect, typingUserMaps, currentUserId, unreadCount }) => {
  const isTypingForMeInBg = typingUserMaps[item._id] === currentUserId && activePartner?._id !== item._id;

  const BG_COLORS = [
    '#4a90e2', '#28a745', '#e05d5d', '#f39c12', '#8e44ad', 
    '#16a085', '#2c3e50', '#d35400', '#27ae60', '#2980b9'
  ];

  const firstLetter = item.username?.charAt(0).toUpperCase() || '?';
  const charCodeSum = firstLetter.charCodeAt(0);
  const selectedBgColor = BG_COLORS[charCodeSum % BG_COLORS.length];

  const avatarUrl = item.profilePic ? `http://localhost:8000${item.profilePic}` : null;

  return (
    <li 
      className={`user-item ${activePartner?._id === item._id ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="user-item-row">
        {avatarUrl ? (
          <img src={avatarUrl} alt={item.username} className="avatar-circle" />
        ) : (
          <div className="avatar-fallback" style={{ backgroundColor: selectedBgColor }}>
            {firstLetter}
          </div>
        )}
        
        <span className="user-name">{item.username}</span>

        {/* Render unread numeric badge tracking notifications count if value exceeds zero */}
        {unreadCount > 0 && (
          <div className="unread-badge">
            {unreadCount}
          </div>
        )}
      </div>
      
      {isTypingForMeInBg && (
        <span style={{ fontSize: '12px', color: '#0078d4', fontStyle: 'italic', marginTop: '4px', marginLeft: '52px', fontWeight: '500' }}>
          Typing...
        </span>
      )}
    </li>
  );
};

export default UserListItem;

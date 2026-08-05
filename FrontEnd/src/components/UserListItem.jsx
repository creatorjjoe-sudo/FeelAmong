import React from 'react';
import './UserListItem.css'; // Load Component-specific localized stylesheet

const UserListItem = ({ item, activePartner, onSelect, typingUserMaps, currentUserId }) => {
  const isTypingForMeInBg = typingUserMaps[item._id] === currentUserId && activePartner?._id !== item._id;

  return (
    <li 
      className={`user-item ${activePartner?._id === item._id ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="user-item-row">
        <span className="user-name">{item.username}</span>
      </div>
      {isTypingForMeInBg && (
        <span style={{ fontSize: '12px', color: '#0078d4', fontStyle: 'italic', marginTop: '2px', fontWeight: '500' }}>
          Typing...
        </span>
      )}
    </li>
  );
};

export default UserListItem;

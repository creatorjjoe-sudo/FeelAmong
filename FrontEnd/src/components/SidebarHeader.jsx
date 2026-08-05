import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SidebarHeader.css'; // Load Component-specific localized stylesheet

const SidebarHeader = ({ logout }) => {
  const navigate = useNavigate();

  return (
    <div className="sidebar-header">
      <h3>Chat Rooms</h3>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          className="logout-link" 
          style={{ color: '#0078d4' }} 
          onClick={() => navigate('/profile')}
        >
          Profile
        </button>
        <button className="logout-link" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default SidebarHeader;

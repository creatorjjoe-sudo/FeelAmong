import { createContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null); // NEW: Centralized socket reference
  const [loading, setLoading] = useState(true);

  // Dynamic fallback mapping for local testing vs live cloud hosting builds
  const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const storedUser = localStorage.getItem('chatUserInfo');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // NEW: Managing the lifecycle of the real-time pipeline globally
  useEffect(() => {
    if (user) {
      // Connect to the server once when a valid user profile mounts
      const liveSocket = io(BACKEND_URL, { autoConnect: true });
      setSocket(liveSocket);

      // Tell backend server you are online
      liveSocket.emit('user_connected', user._id);

      // Disconnect cleanly if user logs out or closes the app
      return () => {
        liveSocket.disconnect();
      };
    } else {
      // Disconnect socket if user state becomes empty
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user]);

  const login = (userData) => {
    localStorage.setItem('chatUserInfo', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    if (socket) socket.disconnect();
    localStorage.removeItem('chatUserInfo');
    setUser(null);
    setSocket(null);
  };

  return (
    <AuthContext.Provider value={{ user, socket, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

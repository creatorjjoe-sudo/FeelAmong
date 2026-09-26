import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  try {
   const storedUser = localStorage.getItem('user');
   if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
   }
  } catch (error) {
   localStorage.removeItem('user');
   setUser(null);
  } finally {
   setLoading(false);
  }
 }, []);

 const login = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);
 };

 const logout = () => {
  localStorage.removeItem('user');
  setUser(null);
 };

 return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading ? children : null}
    </AuthContext.Provider>
  );
};
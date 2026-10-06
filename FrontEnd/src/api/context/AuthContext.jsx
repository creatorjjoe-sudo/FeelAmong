import { createContext, useState, useEffect } from 'react';
import InitialLoadingScreen from '../../components/InitialLoadingScreen'
export const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
const INITIAL_LOADING_DURATION_MS = 2000;

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);

 const updateLastActive = () => {
  const now = Date.now();
  localStorage.setItem('lastActiveAt', String(now));
 };

 const clearSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('lastActiveAt');
  setUser(null);
 };

 useEffect(() => {
  const loadingTimer = window.setTimeout(() => {
   setLoading(false);
  }, INITIAL_LOADING_DURATION_MS);

  try {
   const storedUser = localStorage.getItem('user');
   const lastActiveAt = Number(localStorage.getItem('lastActiveAt') || Date.now());

   if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    localStorage.setItem('lastActiveAt', String(lastActiveAt));
   }
  } catch {
   clearSession();
  }

  return () => window.clearTimeout(loadingTimer);
 }, []);

 useEffect(() => {
  if (!user) return;

  const markActive = () => updateLastActive();

  const activityEvents = ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'];
  activityEvents.forEach((eventName) => window.addEventListener(eventName, markActive));

  const inactivityTimer = setInterval(() => {
   const lastActiveAt = Number(localStorage.getItem('lastActiveAt') || Date.now());
   const elapsed = Date.now() - lastActiveAt;

   if (elapsed > INACTIVITY_LIMIT_MS) {
    clearSession();
   }
  }, 15000);

  updateLastActive();

  return () => {
   activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
   clearInterval(inactivityTimer);
  };
 }, [user]);

 const login = (userData) => {
  const userWithSession = { ...userData, lastActiveAt: Date.now() };
  localStorage.setItem('user', JSON.stringify(userWithSession));
  localStorage.setItem('lastActiveAt', String(Date.now()));
  setUser(userWithSession);
 };

 const logout = () => {
  clearSession();
 };

 return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {loading ? <InitialLoadingScreen /> : children}
    </AuthContext.Provider>
  );
};
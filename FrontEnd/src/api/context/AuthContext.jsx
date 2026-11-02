import { createContext, useState, useEffect } from 'react';
import InitialLoadingScreen from '../../components/InitialLoadingScreen'
export const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
const INITIAL_LOADING_DURATION_MS = 2000;
const DEVICE_ACCOUNTS_KEY = 'feelamong-device-accounts';

function rememberDeviceAccount(userData, recordLogin = false) {
 if (!userData?._id || userData.isAnonymous) return;

 try {
  const storedAccounts = JSON.parse(localStorage.getItem(DEVICE_ACCOUNTS_KEY) || '[]');
  const accounts = Array.isArray(storedAccounts) ? storedAccounts : [];
  const userId = String(userData._id);
  const previousAccount = accounts.find((savedAccount) => String(savedAccount?._id) === userId);
  const account = {
   ...previousAccount,
   _id: userId,
   username: userData.username || previousAccount?.username || '',
   firstName: userData.firstName || previousAccount?.firstName || '',
   lastName: userData.lastName || previousAccount?.lastName || '',
   email: userData.email || previousAccount?.email || '',
   avatar: userData.avatar || previousAccount?.avatar || '',
   sex: userData.sex || previousAccount?.sex || '',
   lastLoginAt: recordLogin ? Date.now() : previousAccount?.lastLoginAt || null,
  };
  const updatedAccounts = [
   account,
   ...accounts.filter((savedAccount) => String(savedAccount?._id) !== userId),
  ];
  localStorage.setItem(DEVICE_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
 } catch (error) {
  console.error('Could not save the signed-in account on this device:', error);
 }
}

export const AuthProvider = ({ children }) => {
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);
 const [sessionExpired, setSessionExpired] = useState(false);

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
    rememberDeviceAccount(parsedUser);
    if (Date.now() - lastActiveAt >= INACTIVITY_LIMIT_MS) {
     setSessionExpired(true);
     clearSession();
    } else {
     setUser(parsedUser);
     localStorage.setItem('lastActiveAt', String(lastActiveAt));
    }
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
    setSessionExpired(true);
    clearSession();
   }
  }, 15000);

  return () => {
   activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActive));
   clearInterval(inactivityTimer);
  };
 }, [user]);

 const login = (userData, { recordDeviceLogin = true } = {}) => {
  const userWithSession = { ...userData, lastActiveAt: Date.now() };
  setSessionExpired(false);
  localStorage.setItem('user', JSON.stringify(userWithSession));
  localStorage.setItem('lastActiveAt', String(Date.now()));
  rememberDeviceAccount(userData, recordDeviceLogin);
  setUser(userWithSession);
 };

 const logout = () => {
  setSessionExpired(false);
  clearSession();
 };

 return (
    <AuthContext.Provider value={{ user, login, logout, loading, sessionExpired }}>
      {loading ? <InitialLoadingScreen /> : children}
    </AuthContext.Provider>
  );
};
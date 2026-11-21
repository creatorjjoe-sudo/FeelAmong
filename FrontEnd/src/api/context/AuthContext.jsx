import { createContext, useState, useEffect } from 'react';
import InitialLoadingScreen from '../../components/InitialLoadingScreen'
import { API_ORIGIN } from '../config'
export const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000;
const INITIAL_LOADING_DURATION_MS = 2000;
const DEVICE_ACCOUNTS_KEY = 'feelamong-device-accounts';
const PERSONAL_ACCOUNT_KEY = 'feelamong-personal-account';
const ACCOUNT_ACTIVITY_KEY = 'feelamong-account-activity';
function rememberActiveIdentity(ownerId, accountId) {
 if (!ownerId || !accountId) return;

 try {
  const savedActivity = JSON.parse(localStorage.getItem(ACCOUNT_ACTIVITY_KEY) || '{}');
  const activity = savedActivity && typeof savedActivity === 'object' && !Array.isArray(savedActivity)
   ? savedActivity
   : {};
  const ownerActivity = activity[String(ownerId)] && typeof activity[String(ownerId)] === 'object'
   ? activity[String(ownerId)]
   : {};
  localStorage.setItem(ACCOUNT_ACTIVITY_KEY, JSON.stringify({
   ...activity,
   [String(ownerId)]: { ...ownerActivity, [String(accountId)]: Date.now() },
  }));
 } catch (error) {
  console.error('Could not save account activity:', error);
 }
}

function rememberDeviceAccount(userData, recordLogin = false) {
 if (!userData?._id || userData.isAnonymous || userData.isCompany) return;

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
 const [personalUser, setPersonalUser] = useState(null);
 const [loading, setLoading] = useState(true);
 const [sessionExpired, setSessionExpired] = useState(false);

 const updateLastActive = () => {
  const now = Date.now();
  localStorage.setItem('lastActiveAt', String(now));
 };

 const clearSession = () => {
  localStorage.removeItem('user');
  localStorage.removeItem(PERSONAL_ACCOUNT_KEY);
  localStorage.removeItem('feelamong-active-company');
  localStorage.removeItem('lastActiveAt');
  setUser(null);
  setPersonalUser(null);
 };

 useEffect(() => {
  const loadingTimer = window.setTimeout(() => {
   setLoading(false);
  }, INITIAL_LOADING_DURATION_MS);

  try {
   const storedUser = localStorage.getItem('user');
   const activeUser = storedUser ? JSON.parse(storedUser) : null;
   const storedPersonalUser = localStorage.getItem(PERSONAL_ACCOUNT_KEY);
   const savedPersonalUser = storedPersonalUser ? JSON.parse(storedPersonalUser) : null;
   const lastActiveAt = Number(localStorage.getItem('lastActiveAt') || Date.now());

   if (activeUser) {
    const ownerUser = savedPersonalUser || (activeUser.isCompany ? null : activeUser);
    rememberDeviceAccount(ownerUser);
    if (Date.now() - lastActiveAt >= INACTIVITY_LIMIT_MS) {
     setSessionExpired(true);
     clearSession();
    } else {
     setUser(activeUser);
     setPersonalUser(ownerUser);
     if (ownerUser && !savedPersonalUser) {
      localStorage.setItem(PERSONAL_ACCOUNT_KEY, JSON.stringify(ownerUser));
     }
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
  localStorage.setItem(PERSONAL_ACCOUNT_KEY, JSON.stringify(userWithSession));
  localStorage.removeItem('feelamong-active-company');
  localStorage.setItem('lastActiveAt', String(Date.now()));
  rememberDeviceAccount(userData, recordDeviceLogin);
  rememberActiveIdentity(userWithSession._id, userWithSession._id);
  setUser(userWithSession);
  setPersonalUser(userWithSession);
 };

 const switchToPersonal = () => {
  if (!personalUser) throw new Error('Your personal account is unavailable. Please sign in again.');
  localStorage.setItem('user', JSON.stringify(personalUser));
  localStorage.removeItem('feelamong-active-company');
  localStorage.setItem('lastActiveAt', String(Date.now()));
  rememberActiveIdentity(personalUser._id, personalUser._id);
  setUser(personalUser);
 };

 const switchToCompany = async (companyId) => {
  if (!personalUser?.token) throw new Error('Sign in to your personal account to switch identities.');
  const response = await fetch(`${API_ORIGIN}/api/companies/${companyId}/switch`, {
   method: 'POST',
   headers: { Authorization: `Bearer ${personalUser.token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Could not switch to that company account.');

  const companyUser = { ...result, lastActiveAt: Date.now() };
  localStorage.setItem('user', JSON.stringify(companyUser));
  localStorage.setItem('feelamong-active-company', String(companyUser._id));
  localStorage.setItem('lastActiveAt', String(Date.now()));
  rememberActiveIdentity(personalUser._id, companyUser._id);
  setUser(companyUser);
 };

 const logout = () => {
  setSessionExpired(false);
  clearSession();
 };

 return (
    <AuthContext.Provider value={{
     user,
     personalUser,
     login,
     logout,
     switchToPersonal,
     switchToCompany,
     loading,
     sessionExpired
    }}>
      {loading ? <InitialLoadingScreen /> : children}
    </AuthContext.Provider>
  );
};
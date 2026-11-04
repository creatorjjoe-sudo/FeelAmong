import { useContext, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import './styles/app.css'
import './styles/darkmode.css'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import CreateVideo from './pages/CreateVideo'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { AuthContext } from './api/context/AuthContext'

function AppRoutes({ isDarkMode, setIsDarkMode }) {
  const { user, loading, sessionExpired } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const shouldApplyInitialRoute = useRef(true)
  const isAuthenticatedUser = Boolean(user) && !user.isAnonymous

  useEffect(() => {
    if (loading || !shouldApplyInitialRoute.current) return

    const initialDestination = sessionExpired
      ? '/'
      : isAuthenticatedUser
        ? '/for-you'
        : user?.isAnonymous
          ? location.pathname
          : '/'
    if (initialDestination && location.pathname !== initialDestination) {
      navigate(initialDestination, { replace: true })
    }
    shouldApplyInitialRoute.current = false
  }, [isAuthenticatedUser, loading, location.pathname, navigate, sessionExpired, user])

  return (
    <Routes>
      <Route
        path='/'
        element={isAuthenticatedUser ? <Navigate to='/for-you' replace /> : <WelcomePage />}
      />

      <Route
        path='/for-you/*'
        element={!user || sessionExpired
          ? <Navigate to='/' replace />
          : <Dashboard isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
      />

      <Route
        path='/post-create-one'
        element={user && !sessionExpired ? <CreatePost /> : <Navigate to='/' replace />}
      />

      <Route
        path='/video-create-one'
        element={user && !sessionExpired ? <CreateVideo /> : <Navigate to='/' replace />}
      />

      <Route
        path='/reset-password'
        element={isAuthenticatedUser ? <Navigate to='/for-you' replace /> : <ResetPasswordPage />}
      />

      <Route
        path='*'
        element={isAuthenticatedUser ? <Navigate to='/for-you' replace /> : <Navigate to='/' replace />}
      />
    </Routes>
  )
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('feelamong-theme') === 'dark')

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('feelamong-theme', theme)
  }, [isDarkMode])

  return (
    <BrowserRouter>
      <AppRoutes isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </BrowserRouter>
  )
}

export default App
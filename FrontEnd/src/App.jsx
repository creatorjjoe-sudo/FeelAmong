import { useContext, useEffect, useRef, useState } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import './styles/app.css'
import './styles/darkmode.css'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import CreateVideo from './pages/CreateVideo'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { AuthContext } from './api/context/AuthContext'

function AppRoutes() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('feelamong-theme') === 'dark')
  const { user, loading, sessionExpired } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const shouldApplyInitialRoute = useRef(true)
  const isAuthenticatedUser = Boolean(user) && !user.isAnonymous

  useEffect(() => {
    let pageTitle = 'Login'
    const path = location.pathname
    const params = new URLSearchParams(location.search)

    if (path === '/' || path === '') pageTitle = 'Login'
    else if (path === '/reset-password') pageTitle = 'Reset password'
    else if (path === '/post-create-one') {
      pageTitle = params.get('edit') ? 'Edit post' : 'Create post'
    } else if (path === '/video-create-one') pageTitle = 'Create video'
    else if (path.startsWith('/for-you')) {
      if (path === '/for-you' || path === '/for-you/') pageTitle = 'Dashboard'
      else if (path.includes('/messages')) pageTitle = 'Messages'
      else if (path.includes('/videos')) pageTitle = 'Videos'
      else if (path.includes('/notifications')) pageTitle = 'Updates'
      else if (path.includes('/friends')) pageTitle = 'Friends'
      else if (path.includes('/profile')) pageTitle = 'Profile'
      else if (path.includes('/company-create')) pageTitle = 'Create company'
      else if (path.includes('/saved')) pageTitle = 'Saved'
      else if (path.includes('/save/create-container')) pageTitle = 'Create container'
      else if (path.includes('/save')) pageTitle = 'Save post'
      else if (path.includes('/settings')) pageTitle = 'Settings'
    }

    document.title = `Feelamong | ${pageTitle}`
  }, [location.pathname, location.search])

  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('feelamong-theme', theme)
  }, [isDarkMode])

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

  return <Outlet context={{ isDarkMode, setIsDarkMode }} />
}

function WelcomeRoute() {
  const { user } = useContext(AuthContext)
  const isAuthenticatedUser = Boolean(user) && !user.isAnonymous
  return isAuthenticatedUser ? <Navigate to="/for-you" replace /> : <WelcomePage />
}

function DashboardRoute() {
  const { user, sessionExpired } = useContext(AuthContext)
  const { isDarkMode, setIsDarkMode } = useOutletContext()

  return !user || sessionExpired
    ? <Navigate to="/" replace />
    : <Dashboard isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
}

function CreatePostRoute() {
  const { user, sessionExpired } = useContext(AuthContext)
  return user && !sessionExpired ? <CreatePost /> : <Navigate to="/" replace />
}

function CreateVideoRoute() {
  const { user, sessionExpired } = useContext(AuthContext)
  if (!user || user.isAnonymous || sessionExpired) return <Navigate to="/" replace />
  if (!user.isCompany) return <Navigate to="/for-you" replace />
  return <CreateVideo />
}

function ResetPasswordRoute() {
  const { user } = useContext(AuthContext)
  const isAuthenticatedUser = Boolean(user) && !user.isAnonymous
  return isAuthenticatedUser ? <Navigate to="/for-you" replace /> : <ResetPasswordPage />
}

function NotFoundRoute() {
  const { user } = useContext(AuthContext)
  const isAuthenticatedUser = Boolean(user) && !user.isAnonymous
  return <Navigate to={isAuthenticatedUser ? "/for-you" : "/"} replace />
}

const router = createBrowserRouter([{
  element: <AppRoutes />,
  children: [
    { path: '/', element: <WelcomeRoute /> },
    { path: '/for-you/*', element: <DashboardRoute /> },
    { path: '/post-create-one', element: <CreatePostRoute /> },
    { path: '/video-create-one', element: <CreateVideoRoute /> },
    { path: '/reset-password', element: <ResetPasswordRoute /> },
    { path: '*', element: <NotFoundRoute /> },
  ],
}])

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
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
  if (!user || sessionExpired) return <Navigate to="/" replace />
  return user.isCompany ? <CreateVideo /> : <Navigate to="/for-you/videos" replace />
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
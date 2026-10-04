import React, { useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import './styles/app.css'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'
import { AuthContext } from './api/context/AuthContext'

function App() {
  const { user, loading } = useContext(AuthContext)
  const isLoggedIn = Boolean(user) && !loading

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/'
          element={isLoggedIn ? <Navigate to='/for-you' replace /> : <WelcomePage />}
        />

        <Route
          path='/for-you/*'
          element={<Dashboard />}
        />

        <Route
          path='/post-create-one'
          element={isLoggedIn ? <CreatePost /> : <Navigate to='/' replace />}
        />

        <Route
          path='*'
          element={isLoggedIn ? <Navigate to='/for-you' replace /> : <Navigate to='/' replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
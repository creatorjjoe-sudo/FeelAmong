import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import WelcomeMobile from './pages/WelcomeMobile'
import SignupForm from './components/welcome/SignupForm'
import LoginForm from './components/welcome/LoginForm'
import './styles/app.css'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<WelcomePage />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/post-create' element={<CreatePost />} />
      </Routes>    
    </BrowserRouter>

  )
}

export default App
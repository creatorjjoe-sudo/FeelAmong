import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import WelcomeMobile from './pages/WelcomeMobile'
import SignupForm from './components/welcome/SignupForm'
import LoginForm from './components/welcome/LoginForm'
import './styles/app.css'
import Dashboard from './pages/Dashboard'


function App() {
  return (
    <>
    <WelcomePage />
    </>
  )
}

export default App
import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import WelcomeMobile from './pages/WelcomeMobile'
import SignupForm from './components/welcome/SignupForm'
import LoginForm from './components/welcome/LoginForm'
import './styles/app.css'
import Dashboard from './pages/Dashboard'


function App() {

  const [activeOption, setActiveOption] = React.useState('login')

  function setOption(value) {
    setActiveOption(value)
  }

  return (
    <BrowserRouter>
      <Routes>
      <Route path='/' element={
        <>
          <div className='desktop-container'>
            <WelcomePage setOption={setOption} activeOption={activeOption} />
          </div>
          <div className='mobile-container'>
            <WelcomeMobile setOption={setOption} activeOption={activeOption} />
          </div>
        </>
      } />

      <Route path='/login' element={<LoginForm />} />
      <Route path='/signup' element={<SignupForm />} />
      <Route path='/dashboard' element={<Dashboard />} />
    </Routes>
    </BrowserRouter>
  )
}

export default App
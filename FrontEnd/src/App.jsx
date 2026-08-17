import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import WelcomeMobile from './pages/WelcomeMobile'
import SignupForm from './components/SignupForm'
import LoginForm from './components/LoginForm'
import './styles/app.css'

function AppContent() {
  const [activeOption, setActiveOption] = React.useState('login')
  const navigate = useNavigate()

  React.useEffect(() => {
    function handleResize() {
      const isDesktop = window.innerWidth > 800
      const currentPath = window.location.pathname

      if (isDesktop) {
        if (currentPath !== '/') {
          navigate('/')
        }
      } else {
        if (currentPath === '/') {
          if (activeOption === 'login') {
            navigate('/login')
          } else if (activeOption === 'signup') {
            navigate('/signup')
          }
        }
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [activeOption, navigate])

  function setOption(value) {
    setActiveOption(value)
  }
  return (
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
      <Route path='/dashboard' element={<div>No account with limited access</div>} />
    </Routes>
  )

}

function App() {

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>

  )
}

export default App
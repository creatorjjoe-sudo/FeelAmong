import React from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import WelcomePage from './pages/WelcomePage'
import './styles/app.css'
import Dashboard from './pages/Dashboard'
import CreatePost from './pages/CreatePost'

function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)

  const changeLoginState = (value) => {
  setIsLoggedIn(value)
}
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/*' element={!isLoggedIn ? <WelcomePage changeLoginState={changeLoginState} /> : <Dashboard />} />
        <Route path='/post-create-one' element={<CreatePost />} />
      </Routes>    
    </BrowserRouter>

  )
}

export default App
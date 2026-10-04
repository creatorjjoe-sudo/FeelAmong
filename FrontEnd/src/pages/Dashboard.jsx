import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'
import MobileHeader from '../components/dashboard/MobileHeader'
import MobileFooter from '../components/dashboard/MobileFooter'
import Videos from '../components/dashboard/Videos'
import Messages from '../components/dashboard/Messages'

function Dashboard() {

  const location = useLocation()
 
  const [activeView, setActiveView] = React.useState('for-you')
  function switchActive(value) {
    setActiveView(value)
  }

  return (
    <div className='dashboard-container'>
      <title>Feelamong | Dashboard</title>
      <MobileHeader />
      <Navbar
        activeView={activeView}
        switchActive={switchActive}
      />

      <MobileFooter
        activeView={activeView}
        switchActive={switchActive}
      />

      <Routes>
        <Route index element={<Posts />} />
        <Route path="messages" element={<Messages />} />
        <Route path="videos" element={<Videos />} />
      </Routes>
    </div>
  )
}

export default Dashboard
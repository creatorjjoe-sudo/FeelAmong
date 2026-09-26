import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'
import MobileHeader from '../components/dashboard/MobileHeader'
import MobileFooter from '../components/dashboard/MobileFooter'
import Videos from '../components/dashboard/Videos'
import Messages from '../components/dashboard/Messages'

function Dashboard() {
 
  const [activeView, setActiveView] = React.useState('for-you')
  function switchActive(value) {
    setActiveView(value)
  }

  return (
    <div className='dashboard-container'>
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
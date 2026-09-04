import React from 'react'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'
import MobileHeader from '../components/dashboard/MobileHeader'
import MobileFooter from '../components/dashboard/MobileFooter'

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
      <Posts />
      <MobileFooter
        activeView={activeView}
        switchActive={switchActive}
      />
    </div>
  )
}

export default Dashboard
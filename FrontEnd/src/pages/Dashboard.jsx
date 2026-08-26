import React from 'react'
import Header from '../components/dashboard/Header'
import Navbar from '../components/dashboard/Navbar'
import '../styles/pages/dashboard.css'
import Posts from '../components/dashboard/Posts'

function Dashboard() {
  return (
    <div className='dashboard-container'>
     <Header />
     <Navbar />
     <Posts />
     </div>
  )
}

export default Dashboard
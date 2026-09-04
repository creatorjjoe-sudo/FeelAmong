import React from 'react'
import '../styles/pages/login.css'
import LoginForm from '../components/welcome/LoginForm'

function WelcomePage() {
  
  return (
    <div className='welcome-container'>
      <div className="wrapper left-container">
        <h1>feelamong</h1>
        <p>Makes connection with both emmediate or new people easier</p>
      </div>
      <div className="wrapper middle-container">
        
           <LoginForm/>

      </div>
      <div className="wrapper right-container"></div>
    </div>
  )
}

export default WelcomePage
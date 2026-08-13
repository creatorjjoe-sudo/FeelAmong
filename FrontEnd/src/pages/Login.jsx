import React from 'react'
import { ICONS } from '../assets/icons'
import '../styles/login.css'

function Login() {
  return (
    <div className='login-container'>
      <div className="screen left">
        
        <div className="app-intro">
          <img className='app-logo' src={ICONS.appLogo} alt="App Logo" />
          <p>Makes connection with both immediate and new people easier <br />
          <div>
            <span>Learn more </span> <img src={ICONS.arrowForward} alt="" />
          </div>
          </p>
        </div>

        <div className="option-container login">
          <img className='user-green' src={ICONS.userGreen} alt="" />
          <div className="option login">
            <h2>Logging in</h2>
            <p>With account you can chat other users, comment on people’s posts, like and take other actions </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

      </div>
      <div className="screen-divider"></div>

      <div className="screen middle"></div>
      <div className="screen right"></div>
    </div>
  )
}

export default Login
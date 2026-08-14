import React from 'react'
import { ICONS } from '../assets/icons'
import '../styles/login.css'
import LoginForm from '../components/LoginForm'
import SignupForm from '../components/SignupForm'

function WelcomePage() {
  const [activeOption, setActiveOption] = React.useState('login')
  return (
    <div className='login-container'>
      <div className="screen left">
        
        <div className="app-intro">
          <img className='app-logo' src={ICONS.appLogo} alt="App Logo" />
          <p>Makes connection with both immediate and new people easier
          </p>
          <div className='learn-more'>
            <span>Learn more </span> <img src={ICONS.arrowForward} alt="" />
          </div>
        </div>

        <div className='option-container login'>
          <img className='user-icon' src={ICONS.userGreen} alt="" />
          <div className={`option ${activeOption === 'login' ? 'active' : ''}`} onClick={() => setActiveOption('login')}>
            <h2>Logging in</h2>
            <p>With account you can chat other users, comment on people’s posts, like and take other actions </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

        <div className="option-container noaccount">
          <img className='user-icon' src={ICONS.userBlack} alt="" />
          <div className={`option ${activeOption === 'no-account' ? 'active' : ''}`} onClick={() => setActiveOption('no-account')}>
            <h2>No account</h2>
            <p>No worries, you can still use feelamong without an account but with limited access.
            </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

        <div className="option-container signup">
          <img className='user-icon' src={ICONS.userBlue} alt="" />
          <div className={`option ${activeOption === 'signup' ? 'active' : ''}`} onClick={() => setActiveOption('signup')}>
            <h2>Sign up </h2>
            <p>We recommend you to create an account if you don't have one yet
            </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

      </div>
      <div className="screen-divider"></div>
      
      {activeOption === 'login' && <LoginForm />}
      {activeOption === 'signup' && <SignupForm />}
      {activeOption === 'no-account' && <button className='continue-btn'>Continue</button>}

      <div className="screen right">
        <div className='search-container'>
          <input type="text" placeholder='Find my account' /> <button><img src={ICONS.themeToggle} alt="theme-toggle" /></button>
          </div>
      </div>
    </div>
  )
}

export default WelcomePage
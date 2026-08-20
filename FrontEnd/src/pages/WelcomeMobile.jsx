import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ICONS } from '../assets/icons'
import '../styles/components/welcome/login.css'

function WelcomeMobile({setOption, activeOption}) {
  const navigate = useNavigate()

  function handleContinue () {
    if(activeOption === 'login') navigate('/login')
    if(activeOption === 'signup') navigate('/signup')
    if(activeOption === 'no-account') navigate('/dashboard')
  }

  function loginValue(e) {
    e.preventDefault()
    setOption('login')
  }
  function noaccountValue(e) {
    e.preventDefault()
    setOption('no-account')
  }
  function signupValue(e) {
    e.preventDefault()
    setOption('signup')
  }
  return (
    <div className='login-container'>
      <div className="screen left">
      
        <div className="app-intro">
          <img className='app-logo' src={ICONS.appLogo} alt="App Logo" />
          <p>Makes connection with both immediate and new people easier</p>
          <div className='learn-more'>
            <span>Learn more </span> <img src={ICONS.arrowForward} alt="" />
          </div>
        </div>

        <div className='option-container login'>
          <img className='user-icon' src={ICONS.userGreen} alt="" />
          <div className={`option ${activeOption === 'login' ? 'active' : ''}`} onClick={loginValue}>
            <h2>{activeOption === 'login' && 'Loggin in'} {activeOption !== 'login' && 'Login'}</h2>
            <p>With account you can chat other users, comment on people’s posts, like and take other actions </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

        <div className="option-container noaccount">
          <img className='user-icon' src={ICONS.userBlack} alt="" />
          <div className={`option ${activeOption === 'no-account' ? 'active' : ''}`} onClick={noaccountValue}>
            <h2>No account</h2>
            <p>No worries, you can still use feelamong without an account but with limited access.
            </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

        <div className="option-container signup">
          <img className='user-icon' src={ICONS.userBlue} alt="" />
          <div className={`option ${activeOption === 'signup' ? 'active' : ''}`} onClick={signupValue}>
            <h2>{activeOption === 'signup' && 'Signing up'} {activeOption !== 'signup' && 'Signup'}</h2>
            <p>We recommend you to create an account if you don't have one yet
            </p>
            <img className='info' src={ICONS.info} alt="" />
          </div>
        </div>

        <div className="separator"></div>

      </div>
      <button className='cont-btn' onClick={handleContinue}>Continue</button>
    </div>
  )
}

export default WelcomeMobile
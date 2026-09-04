import React, { useState } from 'react'
import '../../styles/pages/login.css'
import { ICONS } from '../../assets/icons'

function LoginForm() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordToggle, setPasswordToggle] = React.useState(false)
  const passwordNotEmpty = password.trim()

  const handleNext = (e) => {
    e.preventDefault();
    if (email.trim() !== '') {
      setStep(2);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password.trim() !== '') {
      alert(`Logging in with ${email}`);
      // Your login logic here
    }
  };

  const showPassword = () => {
    setPasswordToggle(!passwordToggle)
  }

  return (
    <div className='form-wrapper'>
      {/* Dynamic submit handler based on current step */}
      <form onSubmit={step === 1 ? handleNext : handleLogin} className='login-form'>
        <div className="top-group">
          <img src={ICONS.feelLogo} alt="" />
        </div>
        <div className="login-body">
          <div className="middle-group">
            <div className="middle-top">
              <h1>Login</h1>
              <img src={ICONS.userGreen} alt="" />
            </div>
            
            {/* The sliding window wrapper */}
            <div className="input-slider-window">
              <div className={`input-group-wrapper step-${step}`}>
               
                <div className='input-group email'>
                  <input 
                    id='input-email' 
                    type="text" 
                    placeholder=' ' 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <label htmlFor="input-email">Enter email</label>
                  <label htmlFor="input-email" className='input-icon'>
                    <img  src={ICONS.email} alt="" />
                  </label>
                </div>
            
                <div className='input-group password'>
                  <input 
                    id='input-password' 
                    type={passwordToggle ? 'text' : 'password'} 
                    placeholder=' ' 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={step === 2}
                  />
                  <label htmlFor="input-password">Password</label>
                  <label htmlFor="input-email" className='input-icon'>
                    <img  src={ICONS.lock} alt="" />
                  </label>
                  {passwordNotEmpty && <img className='pw-toggle' onClick={showPassword} src={`${passwordToggle? ICONS.eyeOpen : ICONS.eyeClose}`}/>}
                </div>
        
              </div>
            </div>

          </div>
          <div className="bottom-group password">
            {/* Dynamic text for lost options */}
            <p className='lost-email'>
              {step === 1 ? 'Lost email?' : 'Lost password?'}
            </p>
            
            {/* Dynamic button text */}
            <button type="submit" className='login-btn'>
              {step === 1 ? 'Next' : 'Login'}
            </button>

            {/* Optional back link to return to email step */}
            {step === 2 && (
              <p onClick={() => setStep(1)} style={{ cursor: 'pointer', fontSize: '14px', color: '#8089b0' }}>
                Go Back
              </p>
            )}

            <div className="other-options">
              <div className="thin-line"></div>
              <p>or</p>
              <div className="thin-line"></div>
            </div>
            <p>Login with:</p>
            <div className="social-icons">
              <img src={ICONS.google} alt="" />
              <img src={ICONS.facebook} alt="" />
            </div>
            <p>Not feelamong user yet? <span>Signup</span></p>
          </div>
        </div>

      </form>
    </div>
  )
}

export default LoginForm

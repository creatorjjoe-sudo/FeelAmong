import React, { useState, useEffect, useContext } from 'react';
import '../../styles/pages/login.css';
import { ICONS } from '../../assets/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../src/api/context/AuthContext'; // Hooked global context

function LoginForm({ view, switchView, changeLoginState }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordToggle, setPasswordToggle] = useState(false);
  const [error, setError] = useState(false);
  const [serverError, setServerError] = useState(''); // Holds API request errors
  const [loading, setLoading] = useState(false); // Manages button submission states
  
  const { login } = useContext(AuthContext);
  const passwordNotEmpty = password.trim() !== '';
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const navigate = useNavigate();

  const handleNext = (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setError(true);
      return;
    } else {
      setError(false);
    }
    if (email.trim() !== '') {
      setStep(2);
    }
  };

  function clearError() {
    if (error && EMAIL_REGEX.test(email)) {
      setError(false);
    }
  }

  useEffect(function() {
    clearError();
  }, [email, error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password.trim() === '') return;

    setServerError('');
    setLoading(true);

    try {
      // Maps to your customized /api/auth/login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginIdentifier: email, // Backend handles either username or email via this key
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      login(data); 
      changeLoginState(true)
      navigate('/for-you')
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Anonymous = async () => {
    setServerError('');
    setLoading(true);
    try {
      // Maps to your customized /api/auth/guest setup endpoint
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Guest connection failed');
      }

      login(data);
      navigate('/for-you');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showPassword = () => {
    setPasswordToggle(!passwordToggle);
  };

  function signup() {
    switchView('signup');
  }

  return (
    <div className='form-wrapper'>
      {/* Backend API server responses placeholder display */}
      {serverError && <div className="server-error-container">{serverError}</div>}

      <form onSubmit={step === 1 ? handleNext : handleLogin} className='login-form'>
        <div className="top-group">
          {step === 2 && (
            <p onClick={() => setStep(1)} style={{ cursor: 'pointer', fontSize: '14px', color: '#8089b0' }}>
              Go Back
            </p>
          )}
          <img src={ICONS.feelLogo} alt="" />
        </div>
        <div className="login-body">
          <div className="middle-group">
            <div className="middle-top">
              <h1>Login</h1>
              <img src={ICONS.userGreen} alt="" />
            </div>
            
            <div className="input-slider-window">
              <div className={`input-group-wrapper step-${step}`}>
               
                <div className='input-group email'>
                  <input 
                    id='input-email' 
                    type="text" 
                    placeholder=' ' 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="input-email">Enter email</label>
                  <label htmlFor="input-email" className='input-icon'>
                    <img src={ICONS.email} alt="" />
                  </label>
                  {error && <p className={`error-msg-email ${error ? 'show' : ''}`}>Please enter a valid email!</p>}
                </div>
            
                <div className='input-group password'>
                  <input 
                    id='input-password' 
                    type={passwordToggle ? 'text' : 'password'} 
                    placeholder=' ' 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required={step === 2}
                  />
                  <label htmlFor="input-password">Password</label>
                  <label htmlFor="input-password" className='input-icon'>
                    <img src={ICONS.lock} alt="" />
                  </label>
                  {passwordNotEmpty && <img className='pw-toggle' onClick={showPassword} src={`${passwordToggle ? ICONS.eyeOpen : ICONS.eyeClose}`} alt="" />}
                </div>
        
              </div>
            </div>
          </div>
          <div className="bottom-group password">
            <p className='lost-email'>
              {step === 1 ? 'Lost email?' : 'Lost password?'}
            </p>
            
            <button type="submit" className='login-btn' disabled={loading}>
              {loading ? '...' : (step === 1 ? 'Next' : 'Login')}
            </button>

            <div className="other-options">
              <div className="thin-line"></div>
              <p>or</p>
              <div className="thin-line"></div>
            </div>
            <p>Login with:</p>
            <div className="social-icons">
              {/* Added native button wrappers for accessibility triggers */}
              <img src={ICONS.google} alt="Google Auth Option" style={{ cursor: 'pointer' }} />
              <img src={ICONS.facebook} alt="Facebook Auth Option" style={{ cursor: 'pointer' }} />
            </div>
            <p>Not feelamong user yet? <span onClick={signup}>Signup</span></p>
          </div>
        </div>
      </form>
      <button className='anonymous-btn' onClick={Anonymous} disabled={loading}>
        {loading ? 'Connecting...' : 'Anonymous'}
      </button>
    </div>
  );
}

export default LoginForm;

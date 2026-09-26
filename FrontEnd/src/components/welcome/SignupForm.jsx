import React, { useState, useContext, useEffect } from 'react';
import '../../styles/pages/login.css';
import { ICONS } from '../../assets/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../src/api/context/AuthContext';

function SignupForm({ switchView }) {
  // Configured with 5 separate operational step panels
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');

  const [passwordToggle, setPasswordToggle] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const passwordNotEmpty = password.trim() !== '';
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  const handleNextStep = (e) => {
    e.preventDefault();
    setServerError('');

    if (step === 1) {
      if (!EMAIL_REGEX.test(email)) {
        setEmailError(true);
        return;
      }
      setEmailError(false);
      if (email.trim() !== '') setStep(2);
    } else if (step === 2) {
      if (username.trim() !== '') setStep(3);
    } else if (step === 3) {
      if (password.trim() !== '') setStep(4);
    } else if (step === 4) {
      if (dateOfBirth.trim() !== '') setStep(5);
    }
  };

  useEffect(() => {
    if (emailError && EMAIL_REGEX.test(email)) {
      setEmailError(false);
    }
  }, [email, emailError]);

    const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!sex) {
      setServerError('Please select your gender.');
      return;
    }

    setServerError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username,
          password,
          dateOfBirth,
          sex,
          status: 'Single',
          bio: '',
          from: ''
        }),
      });

      // 1. Get raw text instead of trying to parse JSON immediately
      const responseText = await response.text();
      
      // 2. Safely parse text only if it has content
      let data = {};
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          throw new Error(`Server returned invalid formatting: ${response.status}`);
        }
      }

      // 3. Catch backend logic errors safely
      if (!response.ok) {
        throw new Error(data.message || `Server responded with status ${response.status}`);
      }

      login(data);
      navigate('/');
      switchView('login')
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const showPassword = () => {
    setPasswordToggle(!passwordToggle);
  };

  return (
    <div className='form-wrapper'>
      {serverError && <div className="server-error-container">{serverError}</div>}

      <form onSubmit={step === 5 ? handleSignupSubmit : handleNextStep} className='login-form'>
        <div className="top-group">
          {step > 1 && (
            <p onClick={() => setStep(step - 1)} style={{ cursor: 'pointer', fontSize: '14px', color: '#8089b0' }}>
              Go Back
            </p>
          )}
          <img src={ICONS.feelLogo} alt="" />
        </div>

        <div className="login-body">
          <div className="middle-group">
            <div className="middle-top">
              <h1>Signup</h1>
              <img src={ICONS.userGreen} alt="" />
            </div>

            <div className="input-slider-window">
              <div className={`input-group-wrapper step-${step} custom-signup-slider`}>

                {/* STEP 1: Email Address */}
                <div className="signup-slide-panel">
                  <div className='input-group email'>
                    <input id='input-email' type="text" placeholder=' ' value={email} onChange={(e) => setEmail(e.target.value)} required={step === 1}
                    />
                    <label htmlFor="input-email">Enter email</label>
                    <label htmlFor="input-email" className='input-icon'>
                      <img src={ICONS.email} alt="" />
                    </label>
                    {emailError && <p className="error-msg-email show">Please enter a valid email!</p>}
                  </div>
                </div>

                {/* STEP 2: Username */}
                <div className="signup-slide-panel">
                  <div className='input-group username'>
                    <input id='input-username' type="text" placeholder=' ' value={username} onChange={(e) => setUsername(e.target.value)} required={step === 2}
                    />
                    <label htmlFor="input-username">Enter username</label>
                    <label htmlFor="input-username" className='input-icon'>
                      <img src={ICONS.userGreen} alt="" style={{ width: '20px', height: '20px' }} />
                    </label>
                  </div>
                </div>

                {/* STEP 3: Password */}
                <div className="signup-slide-panel">
                  <div className='input-group password'>
                    <input id='input-password' type={passwordToggle ? 'text' : 'password'} placeholder=' ' value={password} onChange={(e) => setPassword(e.target.value)} required={step === 3}
                    />
                    <label htmlFor="input-password">Password</label>
                    <label htmlFor="input-password" className='input-icon'>
                      <img src={ICONS.lock} alt="" />
                    </label>
                    {passwordNotEmpty && <img className='pw-toggle' onClick={showPassword} src={passwordToggle ? ICONS.eyeOpen : ICONS.eyeClose} alt="" />}
                  </div>
                </div>

                {/* STEP 4: Date of Birth */}
                <div className="signup-slide-panel profile-details-panel">
                  <div className='input-group dob-input-group'>
                    <input id='input-dob' type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required={step === 4}
                    />
                    <label htmlFor="input-dob" className="static-select-label">Date of Birth</label>
                  </div>
                </div>

                {/* STEP 5: Gender / Sex */}
                <div className="signup-slide-panel profile-details-panel">
                  <div className='input-group gender-select-group'>
                    <select id="input-sex" value={sex} onChange={(e) => setSex(e.target.value)} required={step === 5}
                    >
                      <option value="" disabled hidden>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <label htmlFor="input-sex" className="static-select-label">Gender</label>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="bottom-group password">
            <button type="submit" className='login-btn' disabled={loading}>
              {loading ? '...' : (step === 5 ? 'Register' : 'Next')}
            </button>

            {step === 1 && (
              <>
                <div className="other-options">
                  <div className="thin-line"></div>
                  <p>or</p>
                  <div className="thin-line"></div>
                </div>
                <p>Continue with:</p>
                <div className="social-icons">
                  <img src={ICONS.google} alt="" style={{ cursor: 'pointer' }} />
                  <img src={ICONS.facebook} alt="" style={{ cursor: 'pointer' }} />
                </div>
              </>
            )}

            <p style={{ marginTop: '10px' }}>
              feelamong user? <span onClick={() => switchView('login')}>Login</span>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SignupForm;

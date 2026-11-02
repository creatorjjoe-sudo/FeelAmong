import React, { useState, useEffect, useContext } from 'react';
import '../../styles/pages/login.css';
import { ICONS } from '../../assets/icons';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../src/api/context/AuthContext'; // Hooked global context
import { getProfileAvatar } from '../../utils/profileAvatar'

function LoginForm({ view, switchView, selectedAccount }) {
  const [step, setStep] = useState(selectedAccount ? 2 : 1);
  const [accountPreview, setAccountPreview] = useState(selectedAccount || null);
  const [email, setEmail] = useState(selectedAccount?.email || selectedAccount?.username || '');
  const [password, setPassword] = useState('');
  const [passwordToggle, setPasswordToggle] = useState(false);
  const [error, setError] = useState(false);
  const [serverError, setServerError] = useState(''); // Holds API request errors
  const [showIncorrectPasswordModal, setShowIncorrectPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false); // Manages button submission states
  const passwordInputRef = React.useRef(null);

  const { login } = useContext(AuthContext);
  const passwordNotEmpty = password.trim() !== '';
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedAccount) passwordInputRef.current?.focus();
  }, [selectedAccount]);

  const handleNext = async (e) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError(true);
      return;
    }

    setError(false);
    setServerError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Could not look up the account');
      }

      if (!data.profile) {
        setAccountPreview(null);
        setServerError('Account not found');
        return;
      }

      setEmail(normalizedEmail);
      setAccountPreview(data.profile);
      setPassword('');
      setServerError('');
      setStep(2);
    } catch (lookupError) {
      setServerError(lookupError.message || 'Could not look up the account');
    } finally {
      setLoading(false);
    }
  };

  function clearError() {
    if (error && EMAIL_REGEX.test(email)) {
      setError(false);
    }
  }

  useEffect(function () {
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
        if (response.status === 401) {
          setShowIncorrectPasswordModal(true);
          return;
        }
        throw new Error(data.message || 'Unable to log in');
      }

      login(data);
      navigate('/for-you', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Anonymous = () => {
    login({ isAnonymous: true });
    navigate('/for-you', { replace: true });
  };

  const showPassword = () => {
    setPasswordToggle(!passwordToggle);
  };

  const retryPassword = () => {
    setShowIncorrectPasswordModal(false);
    setPassword('');
    window.requestAnimationFrame(() => passwordInputRef.current?.focus());
  };

  function signup() {
    switchView('signup');
  }

  return (
    <div className='form-wrapper'>
      {/* Backend API server responses placeholder display */}
      {serverError && <div className="server-error-container" role="alert">{serverError}</div>}
      {showIncorrectPasswordModal && (
        <div className="login-modal-backdrop">
          <section
            className="login-error-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-error-title"
          >
            <h2 id="login-error-title">Incorrect password</h2>
            <button type="button" onClick={retryPassword}>Try again</button>
          </section>
        </div>
      )}

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
              <h1>
                {step === 2 && accountPreview?.firstName
                  ? `Login, ${accountPreview.firstName}`
                  : 'Login'}
              </h1>
              {step === 2 && accountPreview ? (
                <img className="login-account-avatar" src={getProfileAvatar(accountPreview)} alt="" />
              ) : (
                <img src={ICONS.userGreen} alt="" />
              )}
            </div>

            <div className="input-slider-window">
              <div className={`input-group-wrapper step-${step}`}>

                <div className='input-group email'>
                  <input id='input-email' type="text" placeholder=' ' value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || step === 2} required
                  />
                  <label htmlFor="input-email">Enter email</label>
                  <label htmlFor="input-email" className='input-icon'>
                    <img src={ICONS.email} alt="" />
                  </label>
                  {error && <p className={`error-msg-email ${error ? 'show' : ''}`}>Please enter a valid email!</p>}
                </div>

                <div className='input-group password'>
                  <input ref={passwordInputRef} id='input-password' type={passwordToggle ? 'text' : 'password'} placeholder=' ' value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required={step === 2}
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
        {loading ? 'Connecting...' : 'Continue without account'}
      </button>
    </div>
  );
}

export default LoginForm;

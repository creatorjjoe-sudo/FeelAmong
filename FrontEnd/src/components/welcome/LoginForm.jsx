import React, { useState, useEffect, useContext } from 'react';
import '../../styles/pages/login.css';
import { ICONS } from '../../assets/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../src/api/context/AuthContext'; // Hooked global context
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import { API_ORIGIN } from '../../api/config'

function LoginForm({ view, switchView, selectedAccount, onCancelAccount, onRemoveDeviceAccount }) {
  const location = useLocation();
  const [step, setStep] = useState(selectedAccount ? 2 : 1);
  const [accountPreview, setAccountPreview] = useState(selectedAccount || null);
  const [email, setEmail] = useState(selectedAccount?.email || selectedAccount?.username || '');
  const [password, setPassword] = useState('');
  const [passwordToggle, setPasswordToggle] = useState(false);
  const [error, setError] = useState(false);
  const [serverError, setServerError] = useState(''); // Holds API request errors
  const [loading, setLoading] = useState(false); // Manages button submission states
  const passwordInputRef = React.useRef(null);

  const { login } = useContext(AuthContext);
  const passwordNotEmpty = password.trim() !== '';
  const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const navigate = useNavigate();
  const showIncorrectPasswordModal = location.state?.routedModal === 'login-incorrect-password'

  const [showAccountPasswordModal, setShowAccountPasswordModal] = useState(!!selectedAccount);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [showRemoveAccountModal, setShowRemoveAccountModal] = useState(false);
  const [removeAccountPassword, setRemoveAccountPassword] = useState('');
  const [removeAccountError, setRemoveAccountError] = useState('');
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const modalPasswordInputRef = React.useRef(null);
  // Marks the history entry pushed for this modal, so the browser back button
  // can close the modal the same way the other routed modals in the app do.
  const MODAL_HISTORY_KEY = 'accountPasswordModal';
  const pushedHistoryRef = React.useRef(false);

  const openAccountPasswordModal = () => {
    setShowAccountPasswordModal(true);
    if (!location.state?.[MODAL_HISTORY_KEY]) {
      pushedHistoryRef.current = true;
      navigate(location.pathname + location.search + location.hash, {
        replace: false,
        state: { ...(location.state || {}), [MODAL_HISTORY_KEY]: true },
      });
    } else {
      setShowAccountPasswordModal(true);
    }
  };

  // Runs the same flow as the Cancel button whenever the modal is dismissed.
  const dismissAccountPasswordModal = () => {
    setPassword('');
    setServerError('');
    if (onCancelAccount) onCancelAccount();
    setStep(1);
  };

  const cancelAccountLogin = () => {
    setShowAccountPasswordModal(false);
    dismissAccountPasswordModal();
    // Drop the history entry we pushed when the modal opened so the back
    // button doesn't have to unwind it twice.
    if (location.state?.[MODAL_HISTORY_KEY]) navigate(-1);
    pushedHistoryRef.current = false;
  };

  // Closes the modal when the browser back button pops our history entry.
  const hadModalFlagRef = React.useRef(false);
  useEffect(() => {
    if (location.state?.[MODAL_HISTORY_KEY]) {
      // The modal's own history entry is active — remember that.
      hadModalFlagRef.current = true;
    } else if (hadModalFlagRef.current && showAccountPasswordModal) {
      // The flag was active before and is now gone: the user pressed the
      // browser back button. Close the modal and return to the plain form.
      hadModalFlagRef.current = false;
      pushedHistoryRef.current = false;
      setShowAccountPasswordModal(false);
      dismissAccountPasswordModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, showAccountPasswordModal]);

  useEffect(() => {
    if (selectedAccount) {
      // A saved account was (re)selected: open the password modal for it.
      setAccountPreview(selectedAccount);
      setEmail(selectedAccount.email || selectedAccount.username || '');
      setStep(2);
      openAccountPasswordModal();
      window.requestAnimationFrame(() => modalPasswordInputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await fetch(`${API_ORIGIN}/api/auth/login-preview`, {
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
      const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
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
          pushRoutedModal(navigate, location, 'login-incorrect-password');
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
    closeRoutedModal(navigate, location);
    setPassword('');
    window.requestAnimationFrame(() => {
      const target = showAccountPasswordModal ? modalPasswordInputRef : passwordInputRef;
      target.current?.focus();
    });
  };

  // Login submitted from the account password modal (same logic as the form).
  const handleAccountModalLogin = async (e) => {
    await handleLogin(e);
    // On a 401 the incorrect-password modal shows; drop back into the inline
    // form so the "Try again" flow has somewhere to land.
  };

  const handleRemoveDeviceAccount = async (event) => {
    event.preventDefault();
    if (!selectedAccount || !removeAccountPassword || isRemovingAccount) return;

    setRemoveAccountError('');
    setIsRemovingAccount(true);
    try {
      const response = await fetch(`${API_ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginIdentifier: selectedAccount.email || selectedAccount.username,
          password: removeAccountPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'The password is incorrect.'
          : result.message || 'Could not verify your password.');
      }

      const accountId = selectedAccount._id;
      if (!accountId || String(result._id) !== String(accountId)) {
        throw new Error('The verified account does not match the saved account.');
      }

      onRemoveDeviceAccount(accountId);
      setShowRemoveAccountModal(false);
      setRemoveAccountPassword('');
      cancelAccountLogin();
    } catch (verificationError) {
      setRemoveAccountError(verificationError.message || 'Could not remove this account.');
    } finally {
      setIsRemovingAccount(false);
    }
  };

  const cancelRemoveAccount = () => {
    if (isRemovingAccount) return;
    setShowRemoveAccountModal(false);
    setRemoveAccountPassword('');
    setRemoveAccountError('');
  };

  function signup() {
    switchView('signup');
  }

  return (
    <div className='form-wrapper'>
      {/* Backend API server responses placeholder display */}
      {serverError && <div className="server-error-container" role="alert">{serverError}</div>}
      {showAccountPasswordModal && selectedAccount && (
        <div className="login-modal-backdrop">
          <section
            className="account-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-password-title"
          >
            <div className="account-password-header">
              <img
                className="account-password-avatar"
                src={getProfileAvatar(selectedAccount)}
                alt=""
              />
              <div className="account-password-details">
                <h2 id="account-password-title">
                  {selectedAccount.username
                    || [selectedAccount.firstName, selectedAccount.lastName].filter(Boolean).join(' ')
                    || selectedAccount.email}
                </h2>
                <p>Enter your password to continue</p>
              </div>
            </div>
            <form onSubmit={handleAccountModalLogin}>
              <div className="account-password-input">
                <input
                  id="account-modal-password"
                  ref={modalPasswordInputRef}
                  type={passwordToggle ? 'text' : 'password'}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <label htmlFor="account-modal-password">Password</label>
                <label htmlFor="account-modal-password" className="input-icon">
                  <img src={ICONS.lock} alt="" />
                </label>
                {password.trim() !== '' && (
                  <img
                    className="pw-toggle"
                    onClick={showPassword}
                    src={passwordToggle ? ICONS.eyeOpen : ICONS.eyeClose}
                    alt=""
                  />
                )}
              </div>
              <div className="account-password-actions">
                <button
                  type="button"
                  className="account-password-cancel"
                  onClick={cancelAccountLogin}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="account-password-login" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
            <div className="account-settings">
              <button
                className="account-settings-trigger"
                type="button"
                aria-label="Account settings"
                aria-haspopup="menu"
                aria-expanded={isAccountSettingsOpen}
                onClick={() => setIsAccountSettingsOpen((open) => !open)}
              >
                <img src={ICONS.settings} alt="" />
              </button>
              {isAccountSettingsOpen && (
                <div className="account-settings-menu" role="menu" aria-label="Account settings">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountSettingsOpen(false);
                      setRemoveAccountError('');
                      setShowRemoveAccountModal(true);
                    }}
                  >
                    Remove account from this device
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setIsAccountSettingsOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {showRemoveAccountModal && selectedAccount && (
        <div className="login-modal-backdrop remove-account-backdrop">
          <section
            className="account-password-modal remove-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-account-title"
          >
            <h2 id="remove-account-title">Remove account from this device?</h2>
            <p>Enter your password to confirm. This only removes the saved account from this device.</p>
            <form onSubmit={handleRemoveDeviceAccount}>
              <div className="account-password-input">
                <input
                  id="remove-account-password"
                  type="password"
                  placeholder=" "
                  value={removeAccountPassword}
                  onChange={(event) => setRemoveAccountPassword(event.target.value)}
                  disabled={isRemovingAccount}
                  required
                />
                <label htmlFor="remove-account-password">Password</label>
                <label htmlFor="remove-account-password" className="input-icon">
                  <img src={ICONS.lock} alt="" />
                </label>
              </div>
              {removeAccountError && <p className="remove-account-error" role="alert">{removeAccountError}</p>}
              <div className="account-password-actions">
                <button
                  type="button"
                  className="account-password-cancel"
                  onClick={cancelRemoveAccount}
                  disabled={isRemovingAccount}
                >
                  Cancel
                </button>
                <button type="submit" className="account-password-login" disabled={isRemovingAccount}>
                  {isRemovingAccount ? 'Verifying...' : 'Confirm removal'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
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
            <p className='lost-email' onClick={() => navigate('/reset-password', { state: { resetEmail: step === 1 ? email : '' } })}>
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

import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

import { ICONS } from '../assets/icons';

const Login = ({ onSwitchToRegister }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/auth/login', { loginIdentifier, password });
      login(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    try {
      const res = await API.post('/auth/guest');
      login(res.data);
    } catch (err) {
      setError('Guest login failed.');
    }
  };

  return (
    <div className="page-container">
      <div className="login-frame">
        {/* Left Sidebar */}
        <div className="login-left">
          <h1 className="brand-green">feelamong</h1>
          <p className="sub-text">Makes connection with both immediate or new people easier</p>
          <span className="learn-more">Learn more</span>

          {/* Logging In Section */}
          <div className="info-item">
            <div className="info-icon"><img src="ICONS.userCheckIcon" alt="user-check" /></div>
            <div className="info-content">
              <h3>Logging in</h3>
              <p className="sub-text">With account you can chat other users, comment on people’s posts, like and take other actions</p>
              <div className="small-info-icon"><InfoSymbol/></div>
            </div>
          </div>

          {/* No Account Section */}
          <div className="info-item">
            <div className="info-icon"><BlackUserIcon/></div>
            <div className="info-content">
              <h3>No account</h3>
              <p className="sub-text">No worries, you can still use feelamong without an account but with limited access.</p>
              <div className="action-row">
                <div className="small-info-icon"><InfoSymbol/></div>
                <button type="button" className="btn-green" onClick={handleGuestLogin}>
                  Continue without account
                </button>
              </div>
            </div>
          </div>

          {/* Spacer to push Create Account down */}
          <div style={{flexGrow: 1}}></div>

          {/* Create Account Section */}
          <div className="info-item">
            <div className="info-icon"><BlueUserIcon/></div>
            <div className="info-content">
              <p className="sub-text">We recommend you to create an account if you don’t have one yet</p>
              <div className="action-row">
                <div className="small-info-icon"><InfoSymbol/></div>
                <button type="button" className="btn-green color-blue" onClick={onSwitchToRegister}>
                  Create account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="login-right">
          {/* Top Actions: Search and Mode Toggle */}
          <div className="top-actions">
            <div className="search-container">
              <span className="search-icon"><SearchMagnifier/></span>
              <input type="text" className="search-input" placeholder="Find my account" />
            </div>
            <div className="mode-toggle"><ModeToggleIcon/></div>
          </div>

          {/* Main Login Form */}
          <div className="login-content-center">
            <div className="login-header-group">
              <h2 className="login-title">Login</h2>
              <div className="login-status-icon"><LargeGreenStatusIcon/></div>
            </div>
            <p className="details-prompt">Enter details to below</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="text"
                required
                className="underlined-input"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="Email or username"
              />

              <input
                type="password"
                required
                className="underlined-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />

              <button type="submit" className="btn-primary">Login</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../api/axios';

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
    <div className="auth-container">
      <div className="auth-card">
        <h2>feelamong</h2>
        <p>Connect and share with people around you.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Username</label>
            <input
              type="text"
              required
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              placeholder="Enter email or username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button type="submit" className="btn-primary">Log In</button>
        </form>

        <button type="button" className="btn-secondary" onClick={handleGuestLogin}>
          Continue without account
        </button>

        <p className="auth-switch">
          Don't have an account? <span onClick={onSwitchToRegister}>Sign Up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
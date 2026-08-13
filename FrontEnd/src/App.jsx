import { useContext, useState } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const { user, logout } = useContext(AuthContext);
  const [isRegistering, setIsRegistering] = useState(false);

  if (!user) {
    return isRegistering ? (
      <Register onSwitchToLogin={() => setIsRegistering(false)} />
    ) : (
      <Login onSwitchToRegister={() => setIsRegistering(true)} />
    );
  }

  return (
    <div style={{ padding: '20px', textStyle: 'center' }}>
      <h1>Welcome to feelamong, {user.username}!</h1>
      {user.isAnonymous && <p style={{ color: 'orange' }}>(Guest Account)</p>}
      <button 
        onClick={logout} 
        className="btn-primary" 
        style={{ width: 'auto', padding: '8px 16px', marginTop: '16px' }}
      >
        Log Out
      </button>
    </div>
  );
}

export default App;
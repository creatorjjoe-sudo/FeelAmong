import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Routes>
        {/* Secure Dashboard View Route Layout Container Integration */}
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/signin" />} />

        {/* Gateway Public Auth Forms Routing Maps */}
        <Route path="/signin" element={!user ? <Signin /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

        {/* Default Catchall Redirect Route Parameter Mapping Map Logic */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

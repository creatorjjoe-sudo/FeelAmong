import React from 'react'
import '../styles/pages/login.css'
import LoginForm from '../components/welcome/LoginForm'
import SignupForm from '../components/welcome/SignupForm'

function WelcomePage() {
  const [view, setView] = React.useState('login')

  function switchView (value) {
    setView(value)
  }
  return (
    <div className='welcome-container'>
      <title>{view === 'login' ? 'Feelamong | Login' : 'Feelamong | Signup'}</title>
      <div className="wrapper left-container">
        <h1>feelamong</h1>
        <p>Makes connection with both emmediate or new people easier</p>
      </div>
      <div className="wrapper middle-container">
        {view === 'login' && <LoginForm view={view} switchView={switchView} />}
        {view === 'signup' && <SignupForm view={view} switchView={switchView} />}
      </div>
      <div className="wrapper right-container"></div>
    </div>
  )
}

export default WelcomePage
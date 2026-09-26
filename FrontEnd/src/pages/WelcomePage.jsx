import React from 'react'
import '../styles/pages/login.css'
import LoginForm from '../components/welcome/LoginForm'
import SignupForm from '../components/welcome/SignupForm'

function WelcomePage({changeLoginState}) {
  const [view, setView] = React.useState('login')

  function switchView (value) {
    setView(value)
  }
  return (
    <div className='welcome-container'>
      <div className="wrapper left-container">
        <h1>feelamong</h1>
        <p>Makes connection with both emmediate or new people easier</p>
      </div>
      <div className="wrapper middle-container">
        
           {view === 'login'
           && 
           <LoginForm changeLoginState={changeLoginState} view={view} switchView={switchView} />}

           {view === 'signup'
           &&
           <SignupForm view={view} switchView={switchView} />}

      </div>
      <div className="wrapper right-container"></div>
    </div>
  )
}

export default WelcomePage
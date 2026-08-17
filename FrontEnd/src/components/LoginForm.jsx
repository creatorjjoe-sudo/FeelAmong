import React from 'react'
import { ICONS } from '../assets/icons'

function LoginForm() {
  const [password, setPassword] = React.useState(false)

  const showpassword = () => {
    setPassword(!password)
  }

  
  return (
    <form className="screen middle login">

      <div className='search-container second'>
        <img src={ICONS.search} alt="" />
        <img src={ICONS.themeToggle} alt="" />
      </div>

      <div className='form-header'>
        <h1>Login</h1> <img className='user-icon-login' src={ICONS.userGreen} alt="user-check" />
      </div>
      <h3>Enter details below</h3>

      <div className="input-container email">
        <input type="text" id='email' placeholder='' />
        <label htmlFor="email">Email or username</label>
      </div>
      <div className="input-container password">
        <input type={password ? 'text' : 'password'} id='password' placeholder='' />
        <label htmlFor="password">Password</label>
        <p className='show-password' onClick={showpassword}>{password ? 'Hide' : 'Show'}</p>
      </div>

      <button className='submit' type='submit'>Login</button>

    </form>
  )
}

export default LoginForm
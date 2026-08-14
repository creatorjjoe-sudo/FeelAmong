import React from 'react'
import { ICONS } from '../assets/icons'

function SignupForm() {
 const [password, setPassword] = React.useState(false)

  const showpassword = () => {
    setPassword(!password)
  }

 return (
  <form className="screen middle signup">
   <div className='form-header'>
    <h1>Login</h1> <img className='user-icon-login' src={ICONS.userBlack} alt="user-check" />
   </div>
   <h3>Enter details below</h3>

   <div className="input-container email">
    <input type="email" id='email' placeholder='' />
    <label htmlFor="email">Email or username</label>
   </div>

   <div className="input-container username">
    <input type="text" id='username' placeholder='' />
    <label htmlFor="username">Username</label>
   </div>

   <div className="input-container password">
    <input type={password ? 'text' : 'password'} id='password' placeholder='' />
    <label htmlFor="password">Password</label>
    <p className='show-password' onClick={showpassword}>{password ? 'Hide' : 'Show'}</p>
   </div>

   <button className='submit' type='submit'>Create</button>

  </form>
 )
}

export default SignupForm
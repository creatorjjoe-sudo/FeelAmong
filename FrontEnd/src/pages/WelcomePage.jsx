import React from 'react'
import '../styles/pages/login.css'
import LoginForm from '../components/welcome/LoginForm'
import SignupForm from '../components/welcome/SignupForm'
import { ICONS } from '../assets/icons'
import { getProfileAvatar } from '../utils/profileAvatar'

const DEVICE_ACCOUNTS_KEY = 'feelamong-device-accounts'

function readDeviceAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(DEVICE_ACCOUNTS_KEY) || '[]')
    return Array.isArray(accounts) ? accounts : []
  } catch (error) {
    console.error('Could not read accounts saved on this device:', error)
    return []
  }
}

function formatLastLogin(timestamp) {
  const lastLogin = Number(timestamp)
  if (!Number.isFinite(lastLogin) || lastLogin <= 0) return 'Last signed in date unavailable'
  return `Last signed in ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(lastLogin)}`
}

function WelcomePage() {
  const [view, setView] = React.useState('login')
  const [deviceAccounts] = React.useState(readDeviceAccounts)
  const [selectedAccount, setSelectedAccount] = React.useState(null)

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
        {view === 'login' && (
          <LoginForm
            key={selectedAccount?._id || 'login'}
            view={view}
            switchView={switchView}
            selectedAccount={selectedAccount}
            onCancelAccount={() => setSelectedAccount(null)}
          />
        )}
        {view === 'signup' && <SignupForm view={view} switchView={switchView} />}
      </div>
      <aside className="wrapper right-container">
        <section className="device-accounts" aria-labelledby="device-accounts-title">
          <h2 id="device-accounts-title">Accounts on this device</h2>
          {deviceAccounts.length === 0 ? (
            <p className="device-accounts-empty">Accounts you sign in to will appear here.</p>
          ) : (
            <ul className="device-accounts-list">
              {deviceAccounts.map((account) => {
                const displayName = [account.firstName, account.lastName].filter(Boolean).join(' ')
                  || account.username
                  || account.email
                return (
                  <li className="device-account" key={account._id}>
                    <button
                      className="device-account-select"
                      type="button"
                      aria-label={`Continue as ${account.username || displayName}`}
                      onClick={() => {
                        setView('login')
                        // Always pass a fresh object so a re-click of the same
                        // account still triggers LoginForm's focus effect.
                        setSelectedAccount({ ...account })
                      }}
                    >
                      <img src={getProfileAvatar(account)} alt="" />
                      <span className="device-account-details">
                        <strong>{account.username || displayName}</strong>
                        <small>{formatLastLogin(account.lastLoginAt)}</small>
                      </span>
                      <img className="device-account-arrow" src={ICONS.arrowForward} alt="" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}

export default WelcomePage
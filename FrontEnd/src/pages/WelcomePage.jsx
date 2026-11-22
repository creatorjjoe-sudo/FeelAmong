import React from 'react'
import '../styles/pages/login.css'
import LoginForm from '../components/welcome/LoginForm'
import SignupForm from '../components/welcome/SignupForm'
import { ICONS } from '../assets/icons'
import { getProfileAvatar } from '../utils/profileAvatar'
import { useLocation, useNavigate } from 'react-router-dom'

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
  const location = useLocation()
  const navigate = useNavigate()
  const [view, setView] = React.useState('login')
  const [deviceAccounts, setDeviceAccounts] = React.useState(readDeviceAccounts)
  const [selectedAccount, setSelectedAccount] = React.useState(null)
  const [isMobile, setIsMobile] = React.useState(
    () => window.matchMedia('(max-width: 800px)').matches
  )
  const [showLoginForm, setShowLoginForm] = React.useState(false)
  const isRoutedLoginForm = location.state?.welcomeLoginForm === true
  const showDeviceAccounts = isMobile
    && deviceAccounts.length > 0
    && view === 'login'
    && !selectedAccount
    && !showLoginForm
    && !isRoutedLoginForm

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 800px)')
    const handleChange = (event) => setIsMobile(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  React.useEffect(() => {
    document.title = view === 'login'
      ? 'Feelamong | Login'
      : 'Feelamong | Signup'
  }, [view])

  function switchView (value) {
    setView(value)
    if (value !== 'login') {
      setShowLoginForm(false)
      if (isRoutedLoginForm) {
        const state = { ...location.state }
        delete state.welcomeLoginForm
        navigate(`${location.pathname}${location.search}${location.hash}`, {
          replace: true,
          state: Object.keys(state).length ? state : null,
        })
      }
    }
  }

  function selectDeviceAccount(account) {
    setShowLoginForm(true)
    // Always pass a fresh object so selecting the same account again still
    // triggers LoginForm's password-field focus effect.
    setSelectedAccount({ ...account })
  }

  function removeDeviceAccount(accountId) {
    const updatedAccounts = deviceAccounts.filter(
      (account) => String(account._id) !== String(accountId)
    )
    try {
      localStorage.setItem(DEVICE_ACCOUNTS_KEY, JSON.stringify(updatedAccounts))
    } catch (error) {
      console.error('Could not remove the account saved on this device:', error)
      throw new Error('Could not remove this account from the device.', { cause: error })
    }

    setDeviceAccounts(updatedAccounts)
    setSelectedAccount(null)
    setShowLoginForm(false)
  }

  return (
    <div className={`welcome-container${showDeviceAccounts ? ' is-mobile-device-accounts' : ''}`}>
      <div className="wrapper left-container">
        <h1>feelamong</h1>
        <p>Makes connection with both emmediate or new people easier</p>
      </div>
      <div className={`wrapper middle-container${isMobile && deviceAccounts.length > 0 && (showLoginForm || isRoutedLoginForm) && !selectedAccount ? ' is-mobile-login-form' : ''}`}>
        {view === 'login' && (
          <>
            {isMobile && deviceAccounts.length > 0 && (showLoginForm || isRoutedLoginForm) && !selectedAccount && (
              <button
                className="mobile-device-account-back"
                type="button"
                onClick={() => navigate(-1)}
              >
                Back to accounts on this device
              </button>
            )}
          <LoginForm
            key={selectedAccount?._id || 'login'}
            view={view}
            switchView={switchView}
            selectedAccount={selectedAccount}
            onRemoveDeviceAccount={removeDeviceAccount}
            onCancelAccount={() => {
              setSelectedAccount(null)
              setShowLoginForm(false)
            }}
          />
          </>
        )}
        {view === 'signup' && <SignupForm view={view} switchView={switchView} />}
      </div>
      <aside className={`wrapper right-container${showDeviceAccounts ? ' is-mobile-device-accounts' : ''}`}>
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
                        selectDeviceAccount(account)
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
          {deviceAccounts.length > 0 && (
            <button
              className="login-another-account"
              type="button"
              onClick={() => {
                setSelectedAccount(null)
                navigate(`${location.pathname}${location.search}${location.hash}`, {
                  state: { ...(location.state || {}), welcomeLoginForm: true },
                })
              }}
            >
              Login another account
            </button>
          )}
        </section>
      </aside>
    </div>
  )
}

export default WelcomePage
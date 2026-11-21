import React, { useContext } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { replaceWithRoutedModal } from '../../utils/routedModal'
import '../../styles/components/dashboard/profile-menu.css'
import { API_ORIGIN } from '../../api/config'

function ProfileMenuModal({ open, onClose, anchorRef }) {
  const [anchorStyle, setAnchorStyle] = React.useState({})
  const navigate = useNavigate()
  const location = useLocation()
  const { user, personalUser, logout, switchToPersonal, switchToCompany } = useContext(AuthContext)
  const isAnonymous = !user || user.isAnonymous === true
  const [companies, setCompanies] = React.useState([])
  const [companyError, setCompanyError] = React.useState('')
  const [isCompanyLoading, setIsCompanyLoading] = React.useState(false)
  const [accountsExpanded, setAccountsExpanded] = React.useState(false)
  const [accountActivity, setAccountActivity] = React.useState({})
  const [selectedAccount, setSelectedAccount] = React.useState(null)
  const [isSwitchingAccount, setIsSwitchingAccount] = React.useState(false)
  const [switchingFromAccount, setSwitchingFromAccount] = React.useState(null)

  React.useEffect(() => {
    if (!open || !personalUser?.token) return undefined

    const controller = new AbortController()
    async function loadCompanies() {
      setIsCompanyLoading(true)
      setCompanyError('')
      try {
        const response = await fetch(`${API_ORIGIN}/api/companies`, {
          headers: { Authorization: `Bearer ${personalUser.token}` },
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load company accounts.')
        setCompanies(Array.isArray(result) ? result : [])
      } catch (error) {
        if (error.name !== 'AbortError') setCompanyError(error.message)
      } finally {
        if (!controller.signal.aborted) setIsCompanyLoading(false)
      }
    }

    loadCompanies()
    return () => controller.abort()
  }, [open, personalUser])

  React.useEffect(() => {
    if (!open) {
      setAccountsExpanded(false)
      setSelectedAccount(null)
      setSwitchingFromAccount(null)
      return
    }

    try {
      const savedActivity = JSON.parse(localStorage.getItem('feelamong-account-activity') || '{}')
      setAccountActivity(savedActivity?.[String(personalUser?._id)] || {})
    } catch (error) {
      console.error('Could not read account activity:', error)
      setAccountActivity({})
    }
  }, [open, personalUser?._id])

  React.useEffect(() => {
    if (!open) return undefined

    const updateAnchor = () => {
      if (window.innerWidth < 800) {
        setAnchorStyle({})
        return
      }
      const bounds = anchorRef?.current?.getBoundingClientRect()
      if (bounds) {
        const width = Math.min(360, window.innerWidth - 24)
        setAnchorStyle({
          left: `${Math.max(12, Math.min(bounds.right - width, window.innerWidth - width - 12))}px`,
          bottom: `${Math.max(window.innerHeight - bounds.bottom, 12)}px`,
          width: `${width}px`,
        })
      }
    }

    updateAnchor()
    window.addEventListener('resize', updateAnchor)
    return () => window.removeEventListener('resize', updateAnchor)
  }, [anchorRef, open])

  React.useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isSwitchingAccount) return
        if (selectedAccount) setSelectedAccount(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSwitchingAccount, onClose, open, selectedAccount])

  if (!open) return null

  const openDestination = (path) => {
    replaceWithRoutedModal(navigate, path, null, location)
  }

  const handleAccountAction = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  async function handleIdentitySwitch(companyId) {
    setCompanyError('')
    try {
      if (companyId === 'personal') switchToPersonal()
      else await switchToCompany(companyId)
      return true
    } catch (error) {
      setCompanyError(error.message || 'Could not switch accounts.')
      return false
    }
  }

  async function confirmIdentitySwitch() {
    if (!selectedAccount || isSwitchingAccount) return
    const startedAt = Date.now()
    setSwitchingFromAccount(user)
    setIsSwitchingAccount(true)
    const didSwitch = await handleIdentitySwitch(selectedAccount.isCompany ? selectedAccount.accountId : 'personal')
    if (didSwitch) {
      const remainingTime = Math.max(0, 10000 - (Date.now() - startedAt))
      if (remainingTime) await new Promise((resolve) => window.setTimeout(resolve, remainingTime))
      setSelectedAccount(null)
      setSwitchingFromAccount(null)
      onClose()
    } else {
      setSwitchingFromAccount(null)
    }
    setIsSwitchingAccount(false)
  }

  const accountOptions = [
    ...(personalUser
      ? [{ ...personalUser, accountId: String(personalUser._id), isCompany: false, description: 'Personal account' }]
      : user && !user.isCompany
        ? [{ ...user, accountId: String(user._id), isCompany: false, description: 'Personal account' }]
        : []),
    ...companies.map((company) => ({ ...company, accountId: String(company._id) })),
  ]
  const activeAccountId = String(user?._id || '')
  const sortedAccountOptions = accountOptions.sort((first, second) => {
    if (first.accountId === activeAccountId) return -1
    if (second.accountId === activeAccountId) return 1
    return (Number(accountActivity[second.accountId]) || 0) - (Number(accountActivity[first.accountId]) || 0)
  })

  return createPortal(
    <div
      className="profile-menu-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="profile-menu-panel"
        style={anchorStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Profile menu"
      >
        <div className="profile-menu-heading">
          <h2>Account</h2>
          <button className="profile-menu-close" type="button" onClick={onClose} aria-label="Close account menu">
            Close
          </button>
        </div>
        {!isAnonymous && (
          <section className="profile-menu-identities" aria-label="Switch account">
            <div className={`profile-menu-account-switcher${accountsExpanded ? ' is-expanded' : ''}`}>
              <button
                type="button"
                className="profile-menu-active-account"
                aria-expanded={accountsExpanded}
                aria-controls="profile-menu-account-list"
                onClick={() => setAccountsExpanded((expanded) => !expanded)}
              >
                <span className="profile-menu-option-icon profile-menu-account-avatar">
                  <img src={getProfileAvatar(user)} alt="" />
                </span>
                <span className="profile-menu-option-copy">
                  <span>{user?.username || 'Account'}</span>
                  <small>{user?.isCompany ? 'Company account' : 'Personal account'}</small>
                </span>
                <svg className={`profile-menu-account-chevron${accountsExpanded ? ' is-expanded' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {accountsExpanded && (
                <div className="profile-menu-account-list" id="profile-menu-account-list">
                  {sortedAccountOptions.map((account) => {
                    const isActive = account.accountId === activeAccountId
                    return (
                      <button
                        key={account.accountId}
                        type="button"
                        className="profile-menu-option"
                        aria-current={isActive ? 'true' : undefined}
                        disabled={isActive}
                        onClick={() => {
                          setCompanyError('')
                          setSelectedAccount(account)
                        }}
                      >
                        <span className="profile-menu-option-icon profile-menu-account-avatar">
                          <img src={getProfileAvatar(account)} alt="" />
                        </span>
                        <span className="profile-menu-option-copy">
                          <span>{account.username}{isActive ? ' (Active)' : ''}</span>
                          <small>{account.description || (account.isCompany ? 'Company account' : 'Personal account')}</small>
                        </span>
                        {isActive && (
                          <svg className="profile-menu-account-current-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m8 12 2.5 2.5L16 9" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                  {!sortedAccountOptions.some((account) => account.accountId !== activeAccountId) && !isCompanyLoading && (
                    <p className="profile-menu-company-state">No other accounts available.</p>
                  )}
                  {isCompanyLoading && <p className="profile-menu-company-state">Loading company accounts…</p>}
                  <button
                    type="button"
                    className="profile-menu-option profile-menu-create-company"
                    onClick={() => navigate('/for-you/company-create', { replace: true })}
                  >
                    <span className="profile-menu-option-icon" aria-hidden="true">+</span>
                    <span className="profile-menu-option-copy">
                      <span>Create company account</span>
                      <small>Create another public company identity</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        <nav className="profile-menu-options" aria-label="Account options">
          {!isAnonymous && companyError && <p className="profile-menu-company-error" role="alert">{companyError}</p>}
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/profile')}>
            <span className="profile-menu-option-icon profile-menu-user-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <span className="profile-menu-option-copy">
              <span>View profile</span>
              <small>Your profile and posts</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/saved')}>
            <span className="profile-menu-option-icon" aria-hidden="true">
              <img src={ICONS.saved} alt="" />
            </span>
            <span className="profile-menu-option-copy">
              <span>Saved items</span>
              <small>Your saved posts and videos</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option" onClick={() => openDestination('/for-you/settings')}>
            <span className="profile-menu-option-icon" aria-hidden="true">
              <img src={ICONS.settings} alt="" />
            </span>
            <span className="profile-menu-option-copy">
              <span>Settings</span>
              <small>Coming soon</small>
            </span>
          </button>
          <button type="button" className="profile-menu-option profile-menu-logout" onClick={handleAccountAction}>
            <span className="profile-menu-option-icon profile-menu-logout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </span>
            <span className="profile-menu-option-copy">
              <span>{isAnonymous ? 'Login' : 'Logout'}</span>
              <small>{isAnonymous ? 'Return to the login page' : 'Sign out of this account'}</small>
            </span>
          </button>
        </nav>
      </section>
      {selectedAccount && (
        <div
          className="profile-menu-switch-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSwitchingAccount) setSelectedAccount(null)
          }}
        >
          <section
            className="profile-menu-switch-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-menu-switch-confirm-title"
            aria-busy={isSwitchingAccount}
          >
            <h2 id="profile-menu-switch-confirm-title">
              {isSwitchingAccount ? 'Switching account…' : 'Switch account?'}
            </h2>
            {isSwitchingAccount ? (
              <div className="profile-menu-switch-flow" aria-live="polite">
                <span>Switching from</span>
                <span className="profile-menu-switch-account profile-menu-switch-account-from">
                  <img src={getProfileAvatar(switchingFromAccount || user)} alt="" />
                  <strong>{switchingFromAccount?.username || user?.username || 'Current account'}</strong>
                </span>
                <span>to</span>
                <span className="profile-menu-switch-account profile-menu-switch-account-to">
                  <img src={getProfileAvatar(selectedAccount)} alt="" />
                  <strong>{selectedAccount.username}</strong>
                </span>
                <span className="profile-menu-switch-spinner" role="status" aria-label="Switching account" />
              </div>
            ) : (
              <>
                <p>Switch to <strong>{selectedAccount.username}</strong>?</p>
                {companyError && <p className="profile-menu-company-error" role="alert">{companyError}</p>}
                <div className="profile-menu-switch-confirm-actions">
                  <button
                    type="button"
                    className="profile-menu-switch-cancel"
                    onClick={() => setSelectedAccount(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="profile-menu-switch-submit"
                    onClick={confirmIdentitySwitch}
                  >
                    Switch account
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>,
    document.body
  )
}

export default ProfileMenuModal

import React from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { API_ORIGIN } from '../../api/config'

function CompanySwitchMenuItem({ isExpanded, onExpandedChange }) {
  const { user, personalUser, switchToCompany, switchToPersonal } = React.useContext(AuthContext)
  const personalAccount = personalUser || (!user?.isCompany ? user : null)
  const activeAccount = user || personalAccount
  const token = personalAccount?.token || personalAccount?.accessToken || personalAccount?.data?.token
  const accountId = String(personalAccount?._id || '')
  const requestKey = `${accountId}:${token || ''}`
  const [companyResult, setCompanyResult] = React.useState(null)
  const [switchError, setSwitchError] = React.useState('')
  const [switchingAccountId, setSwitchingAccountId] = React.useState('')

  React.useEffect(() => {
    if (user?.isAnonymous || !token) return undefined

    const controller = new AbortController()
    async function loadCompanies() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/companies`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load company accounts.')
        if (!controller.signal.aborted) {
          setCompanyResult({
            requestKey,
            companies: Array.isArray(result) ? result : [],
            error: '',
          })
        }
      } catch (loadError) {
        if (loadError.name !== 'AbortError' && !controller.signal.aborted) {
          setCompanyResult({ requestKey, companies: [], error: loadError.message })
        }
      }
    }

    loadCompanies()
    return () => controller.abort()
  }, [accountId, requestKey, token, user?.isAnonymous])

  async function handleSwitch(account) {
    const accountIdToSwitch = String(account._id)
    setSwitchingAccountId(accountIdToSwitch)
    setSwitchError('')
    try {
      if (account.isCompany) await switchToCompany(account._id)
      else switchToPersonal()
      onExpandedChange(false)
    } catch (switchError) {
      setSwitchError(switchError.message || 'Could not switch to that company account.')
      setSwitchingAccountId('')
    }
  }

  const currentCompanyResult = companyResult?.requestKey === requestKey ? companyResult : null
  const companies = currentCompanyResult?.companies || []
  const accounts = [
    ...(personalAccount
      ? [{ ...personalAccount, isCompany: false }]
      : []),
    ...companies.map((company) => ({ ...company, isCompany: true })),
  ]
  const error = switchError || currentCompanyResult?.error
  const isLoading = !currentCompanyResult

  if (user?.isAnonymous || !token || isLoading || (!companies.length && !error)) return null

  const activeName = activeAccount?.username
    || activeAccount?.name
    || [activeAccount?.firstName, activeAccount?.lastName].filter(Boolean).join(' ')
    || 'Profile'

  function collapseAccountList() {
    onExpandedChange(false)
  }

  return (
    <>
      {companies.length > 0 && (
        <li className="more-menu-section-title company-switch-menu-section-title" role="presentation">
          Account
        </li>
      )}
      <li className="company-switch-menu-item" role="none">
        {companies.length > 0 && (
          <>
            {!isExpanded ? (
              <button
                className="company-switch-menu-trigger"
                type="button"
                role="menuitem"
                aria-expanded={isExpanded}
                onClick={() => {
                  onExpandedChange(true)
                }}
              >
                <img src={getProfileAvatar(activeAccount)} alt="" />
                <span className="company-switch-menu-copy">
                  <strong>{activeName}</strong>
                  <small>Switch to another profile or company to act as them</small>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            ) : (
              <div className="company-switch-menu-expanded-heading">
                <button
                  className="company-switch-menu-back"
                  type="button"
                  role="menuitem"
                  aria-label="Back to options"
                  onClick={collapseAccountList}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <img src={getProfileAvatar(activeAccount)} alt="" />
                <span className="company-switch-menu-copy">
                  <strong>{activeName}</strong>
                  <small>Choose a profile or company</small>
                </span>
              </div>
            )}
            {isExpanded && (
              <div className="company-switch-menu-options">
                {accounts.map((account) => {
                  const isCurrentAccount = String(account._id) === String(activeAccount?._id)
                  const isSwitching = switchingAccountId === String(account._id)
                  const accountName = account.username
                    || account.name
                    || [account.firstName, account.lastName].filter(Boolean).join(' ')
                    || (account.isCompany ? 'Company' : 'Personal profile')
                  return (
                    <button
                      className={`company-switch-menu-choice${isCurrentAccount ? ' is-active' : ''}`}
                      type="button"
                      role="menuitem"
                      key={`${account.isCompany ? 'company' : 'personal'}-${account._id}`}
                      aria-current={isCurrentAccount ? 'true' : undefined}
                      disabled={Boolean(switchingAccountId)}
                      onClick={() => handleSwitch(account)}
                    >
                      <img src={getProfileAvatar(account)} alt="" />
                      <span className="company-switch-menu-copy">
                        <strong>{isSwitching ? 'Switching…' : accountName}</strong>
                        <small>
                          {isCurrentAccount ? 'Currently active' : account.isCompany ? 'Company' : 'Personal profile'}
                        </small>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
        {error && <p className="company-switch-menu-error" role="alert">{error}</p>}
      </li>
    </>
  )
}

export default CompanySwitchMenuItem

import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { API_ORIGIN } from '../../api/config'
import '../../styles/components/dashboard/company-suggestions.css'

function CompanySuggestions({ videoSlide = false, postSlide = false, listPage = false }) {
  const { user } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const token = user?.token || user?.accessToken || user?.data?.token
  const [suggestionResult, setSuggestionResult] = React.useState({
    userId: '',
    companies: [],
    error: '',
    isLoading: true,
  })
  const [activeCompanyId, setActiveCompanyId] = React.useState('')
  const [actionError, setActionError] = React.useState('')
  const currentResult = String(user?._id || '') === suggestionResult.userId ? suggestionResult : null
  const companies = currentResult?.companies || []
  const error = currentResult?.error || actionError
  const isLoading = currentResult?.isLoading ?? true

  React.useEffect(() => {
    if (!user || user.isAnonymous || !token) return undefined

    const controller = new AbortController()
    async function loadSuggestions() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/companies/suggestions`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load company suggestions.')
        setSuggestionResult({
          userId: String(user._id),
          companies: Array.isArray(result.suggestions) ? result.suggestions : [],
          error: '',
          isLoading: false,
        })
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setSuggestionResult({
            userId: String(user._id),
            companies: [],
            error: loadError.message,
            isLoading: false,
          })
        }
      }
    }

    loadSuggestions()
    return () => controller.abort()
  }, [token, user])

  async function toggleFollow(company) {
    if (activeCompanyId) return
    setActiveCompanyId(String(company._id))
    setActionError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/companies/${company._id}/follow`, {
        method: company.isFollowing ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update company follow.')
      setSuggestionResult((current) => ({
        ...current,
        companies: current.companies.map((item) => (
        String(item._id) === String(company._id)
          ? { ...item, isFollowing: result.isFollowing }
          : item
        )),
      }))
    } catch (actionError) {
      setActionError(actionError.message)
    } finally {
      setActiveCompanyId('')
    }
  }

  async function removeSuggestion(company) {
    if (activeCompanyId) return
    setActiveCompanyId(String(company._id))
    setActionError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/companies/${company._id}/suggestion`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not remove this suggestion.')
      setSuggestionResult((current) => ({
        ...current,
        companies: current.companies.filter((item) => String(item._id) !== String(company._id)),
      }))
    } catch (actionError) {
      setActionError(actionError.message)
    } finally {
      setActiveCompanyId('')
    }
  }

  if (!user || user.isAnonymous || !token) {
    if (!listPage) return null
    return (
      <main className="company-discovery-page">
        <button className="company-discovery-back" type="button" onClick={() => navigate('/for-you')}>
          ← Back to feed
        </button>
        <h1>Companies to follow</h1>
        <p className="company-discovery-state">Log in to see company recommendations.</p>
      </main>
    )
  }
  if (!listPage && !companies.length && !error) return null

  function renderCompanyCard(company) {
    const isBusy = activeCompanyId === String(company._id)
    return (
      <article className="company-suggestion-card" key={company._id}>
        <button
          className="company-suggestion-remove"
          type="button"
          aria-label={`Remove ${company.username} from suggestions`}
          onClick={() => removeSuggestion(company)}
          disabled={Boolean(activeCompanyId)}
        >
          ×
        </button>
        <Link className="company-suggestion-identity" to={`/for-you/profile/${company._id}`}>
          <img src={getProfileAvatar(company)} alt="" />
          <span>{company.firstName || company.username}</span>
        </Link>
        <p className="company-suggestion-description">
          {company.bio || 'Discover updates and videos from this company.'}
        </p>
        <button
          className={`company-suggestion-follow${company.isFollowing ? ' is-following' : ''}`}
          type="button"
          onClick={() => toggleFollow(company)}
          disabled={Boolean(activeCompanyId)}
        >
          {isBusy ? 'Please wait…' : company.isFollowing ? 'Following' : 'Follow'}
        </button>
      </article>
    )
  }

  if (listPage) {
    return (
      <main className="company-discovery-page">
        <button className="company-discovery-back" type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <header className="company-discovery-heading">
          <h1>Companies you may want to follow</h1>
          <p>Recommended based on your interests</p>
        </header>
        {error && <p className="company-suggestions-error" role="alert">{error}</p>}
        {isLoading ? (
          <p className="company-discovery-state">Loading companies…</p>
        ) : companies.length ? (
          <div className="company-suggestions-list is-company-discovery-list">
            {companies.map(renderCompanyCard)}
          </div>
        ) : !error ? (
          <p className="company-discovery-state">No more company suggestions right now.</p>
        ) : null}
      </main>
    )
  }

  const displayedCompanies = companies.slice(0, 3)
  const suggestionsSection = (
    <section className="company-suggestions" aria-labelledby="company-suggestions-title">
      <header className="company-suggestions-heading">
        <div>
          <h2 id="company-suggestions-title">Companies you may want to follow</h2>
          <p>Recommended based on your interests</p>
        </div>
      </header>
      {error && <p className="company-suggestions-error" role="alert">{error}</p>}
      {displayedCompanies.length > 0 && (
        <div className="company-suggestions-list is-compact" aria-label="Suggested companies">
          {displayedCompanies.map(renderCompanyCard)}
          {companies.length > 0 && (
            <Link className="company-suggestion-card company-suggestion-see-more" to="/for-you/companies">
              <span>See more companies</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m13 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      )}
    </section>
  )

  if (videoSlide) return <div className="video-slide company-suggestions-slide">{suggestionsSection}</div>
  if (postSlide) return <div className="company-suggestions-post-slide">{suggestionsSection}</div>
  return suggestionsSection
}

export default CompanySuggestions

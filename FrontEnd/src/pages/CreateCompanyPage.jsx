import { useContext, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import '../styles/pages/create-company.css'
import { API_ORIGIN } from '../api/config'

function CreateCompanyPage() {
  const { user, personalUser, switchToCompany } = useContext(AuthContext)
  const navigate = useNavigate()
  const [avatarPreview, setAvatarPreview] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canCreateCompany = Boolean(user && !user.isAnonymous && personalUser?.token)

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  if (!canCreateCompany) return <Navigate to="/for-you" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_ORIGIN}/api/companies`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${personalUser.token}` },
        body: new FormData(event.currentTarget),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not create the company account.')

      await switchToCompany(result._id)
      navigate('/for-you', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Could not create the company account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    setAvatarPreview(file ? URL.createObjectURL(file) : '')
  }

  return (
    <main className="create-company-page">
      <div className="create-company-page-inner">
        <button
          className="create-company-back"
          type="button"
          onClick={() => navigate('/for-you', { replace: true })}
        >
          Back to dashboard
        </button>
        <section className="create-company-card">
          <div className="create-company-heading">
            <p className="create-company-eyebrow">Company identity</p>
            <h1>Create a company account</h1>
            <p>
              Give your company a public profile. You can use it to post, chat, and publish videos.
            </p>
          </div>

          <form className="create-company-form" onSubmit={handleSubmit}>
            <label>
              Company name
              <input name="name" type="text" maxLength={80} minLength={2} required />
            </label>
            <label>
              Description
              <textarea name="description" rows={4} maxLength={500} />
              <small>Up to 500 characters.</small>
            </label>
            <label>
              Profile picture
              <input
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                required
              />
            </label>
            {avatarPreview && (
              <img className="create-company-avatar-preview" src={avatarPreview} alt="Company profile preview" />
            )}
            {error && <p className="create-company-error" role="alert">{error}</p>}
            <div className="create-company-actions">
              <button
                className="create-company-cancel"
                type="button"
                onClick={() => navigate('/for-you', { replace: true })}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button className="create-company-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create and switch'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default CreateCompanyPage

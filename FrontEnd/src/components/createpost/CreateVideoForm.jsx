import React from 'react'
import { createPortal } from 'react-dom'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { ICONS } from '../../assets/icons'
import { getProfileAvatar } from '../../utils/profileAvatar'
import '../../styles/components/createpost/textpostcomposer.css'
import '../../styles/components/createpost/createvideo.css'

import { API_ORIGIN } from '../../api/config'
const API_URL = `${API_ORIGIN}/api/videos`
const MAX_VIDEO_SIZE = 50 * 1024 * 1024

function CreateVideoForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, personalUser, switchToCompany } = useContext(AuthContext)

  const [caption, setCaption] = React.useState('')
  const [videoFile, setVideoFile] = React.useState(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [accountPromptOpen, setAccountPromptOpen] = React.useState(false)
  const [companies, setCompanies] = React.useState([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [isCompanyLoading, setIsCompanyLoading] = React.useState(false)
  const [isSwitchingAccount, setIsSwitchingAccount] = React.useState(false)
  const [accountError, setAccountError] = React.useState('')
  const [accountNotice, setAccountNotice] = React.useState('')
  const videoInputRef = React.useRef(null)
  const previewUrlRef = React.useRef(null)
  const step = videoFile && new URLSearchParams(location.search).get('step') === 'review'
    ? 'review'
    : 'compose'
  const blocker = useBlocker(({ currentLocation, nextLocation }) => (
    Boolean(videoFile)
    && !isSubmitting
    && currentLocation.pathname !== nextLocation.pathname
  ))
  const cancelDialogOpen = blocker.state === 'blocked'

  function navigateToStep(nextStep) {
    const searchParams = new URLSearchParams(location.search)
    if (nextStep === 'review') searchParams.set('step', 'review')
    else searchParams.delete('step')
    const search = searchParams.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, {
      replace: nextStep !== 'review',
    })
  }

  React.useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  React.useEffect(() => {
    if (!cancelDialogOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') blocker.reset()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [blocker, cancelDialogOpen])

  React.useEffect(() => {
    if (!accountPromptOpen || !personalUser?.token) return undefined

    const controller = new AbortController()
    async function loadCompanies() {
      setIsCompanyLoading(true)
      setAccountError('')
      try {
        const response = await fetch(`${API_ORIGIN}/api/companies`, {
          headers: { Authorization: `Bearer ${personalUser.token}` },
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load company accounts.')
        if (!Array.isArray(result)) throw new Error('Could not load company accounts.')
        setCompanies(result)
        setSelectedCompanyId(result[0]?._id ? String(result[0]._id) : '')
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setAccountError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setIsCompanyLoading(false)
      }
    }

    loadCompanies()
    return () => controller.abort()
  }, [accountPromptOpen, personalUser])

  React.useEffect(() => {
    if (!accountPromptOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSwitchingAccount) setAccountPromptOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [accountPromptOpen, isSwitchingAccount])

  function handleVideoSelection(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file.')
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError('The video must be smaller than 50 MB.')
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const previewUrl = URL.createObjectURL(file)
    previewUrlRef.current = previewUrl
    setVideoFile({ file, previewUrl })
    setError('')
  }

  function removeVideo() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setVideoFile(null)
    navigateToStep('compose')
  }

  async function handleShare() {
    setError('')

    if (!videoFile) {
      setError('Please add a video before sharing.')
      return
    }

    if (!user?.isCompany) {
      setAccountPromptOpen(true)
      setAccountNotice('')
      return
    }

    const token =
      user?.token ||
      user?.accessToken ||
      user?.data?.token ||
      localStorage.getItem('token')

    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`

    setIsSubmitting(true)

    try {
      const body = new FormData()
      body.append('video', videoFile.file)
      body.append('caption', caption.trim())

      const response = await fetch(API_URL, { method: 'POST', headers, body })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || `Could not create video (${response.status}).`)
      }

      navigate('/for-you/videos', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not create the video. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSwitchAccount() {
    if (!selectedCompanyId) return

    setIsSwitchingAccount(true)
    setAccountError('')
    try {
      const selectedCompany = companies.find((company) => String(company._id) === selectedCompanyId)
      await switchToCompany(selectedCompanyId)
      setAccountPromptOpen(false)
      setAccountNotice(`Switched to ${selectedCompany?.username || 'your company account'}. Click Share again to publish your video.`)
    } catch (switchError) {
      setAccountError(switchError.message || 'Could not switch accounts. Please try again.')
    } finally {
      setIsSwitchingAccount(false)
    }
  }

  return (
    <main className="text-post-composer video-post-composer" data-step={step}>
      <form className="text-post-compose-form video-post-compose-form" onSubmit={(event) => event.preventDefault()}>
        <header className="text-post-create-header">
          <button className="text-post-back" type="button" aria-label="Go back" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <img className="text-post-author-avatar" src={getProfileAvatar(user)} alt="" />
          <strong className="text-post-author-name">{user?.username || 'Your account'}</strong>
          <div className="text-post-header-actions">
            <span className="text-post-header-select video-post-type-label">Video</span>
          </div>
        </header>

        <div className="text-post-prompt-row">
          <strong>Add a caption</strong>
        </div>
        <textarea
          className="text-post-compose-input video-post-caption"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={1000}
          placeholder="Describe your video..."
          aria-label="Write a video caption"
          disabled={isSubmitting}
        />
        <div className="text-post-compose-count" aria-live="polite">{caption.length} / 1000</div>

        <input
          ref={videoInputRef}
          className="text-post-image-input"
          type="file"
          accept="video/*"
          aria-label="Select a video"
          onChange={handleVideoSelection}
        />
        <button className="text-post-add-photo video-post-add-video" type="button" onClick={() => videoInputRef.current?.click()} disabled={isSubmitting}>
          <img src={ICONS.addPhoto} alt="" />
          {videoFile ? 'Replace video' : 'Add video'}
        </button>
        {videoFile && (
          <div className="video-post-file">
            <span title={videoFile.file.name}>{videoFile.file.name}</span>
            <button type="button" onClick={removeVideo} aria-label="Remove video" disabled={isSubmitting}>×</button>
          </div>
        )}

        <div className="text-post-compose-actions video-post-compose-actions">
          <button
            className="text-post-next-button video-post-next-button"
            type="button"
            onClick={() => navigateToStep('review')}
            disabled={isSubmitting || !videoFile}
          >
            Next
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </button>
        </div>
        {error && <p className="text-post-error" role="alert">{error}</p>}
      </form>

      <aside className={`video-post-preview${videoFile ? ' has-video' : ''}`} aria-label="Video preview">
        <header className="video-post-review-header">
          <button className="text-post-back" type="button" aria-label="Back to compose" onClick={() => navigateToStep('compose')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <h1>Preview</h1>
          <button
            className="text-post-publish-button"
            type="button"
            onClick={handleShare}
            disabled={isSubmitting || !videoFile}
          >
            {isSubmitting ? 'Sharing…' : 'Share'}
          </button>
        </header>
        {accountNotice && <p className="video-post-preview-notice" role="status">{accountNotice}</p>}
        {step === 'review' && error && <p className="video-post-preview-error" role="alert">{error}</p>}
        <div className="video-post-preview-media">
          {videoFile ? (
            <video className="video-preview-player" src={videoFile.previewUrl} controls playsInline />
          ) : (
            <div className="video-post-preview-empty">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 18.5v-13Z" />
                <path d="m16 9 4.2-2.1a1.2 1.2 0 0 1 1.8 1.1v7.9a1.2 1.2 0 0 1-1.8 1.1L16 15" />
              </svg>
              <strong>Your video preview</strong>
              <span>Select a video to preview it here</span>
            </div>
          )}
          <div className="video-post-preview-engagements" aria-hidden="true">
            <div className="video-post-preview-engagement">
              <span className="video-post-preview-engagement-icon"><img src={ICONS.like} alt="" /></span>
              <span className="video-post-preview-engagement-count">0</span>
            </div>
            <div className="video-post-preview-engagement">
              <span className="video-post-preview-engagement-icon"><img src={ICONS.comment} alt="" /></span>
              <span className="video-post-preview-engagement-count">0</span>
            </div>
            <div className="video-post-preview-engagement">
              <span className="video-post-preview-engagement-icon"><img src={ICONS.share} alt="" /></span>
              <span className="video-post-preview-engagement-count">0</span>
            </div>
            <div className="video-post-preview-engagement">
              <span className="video-post-preview-engagement-icon"><img src={ICONS.save} alt="" /></span>
              <span className="video-post-preview-engagement-count">0</span>
            </div>
            <span className="video-post-preview-engagement-icon">
              <img src={ICONS.more} alt="" />
            </span>
          </div>
        </div>
        {caption.trim() && <p className="video-post-preview-caption">{caption.trim()}</p>}
      </aside>
      {accountPromptOpen && createPortal(
        <div
          className="text-post-cancel-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSwitchingAccount) setAccountPromptOpen(false)
          }}
        >
          <section
            className="text-post-cancel-dialog video-post-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-post-account-title"
            aria-describedby="video-post-account-description"
          >
            <h2 id="video-post-account-title">Switch to a company account?</h2>
            <p id="video-post-account-description">Video creation is currently available to company accounts. Switch accounts to share this video. Your video and caption will stay here.</p>
            {isCompanyLoading ? (
              <p role="status">Loading company accounts…</p>
            ) : companies.length > 0 ? (
              <label className="video-post-company-label">
                Company account
                <select
                  value={selectedCompanyId}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  disabled={isSwitchingAccount}
                >
                  {companies.map((company) => (
                    <option key={company._id} value={String(company._id)}>
                      {company.username || company.name || 'Company account'}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              !accountError && <p>No company accounts are available to switch to.</p>
            )}
            {accountError && <p className="video-post-account-error" role="alert">{accountError}</p>}
            <div className="text-post-cancel-actions">
              <button
                className="video-post-account-switch"
                type="button"
                onClick={handleSwitchAccount}
                disabled={isCompanyLoading || isSwitchingAccount || !selectedCompanyId}
              >
                {isSwitchingAccount ? 'Switching…' : 'Switch account'}
              </button>
              <button
                className="text-post-cancel-keep"
                type="button"
                autoFocus
                onClick={() => setAccountPromptOpen(false)}
                disabled={isSwitchingAccount}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
      {cancelDialogOpen && createPortal(
        <div
          className="text-post-cancel-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) blocker.reset()
          }}
        >
          <section
            className="text-post-cancel-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-post-cancel-title"
            aria-describedby="video-post-cancel-description"
          >
            <h2 id="video-post-cancel-title">Cancel video upload?</h2>
            <p id="video-post-cancel-description">Your video and caption will be lost if you cancel.</p>
            <div className="text-post-cancel-actions">
              <button
                className="text-post-cancel-confirm"
                type="button"
                onClick={() => blocker.proceed()}
              >
                <svg className="text-post-cancel-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m9 9 6 6m0-6-6 6" />
                </svg>
                Cancel video upload
              </button>
              <button
                className="text-post-cancel-keep"
                type="button"
                autoFocus
                onClick={() => blocker.reset()}
              >
                <svg className="text-post-cancel-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14 5 5 5M4 20l4.5-1 10.1-10.1a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" />
                </svg>
                Keep editing
              </button>
              <button
                className="text-post-cancel-draft"
                type="button"
                disabled
                title="Draft saving will be available later."
              >
                <svg className="text-post-cancel-action-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 3h12l4 4v14H3V3h2Z" />
                  <path d="M7 3v6h10V3M7 21v-7h10v7" />
                </svg>
                Save as draft
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </main>
  )
}

export default CreateVideoForm

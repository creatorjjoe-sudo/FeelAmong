import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { ICONS } from '../../assets/icons'
import '../../styles/components/createpost/formbody.css'
import '../../styles/components/createpost/createvideo.css'

const API_URL = 'http://localhost:5000/api/videos'
const MAX_VIDEO_SIZE = 50 * 1024 * 1024

function CreateVideoForm() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [caption, setCaption] = React.useState('')
  const [videoFile, setVideoFile] = React.useState(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const videoInputRef = React.useRef(null)
  const previewUrlRef = React.useRef(null)

  React.useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

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
  }

  async function handleShare(event) {
    event.preventDefault()
    setError('')

    if (!videoFile) {
      setError('Please add a video before sharing.')
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

  return (
    <div className="create-container">
      {videoFile && (
        <div className="left-els left-els-video">
          <video className="video-preview-player" src={videoFile.previewUrl} controls playsInline />
        </div>
      )}

      <div className="right-els">
        <div className="form-container">
          <form className="post-form" onSubmit={handleShare}>
            {videoFile && (
              <div className="video-preview-mobile">
                <video className="video-preview-player" src={videoFile.previewUrl} controls playsInline />
              </div>
            )}
            <h2>Create video</h2>

            <div className="description-container">
              <p className="option-text">Caption</p>
              <textarea
                cols={30}
                rows={4}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={1000}
                placeholder="Describe your video..."
                style={{ resize: 'none' }}
              />
              <p className="value-length">{caption.length} / 1000</p>
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              id="upload-button"
              aria-required="true"
              onChange={handleVideoSelection}
            />
            <button className="upload-button-area" type="button" onClick={() => videoInputRef.current?.click()}>
              <span className="upload-label">Add video <span className="required-indicator">Required</span></span>
              <img src={ICONS.addPhoto} alt="" />
              {videoFile && <span>1 attached</span>}
            </button>
            {videoFile && (
              <ul className="attached-image-list">
                <li>
                  <span>{videoFile.file.name}</span>
                  <button type="button" onClick={removeVideo} aria-label="Remove video">Remove</button>
                </li>
              </ul>
            )}

            {error && <p role="alert">{error}</p>}

            <button className="share-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sharing…' : 'Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateVideoForm

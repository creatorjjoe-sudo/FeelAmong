import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { ICONS } from '../../assets/icons'
import { getProfileAvatar } from '../../utils/profileAvatar'
import {
  getTextPostColor,
  isNoneTextPostBackground,
  MORE_TEXT_POST_BACKGROUNDS,
  NONE_TEXT_POST_BACKGROUND,
  TEXT_POST_BACKGROUNDS,
} from '../../utils/textPostColors'
import '../../styles/components/createpost/textpostcomposer.css'

const API_URL = 'http://localhost:5000/api/posts'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const MAX_IMAGE_COUNT = 25
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: ICONS.publicIcon },
  { value: 'private', label: 'Private', icon: ICONS.lock },
  { value: 'friends', label: 'Friends-only', icon: ICONS.userIcon },
]

function TextPostComposer({ editPostId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useContext(AuthContext)
  const [description, setDescription] = React.useState('')
  const [backgroundColor, setBackgroundColor] = React.useState(NONE_TEXT_POST_BACKGROUND)
  const [visibility, setVisibility] = React.useState('public')
  const step = new URLSearchParams(location.search).get('step') === 'review' ? 'review' : 'compose'
  const [visibilityOpen, setVisibilityOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [visiblePaletteCount, setVisiblePaletteCount] = React.useState(0)
  const [images, setImages] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(Boolean(editPostId))
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const imageInputRef = React.useRef(null)
  const descriptionInputRef = React.useRef(null)
  const previewCardRef = React.useRef(null)
  const previewTextRef = React.useRef(null)
  const menuRef = React.useRef(null)
  const paletteOptionsRef = React.useRef(null)
  const previewUrls = React.useRef(new Set())
  const isImagePost = images.length > 0
  const hasBackground = !isImagePost && !isNoneTextPostBackground(backgroundColor)
  const selectedVisibility = VISIBILITY_OPTIONS.find((option) => option.value === visibility) || VISIBILITY_OPTIONS[0]
  const paletteOptions = [
    { color: NONE_TEXT_POST_BACKGROUND, label: 'No background' },
    ...TEXT_POST_BACKGROUNDS,
  ]

  function navigateToStep(nextStep) {
    const searchParams = new URLSearchParams(location.search)
    if (nextStep === 'review') searchParams.set('step', 'review')
    else searchParams.delete('step')
    const search = searchParams.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, {
      replace: nextStep !== 'review',
    })
  }

  React.useLayoutEffect(() => {
    const palette = paletteOptionsRef.current
    if (!palette || isImagePost || !description.trim()) return undefined

    function updateVisiblePaletteCount() {
      const swatchWidth = 31
      const swatchGap = 8
      const horizontalPadding = 8
      const availableWidth = Math.max(0, palette.clientWidth - horizontalPadding)
      const count = Math.floor((availableWidth + swatchGap) / (swatchWidth + swatchGap))
      setVisiblePaletteCount(Math.min(paletteOptions.length, count))
    }

    updateVisiblePaletteCount()
    const resizeObserver = new ResizeObserver(updateVisiblePaletteCount)
    resizeObserver.observe(palette)
    return () => resizeObserver.disconnect()
  }, [description, isImagePost, paletteOptions.length])

  React.useLayoutEffect(() => {
    const textarea = descriptionInputRef.current
    if (!textarea) return undefined

    function fitDescription() {
      const isDesktopComposer = window.matchMedia('(min-width: 700px)').matches
      const isMobileColoredPost = hasBackground && !isDesktopComposer
      const baseFontSize = isMobileColoredPost ? (description ? 64 : 26) : 20
      textarea.style.height = ''
      textarea.style.overflowY = 'hidden'
      textarea.style.fontSize = `${baseFontSize}px`
      textarea.style.lineHeight = ''
      textarea.style.paddingTop = ''
      textarea.style.paddingBottom = ''

      if (!description) return

      function centerMobileText() {
        if (!isMobileColoredPost) return

        const styles = window.getComputedStyle(textarea)
        const paddingTop = parseFloat(styles.paddingTop)
        const paddingBottom = parseFloat(styles.paddingBottom)
        const contentWidth = textarea.clientWidth
          - parseFloat(styles.paddingLeft)
          - parseFloat(styles.paddingRight)
        const mirror = document.createElement('div')
        Object.assign(mirror.style, {
          position: 'absolute',
          top: '0',
          left: '-10000px',
          width: `${contentWidth}px`,
          margin: '0',
          padding: '0',
          border: '0',
          boxSizing: 'content-box',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          font: styles.font,
          lineHeight: styles.lineHeight,
          letterSpacing: styles.letterSpacing,
          textAlign: styles.textAlign,
        })
        mirror.textContent = description
        document.body.appendChild(mirror)
        const contentHeight = mirror.getBoundingClientRect().height
        mirror.remove()

        const freeSpace = textarea.clientHeight - paddingTop - paddingBottom - contentHeight
        if (freeSpace > 0) {
          textarea.style.paddingTop = `${paddingTop + freeSpace / 2}px`
          textarea.style.paddingBottom = `${paddingBottom + freeSpace / 2}px`
        }
      }

      if (textarea.scrollHeight <= textarea.clientHeight) {
        centerMobileText()
        return
      }

      if (isMobileColoredPost) {
        let smallestLineHeight = 1
        let largestLineHeight = 1.4
        let fittingLineHeight = null
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const lineHeight = (smallestLineHeight + largestLineHeight) / 2
          textarea.style.lineHeight = `${lineHeight}`
          if (textarea.scrollHeight <= textarea.clientHeight) {
            fittingLineHeight = lineHeight
            smallestLineHeight = lineHeight
          } else {
            largestLineHeight = lineHeight
          }
        }

        if (fittingLineHeight !== null) {
          textarea.style.lineHeight = `${fittingLineHeight}`
          centerMobileText()
          return
        }
        textarea.style.lineHeight = '1'
      }

      let smallestFontSize = 6
      let largestFontSize = baseFontSize
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const fontSize = (smallestFontSize + largestFontSize) / 2
        textarea.style.fontSize = `${fontSize}px`
        if (textarea.scrollHeight <= textarea.clientHeight) {
          smallestFontSize = fontSize
        } else {
          largestFontSize = fontSize
        }
      }

      textarea.style.fontSize = `${smallestFontSize}px`
      if (textarea.scrollHeight > textarea.clientHeight && description.length >= 1000) {
        textarea.style.overflowY = 'auto'
      }
      centerMobileText()
    }

    fitDescription()
    const resizeObserver = new ResizeObserver(fitDescription)
    resizeObserver.observe(textarea)
    return () => resizeObserver.disconnect()
  }, [description, hasBackground])

  React.useLayoutEffect(() => {
    const card = previewCardRef.current
    const text = previewTextRef.current
    if (!card || !text) return undefined

    function fitPreviewText() {
      if (!hasBackground || isImagePost || !description) {
        text.style.fontSize = ''
        return
      }

      const cardStyles = window.getComputedStyle(card)
      const availableHeight = card.clientHeight
        - parseFloat(cardStyles.paddingTop)
        - parseFloat(cardStyles.paddingBottom)

      let smallestFontSize = 12
      let largestFontSize = 64
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const fontSize = (smallestFontSize + largestFontSize) / 2
        text.style.fontSize = `${fontSize}px`
        if (text.scrollHeight <= availableHeight) {
          smallestFontSize = fontSize
        } else {
          largestFontSize = fontSize
        }
      }

      text.style.fontSize = `${smallestFontSize}px`
    }

    fitPreviewText()
    const resizeObserver = new ResizeObserver(fitPreviewText)
    resizeObserver.observe(card)
    return () => resizeObserver.disconnect()
  }, [description, hasBackground, isImagePost, step])

  React.useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.current.clear()
  }, [])

  React.useEffect(() => {
    if (!editPostId) return undefined

    const controller = new AbortController()
    async function loadPost() {
      const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
      try {
        const response = await fetch(`${API_URL}/${editPostId}/edit`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(result.message || 'Could not load the post for editing.')
        setDescription(result.description || '')
        setBackgroundColor(result.backgroundColor || NONE_TEXT_POST_BACKGROUND)
        setVisibility(result.visibility || 'public')
        setImages((result.images || []).map((imagePath) => ({
          file: null,
          previewUrl: imagePath.startsWith('/') ? `http://localhost:5000${imagePath}` : imagePath,
          existingPath: imagePath,
        })))
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadPost()
    return () => controller.abort()
  }, [editPostId, user])

  React.useEffect(() => {
    if (!visibilityOpen && !moreOpen && !paletteOpen) return undefined

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setVisibilityOpen(false)
        setMoreOpen(false)
        setPaletteOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setVisibilityOpen(false)
        setMoreOpen(false)
        setPaletteOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [moreOpen, paletteOpen, visibilityOpen])

  function handleImageSelection(event) {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''
    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_IMAGE_SIZE)
    const acceptableFiles = selectedFiles.filter(
      (file) => file.type.startsWith('image/') && file.size <= MAX_IMAGE_SIZE
    )
    const remainingSlots = MAX_IMAGE_COUNT - images.length
    const filesToAdd = acceptableFiles.slice(0, remainingSlots).map((file) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)
      return { file, previewUrl }
    })
    setImages((current) => [...current, ...filesToAdd])

    if (oversizedFiles.length) setError('Each image must be smaller than 2 MB.')
    else if (acceptableFiles.length < selectedFiles.length) setError('Please select valid image files.')
    else if (filesToAdd.length < acceptableFiles.length) setError(`You can attach up to ${MAX_IMAGE_COUNT} images.`)
    else setError('')
  }

  function removeImage(index) {
    const removed = images[index]
    if (removed?.file) {
      URL.revokeObjectURL(removed.previewUrl)
      previewUrls.current.delete(removed.previewUrl)
    }
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  async function submitPost(event) {
    event.preventDefault()
    if (isSubmitting || (!description.trim() && !isImagePost)) return

    setError('')
    setIsSubmitting(true)
    try {
      const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const body = new FormData()
      body.append('postType', isImagePost ? 'image' : 'text')
      body.append('description', description.trim())
      body.append('visibility', visibility)
      if (!isImagePost) body.append('backgroundColor', backgroundColor)
      if (editPostId) {
        body.append('existingImages', JSON.stringify(
          images.filter(({ existingPath }) => existingPath).map(({ existingPath }) => existingPath)
        ))
      }
      images.forEach(({ file }) => {
        if (file) body.append('images', file)
      })

      const response = await fetch(editPostId ? `${API_URL}/${editPostId}` : API_URL, {
        method: editPostId ? 'PATCH' : 'POST',
        headers,
        body,
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.message || 'Could not publish the post.')
      navigate('/for-you', { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Could not publish the post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function openImagePicker() {
    imageInputRef.current?.click()
  }

  function renderVisibilityMenu() {
    return visibilityOpen && (
      <div className="text-post-menu text-post-visibility-menu" role="listbox" aria-label="Post visibility">
        {VISIBILITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            className="text-post-menu-option"
            type="button"
            role="option"
            aria-selected={visibility === option.value}
            onClick={() => {
              setVisibility(option.value)
              setVisibilityOpen(false)
            }}
          >
            <img src={option.icon} alt="" />
            {option.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <main className="text-post-composer" ref={menuRef} data-step={step}>
      <form className="text-post-compose-form" onSubmit={(event) => {
          event.preventDefault()
          if (description.trim() || isImagePost) navigateToStep('review')
        }}>
          <header className="text-post-create-header">
            <button className="text-post-back" type="button" aria-label="Go back" onClick={() => navigate(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <img className="text-post-author-avatar" src={getProfileAvatar(user)} alt="" />
            <strong className="text-post-author-name">{user?.username || 'Your account'}</strong>
            <div className="text-post-header-actions">
              <div className="text-post-menu-anchor">
                <button
                  type="button"
                  className="text-post-header-select"
                  aria-expanded={visibilityOpen}
                  onClick={() => {
                    setVisibilityOpen((open) => !open)
                  }}
                >
                  <img src={selectedVisibility.icon} alt="" />
                  {selectedVisibility.label}
                </button>
                {renderVisibilityMenu()}
              </div>
              <div className="text-post-menu-anchor">
                <button
                  type="button"
                  className="text-post-header-select text-post-type-select"
                  aria-label={`Current post type: ${isImagePost ? 'Image post' : 'Text post'}`}
                  disabled
                >
                  {isImagePost ? 'Image post' : 'Text post'}
                </button>
              </div>
            </div>
          </header>

          <div className="text-post-prompt-row">
            <strong>{isImagePost ? 'Add a description' : 'What do you want to say?'}</strong>
            <button className="text-post-audio-button" type="button" disabled title="Audio posts are not available yet">
              <img src={ICONS.micGreen} alt="" />
              Add audio post
            </button>
          </div>

          <textarea
            ref={descriptionInputRef}
            className={`text-post-compose-input${hasBackground ? ' has-background' : ''}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={1000}
            wrap="soft"
            placeholder={isImagePost ? 'Describe your photo' : 'Say something'}
            aria-label={isImagePost ? 'Add a description for your photos' : 'Write your post'}
            style={{
              background: hasBackground ? backgroundColor : undefined,
              color: hasBackground ? getTextPostColor(backgroundColor) : undefined,
            }}
            disabled={isLoading}
          />
          <div className="text-post-compose-count" aria-live="polite">{description.length}</div>

          <input
            ref={imageInputRef}
            className="text-post-image-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelection}
          />
          <button className="text-post-add-photo" type="button" onClick={openImagePicker}>
            <img src={ICONS.addPhoto} alt="" />
            Add photo
          </button>
          {images.length > 0 && (
            <ul className="text-post-attached-images" aria-label="Attached photos">
              {images.map((image, index) => (
                <li key={image.previewUrl}>
                  <img src={image.previewUrl} alt={image.file?.name || `Attached photo ${index + 1}`} />
                  <button type="button" onClick={() => removeImage(index)} aria-label={`Remove photo ${index + 1}`}>×</button>
                </li>
              ))}
            </ul>
          )}

          {!isImagePost && description.trim() && (
            <div className="text-post-palette-row">
              <div className="text-post-background-options" role="group" aria-label="Text post background" ref={paletteOptionsRef}>
                {paletteOptions.slice(0, visiblePaletteCount).map(({ color, label }) => (
                  <button
                    key={color}
                    className={`text-post-background-option${color === NONE_TEXT_POST_BACKGROUND ? ' text-post-background-none' : ''}${backgroundColor === color ? ' is-selected' : ''}`}
                    type="button"
                    style={color === NONE_TEXT_POST_BACKGROUND ? undefined : { background: color }}
                    aria-label={label}
                    aria-pressed={backgroundColor === color}
                    onClick={() => setBackgroundColor(color)}
                  >
                    {color === NONE_TEXT_POST_BACKGROUND ? '×' : null}
                  </button>
                ))}
              </div>
              <div className="text-post-palette-more">
                <button
                  className="text-post-palette-more-button"
                  type="button"
                  aria-label="More background colors"
                  aria-expanded={paletteOpen}
                  onClick={() => {
                    setPaletteOpen((open) => !open)
                    setMoreOpen(false)
                  }}
                >
                  …
                </button>
                {paletteOpen && (
                  <div className="text-post-more-colors" role="group" aria-label="More text post backgrounds">
                    {[...paletteOptions.slice(visiblePaletteCount), ...MORE_TEXT_POST_BACKGROUNDS].map(({ color, label }) => (
                      <button
                        key={color}
                        className={`text-post-background-option${color === NONE_TEXT_POST_BACKGROUND ? ' text-post-background-none' : ''}${backgroundColor === color ? ' is-selected' : ''}`}
                        type="button"
                        style={color === NONE_TEXT_POST_BACKGROUND ? undefined : { background: color }}
                        aria-label={label}
                        aria-pressed={backgroundColor === color}
                        onClick={() => {
                          setBackgroundColor(color)
                          setPaletteOpen(false)
                        }}
                      >
                        {color === NONE_TEXT_POST_BACKGROUND ? '×' : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-post-compose-actions">
            <div className="text-post-menu-anchor text-post-more-anchor">
              <button
                className="text-post-more-button"
                type="button"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <span aria-hidden="true">#</span>
                Add more
              </button>
              {moreOpen && (
                <div className="text-post-menu text-post-more-menu">
                  <button className="text-post-menu-option" type="button" onClick={openImagePicker}>
                    <img src={ICONS.addPhoto} alt="" />
                    Add photo
                  </button>
                  {description.trim() && (
                    <button
                      className="text-post-menu-option"
                      type="button"
                      onClick={() => {
                        setMoreOpen(false)
                        document.querySelector('.text-post-background-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                    >
                      Choose a background
                    </button>
                  )}
                </div>
              )}
            </div>
            <button className="text-post-next-button" type="submit" disabled={(!description.trim() && !isImagePost) || isLoading}>
              Next
            </button>
          </div>
          {error && <p className="text-post-error" role="alert">{error}</p>}
      </form>
      <form className="text-post-review-form" onSubmit={submitPost}>
          <header className="text-post-review-header">
            <button className="text-post-back" type="button" aria-label="Back to compose" onClick={() => navigateToStep('compose')}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <h1>Preview</h1>
            <button className="text-post-publish-button" type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? 'Sharing…' : editPostId ? 'Save' : 'Share'}
            </button>
          </header>
          <div
            ref={previewCardRef}
            className={`text-post-review-card${hasBackground ? ' has-background' : ''}${isImagePost ? ' is-image-post' : ''}`}
            style={{
              background: hasBackground ? backgroundColor : undefined,
              color: hasBackground ? getTextPostColor(backgroundColor) : undefined,
            }}
          >
            {images.length > 0 && (
              <div className="text-post-review-images">
                {images.map((image, index) => (
                  <img key={image.previewUrl} src={image.previewUrl} alt={image.file?.name || `Attached photo ${index + 1}`} />
                ))}
              </div>
            )}
            {description && <p ref={previewTextRef}>{description}</p>}
          </div>
          <div className="text-post-review-controls">
            <div className="text-post-menu-anchor">
              <button
                className="text-post-review-select"
                type="button"
                aria-expanded={visibilityOpen}
                onClick={() => setVisibilityOpen((open) => !open)}
              >
                <img src={selectedVisibility.icon} alt="" />
                {selectedVisibility.label}
                <strong>{isImagePost ? 'Image post' : 'Text post'}</strong>
                <svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5" /></svg>
              </button>
              {renderVisibilityMenu()}
            </div>
          </div>
          {error && <p className="text-post-error" role="alert">{error}</p>}
      </form>
    </main>
  )
}

export default TextPostComposer

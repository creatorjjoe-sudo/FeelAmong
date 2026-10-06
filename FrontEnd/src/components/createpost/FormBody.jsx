import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { ICONS } from '../../assets/icons'
import PostImageGrid from './PostImageGrid'
import { DEFAULT_TEXT_POST_BACKGROUND, getTextPostColor, TEXT_POST_BACKGROUNDS } from '../../utils/textPostColors'
import '../../styles/components/createpost/formbody.css'

const API_URL = 'http://localhost:5000/api/posts'
const API_ORIGIN = 'http://localhost:5000'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const MAX_IMAGE_COUNT = 25
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: ICONS.publicIcon },
  { value: 'private', label: 'Private', icon: ICONS.lock },
  { value: 'friends', label: 'Friends', icon: ICONS.userIcon },
]

function FormBody({ postType, editPostId }) {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const isTextPost = postType === 'text'

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [textPostBackground, setTextPostBackground] = React.useState(DEFAULT_TEXT_POST_BACKGROUND)
  const [imageFiles, setImageFiles] = React.useState([])
  const [visibility, setVisibility] = React.useState('public')
  const [visibilityOpen, setVisibilityOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingPost, setIsLoadingPost] = React.useState(Boolean(editPostId))
  const [error, setError] = React.useState('')
  const imageInputRef = React.useRef(null)
  const visibilityRef = React.useRef(null)
  const textPostDescriptionRef = React.useRef(null)
  const textPostContainerRef = React.useRef(null)
  const previewUrls = React.useRef(new Set())

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

        setTitle(result.title || '')
        setDescription(result.description || '')
        setTextPostBackground(result.backgroundColor || DEFAULT_TEXT_POST_BACKGROUND)
        setVisibility(result.visibility || 'public')
        setImageFiles((result.images || []).map((imagePath) => ({
          file: null,
          previewUrl: imagePath.startsWith('/') ? `${API_ORIGIN}${imagePath}` : imagePath,
          existingPath: imagePath,
        })))
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setIsLoadingPost(false)
      }
    }

    loadPost()
    return () => controller.abort()
  }, [editPostId, user])

  React.useLayoutEffect(() => {
    if (!isTextPost) return undefined

    const textarea = textPostDescriptionRef.current
    const container = textPostContainerRef.current
    if (!textarea || !container) return undefined

    let lastObservedWidth = 0
    function resizeTextPost() {
      const width = container.clientWidth
      if (!width || width === lastObservedWidth) return
      lastObservedWidth = width

      container.style.height = 'auto'
      container.style.aspectRatio = 'auto'
      container.style.flexBasis = 'auto'
      container.style.minHeight = '0'
      container.style.maxHeight = 'none'
      container.classList.remove('text-post-square')
      textarea.style.fontSize = '30px'
      textarea.style.height = 'auto'
      textarea.style.overflowY = 'hidden'
      textarea.style.minHeight = '0'

      const naturalTextareaContentHeight = textarea.scrollHeight
      const containerOverhead = container.offsetHeight - textarea.offsetHeight

      if (naturalTextareaContentHeight + containerOverhead <= width) {
        textarea.style.height = `${naturalTextareaContentHeight}px`
        return
      }

      container.classList.add('text-post-square')
      container.style.height = `${width}px`
      container.style.minHeight = `${width}px`
      container.style.maxHeight = `${width}px`
      container.style.flexBasis = `${width}px`
      container.style.aspectRatio = '1'
      const availableTextHeight = Math.max(1, width - containerOverhead)

      let smallestFontSize = 6
      let largestFontSize = 30
      textarea.style.height = `${availableTextHeight}px`
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const fontSize = (smallestFontSize + largestFontSize) / 2
        textarea.style.fontSize = `${fontSize}px`

        if (textarea.scrollHeight <= textarea.clientHeight) {
          smallestFontSize = fontSize
        } else {
          largestFontSize = fontSize
        }
      }

      textarea.style.fontSize = `${smallestFontSize}px`
      textarea.style.height = `${availableTextHeight}px`
      textarea.style.overflowY = textarea.scrollHeight > textarea.clientHeight ? 'auto' : 'hidden'
    }

    resizeTextPost()
    const resizeObserver = new ResizeObserver(() => resizeTextPost())
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [description, isTextPost])

  React.useEffect(() => {
    if (!visibilityOpen) return undefined

    function handlePointerDown(event) {
      if (!visibilityRef.current?.contains(event.target)) {
        setVisibilityOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setVisibilityOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visibilityOpen])

  function handleImageSelection(event) {
    const selectedFiles = Array.from(event.target.files || [])
    event.target.value = ''

    const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_IMAGE_SIZE)
    const acceptableFiles = selectedFiles.filter(
      (file) => file.type.startsWith('image/') && file.size <= MAX_IMAGE_SIZE
    )
    const remainingSlots = MAX_IMAGE_COUNT - imageFiles.length
    const filesToAdd = acceptableFiles.slice(0, remainingSlots).map((file) => {
      const previewUrl = URL.createObjectURL(file)
      previewUrls.current.add(previewUrl)
      return { file, previewUrl }
    })

    setImageFiles((currentFiles) => [...currentFiles, ...filesToAdd])

    if (oversizedFiles.length > 0) {
      setError('Each image must be smaller than 2 MB.')
    } else if (acceptableFiles.length < selectedFiles.length) {
      setError('Please select valid image files.')
    } else if (filesToAdd.length < acceptableFiles.length) {
      setError(`You can attach up to ${MAX_IMAGE_COUNT} images.`)
    } else {
      setError('')
    }
  }

  function removeImage(index) {
    const imageToRemove = imageFiles[index]
    if (!imageToRemove) return

    if (imageToRemove.file) {
      URL.revokeObjectURL(imageToRemove.previewUrl)
      previewUrls.current.delete(imageToRemove.previewUrl)
    }
    setImageFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))
  }

  async function handleShare(event) {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (isTextPost && !trimmedDescription) {
      setError('Please write something before sharing your text post.')
      return
    }

    if (!isTextPost && !trimmedTitle) {
      setError('Please enter a title.')
      return
    }

    if (!isTextPost && imageFiles.length === 0) {
      setError('Please add at least one image to your image post.')
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
      body.append('postType', postType)
      if (!isTextPost) body.append('title', trimmedTitle)
      body.append('description', trimmedDescription)
      body.append('visibility', visibility)
      if (isTextPost) body.append('backgroundColor', textPostBackground)
      if (editPostId) {
        body.append('existingImages', JSON.stringify(imageFiles.filter(({ existingPath }) => existingPath).map(({ existingPath }) => existingPath)))
      }
      if (!isTextPost) imageFiles.forEach(({ file }) => {
        if (file) body.append('images', file)
      })

      const response = await fetch(editPostId ? `${API_URL}/${editPostId}` : API_URL, {
        method: editPostId ? 'PATCH' : 'POST',
        headers,
        body,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || `Could not create post (${response.status}).`)
      }

      navigate('/for-you', { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Could not create the post. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="create-container">
      {imageFiles.length > 0 && (
        <div className="left-els">
          <PostImageGrid
            images={imageFiles.map(({ file, previewUrl }, index) => ({ src: previewUrl, alt: file?.name || `Post image ${index + 1}` }))}
            className="post-image-grid-preview"
          />
        </div>
      )}

      <div className="right-els">
        <div className="form-container">
          <form className="post-form" onSubmit={handleShare}>
            {imageFiles.length > 0 && (
              <div className="post-image-grid-mobile-preview">
                <PostImageGrid
                  images={imageFiles.map(({ file, previewUrl }, index) => ({ src: previewUrl, alt: file?.name || `Post image ${index + 1}` }))}
                />
              </div>
            )}
            <h2>{editPostId ? 'Edit post' : isTextPost ? 'Create text post' : 'Enter details'}</h2>

            {!isTextPost && (
              <div className="title-container">
                <p className="option-text">Title</p>
                <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Add title here..." required/>
                <p className="value-length">{title.length} / 100</p>
              </div>
            )}

            <div
              ref={isTextPost ? textPostContainerRef : null}
              className={isTextPost ? 'description-container text-post-description' : 'description-container'}
              style={isTextPost ? {
                backgroundColor: textPostBackground,
                color: getTextPostColor(textPostBackground),
              } : undefined}
            >
              <p className="option-text">{isTextPost ? "What's on your mind?" : 'Description'}</p>
              <textarea ref={isTextPost ? textPostDescriptionRef : null} cols={30} rows={isTextPost ? 1 : 4} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder={isTextPost ? "Share what's on your mind..." : 'Tell more details about this post...'} required={isTextPost} style={isTextPost ? { resize: 'none', color: getTextPostColor(textPostBackground) } : { resize: 'none' }}/>
              <p className="value-length">{description.length} / 1000</p>
            </div>

            {isTextPost && (
              <fieldset className="text-post-background-picker">
                <legend className="option-text">Choose a background</legend>
                <div className="text-post-background-options">
                  {TEXT_POST_BACKGROUNDS.map(({ color, label }) => (
                    <button
                      key={color}
                      className="text-post-background-option"
                      type="button"
                      style={{ backgroundColor: color }}
                      aria-label={label}
                      aria-pressed={textPostBackground === color}
                      title={label}
                      onClick={() => setTextPostBackground(color)}
                    >
                      {textPostBackground === color && <span aria-hidden="true">✓</span>}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {!isTextPost && (
              <>
                <input ref={imageInputRef} type="file" accept="image/*" id="upload-button" multiple aria-required="true" onChange={handleImageSelection}/>
                <button className="upload-button-area" type="button" onClick={() => imageInputRef.current?.click()}>
                  <span className="upload-label">Add photos <span className="required-indicator">Required</span></span>
                  <img src={ICONS.addPhoto} alt="" />
                  {imageFiles.length > 0 && <span>{imageFiles.length} attached</span>}
                </button>
                {imageFiles.length > 0 && (
                  <ul className="attached-image-list">
                    {imageFiles.map(({ file }, index) => (
                      <li key={file ? `${file.name}-${file.lastModified}-${index}` : `existing-${index}`}>
                        <span>{file?.name || `Post image ${index + 1}`}</span>
                        <button type="button" onClick={() => removeImage(index)} aria-label={`Remove image ${index + 1}`}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="visibility" ref={visibilityRef}>
              <button className="upper" type="button" aria-expanded={visibilityOpen} aria-haspopup="listbox" onClick={() => setVisibilityOpen((open) => !open)}>
                <p className="option-text">Visibility</p>
                <img className={visibilityOpen ? 'visibility-arrow open' : 'visibility-arrow'} src={ICONS.arrowDown} alt=""/>
              </button>
              <div className="lower">
                <p className="option-value">
                  {VISIBILITY_OPTIONS.find((option) => option.value === visibility).label}
                </p>
                <img src={VISIBILITY_OPTIONS.find((option) => option.value === visibility).icon} alt=""/>
              </div>
              {visibilityOpen && (
                <div className="visibility-options" role="listbox" aria-label="Post visibility">
                  {VISIBILITY_OPTIONS.map((option) => (
                    <button key={option.value} className="visibility-option" type="button" role="option" aria-selected={visibility === option.value} onClick={() => {
                        setVisibility(option.value); setVisibilityOpen(false)}}>
                      <img src={option.icon} alt="" />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="tag-people">
              <p className="option-text">People</p>
              <p className="option-value">You have not tagged anyone yet!</p>
            </div>

            <div className="settings">
              <img src={ICONS.more} alt="" />
              <p className="option-text">More settings</p>
            </div>

            {error && <p role="alert">{error}</p>}

            <button className="share-btn" type="submit" disabled={isSubmitting || isLoadingPost}>
              {isSubmitting ? (editPostId ? 'Saving…' : 'Sharing…') : (editPostId ? 'Save changes' : 'Share')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FormBody
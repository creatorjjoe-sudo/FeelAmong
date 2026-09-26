import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import { ICONS } from '../../assets/icons'
import '../../styles/components/createpost/formbody.css'

const API_URL = 'http://localhost:5000/api/posts'
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}

function FormBody() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [imageFile, setImageFile] = React.useState(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  async function handleShare(event) {
    event.preventDefault()
    setError('')

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Please enter a title.')
      return
    }

    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
      setError('Please choose an image smaller than 2 MB.')
      return
    }

    const token =
      user?.token ||
      user?.accessToken ||
      user?.data?.token ||
      localStorage.getItem('token')

    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    setIsSubmitting(true)

    try {
      const images = imageFile ? [await fileToDataUrl(imageFile)] : []
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: trimmedTitle,
          description: description.trim(),
          images,
        }),
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
      <div className="left-els"></div>

      <div className="right-els">
        <div className="form-container">
          <form className="post-form" onSubmit={handleShare}>
            <h2>Enter details</h2>

            <div className="title-container">
              <p className="option-text">Title</p>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                placeholder="Add title here..."
                required
              />
              <p className="value-length">{title.length} / 100</p>
            </div>

            <div className="description-container">
              <p className="option-text">Description</p>
              <textarea
                cols={30}
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                placeholder="Tell more details about this post..."
                style={{ resize: 'none' }}
              />
              <p className="value-length">{description.length} / 1000</p>
            </div>

            <input
              type="file"
              accept="image/*"
              id="upload-button"
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
            />
            <div className="upload-button-area">
              <label htmlFor="upload-button">Add photo</label>
              <img src={ICONS.addPhoto} alt="" />
              {imageFile && (
                <span>
                  {imageFile.name}{' '}
                  <button type="button" onClick={() => setImageFile(null)}>
                    Remove
                  </button>
                </span>
              )}
            </div>

            <div className="visibility">
              <div className="upper">
                <p className="option-text">Visibility</p>
                <img src={ICONS.arrowDown} alt="" />
              </div>
              <div className="lower">
                <p className="option-value">Public</p>
                <img src={ICONS.publicIcon} alt="" />
              </div>
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

            <button className="share-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sharing…' : 'Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FormBody
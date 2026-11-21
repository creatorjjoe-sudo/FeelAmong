import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import '../styles/pages/save-to-container-page.css'

const API_ORIGIN = 'http://localhost:5000'

// Save-item modal. Matches the no-container design:
// back header, "Save {author}'s post/video" line, and either the list of
// containers or the centered "No container" empty state.
function SaveToContainerPage() {
  const { user } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state || {}
  const itemType = state.itemType || 'post'
  const itemId = state.itemId
  const authorName = state.authorName || 'this user'
  const currentFolderId = state.currentFolderId || ''
  const isSaved = Boolean(state.isSaved)

  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [folders, setFolders] = React.useState([])
  const [selectedFolderId, setSelectedFolderId] = React.useState(currentFolderId)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const goBack = React.useCallback(() => {
    navigate(-1)
  }, [navigate])

  React.useEffect(() => {
    document.title = 'Save Post • FeelAmong'
    return () => {
      document.title = ''
    }
  }, [])

  React.useEffect(() => {
    let isActive = true

    async function loadFolders() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/saves`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Unable to load saved containers.')
        if (!isActive) return
        const userFolders = Array.isArray(result.folders) ? result.folders : []
        setFolders(userFolders)
        if (currentFolderId && userFolders.some((folder) => String(folder._id) === String(currentFolderId))) {
          setSelectedFolderId(String(currentFolderId))
        }
      } catch (loadError) {
        if (isActive) setError(loadError.message)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadFolders()
    return () => {
      isActive = false
    }
  }, [currentFolderId, token])

  async function saveToContainer() {
    if (!selectedFolderId || !itemId) return
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/saves/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemType, itemId, folderId: selectedFolderId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to save item.')
      goBack()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeFromSaved() {
    if (!itemId) return
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch(
        `${API_ORIGIN}/api/saves/items/${itemType}/${encodeURIComponent(itemId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to remove saved item.')
      goBack()
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const hasContainers = folders.length > 0

  // "Create container" always leads to the dedicated creation page, carrying
  // the save context so we can come back and preselect the new container.
  function goToCreateContainer() {
    navigate('/for-you/save/create-container', {
      state: {
        fromSave: true,
        itemType,
        itemId,
        authorName,
        isSaved,
        currentFolderId: selectedFolderId,
      },
    })
  }

  // Returning from the creation page: pick up the new container, refresh the
  // list and preselect it so the user can save right away.
  React.useEffect(() => {
    const newContainerId = location.state?.newContainerId
    if (!newContainerId) return
    setSelectedFolderId(String(newContainerId))
    setFolders((current) => {
      if (current.some((folder) => String(folder._id) === String(newContainerId))) return current
      return [...current, { _id: newContainerId, name: location.state.newContainerName || 'Container' }]
        .sort((left, right) => left.name.localeCompare(right.name))
    })
    navigate(location.pathname, { replace: true, state: { itemType, itemId, authorName, isSaved } })
  }, [location.state, itemType, itemId, authorName, isSaved, navigate, location.pathname])

  return (
    <div className="save-container-page" role="dialog" aria-modal="true" aria-labelledby="save-container-title">
      <div className="save-container-card">
        <header className="save-container-header">
          <button className="save-container-back" type="button" onClick={goBack} aria-label="Go back">‹</button>
          <h1 id="save-container-title">Save {itemType === 'video' ? 'Video' : 'Post'}</h1>
        </header>

        <p className="save-container-subtitle">
          Save <strong>{authorName}</strong>&apos;s {itemType}
        </p>

        {isLoading ? (
          <p className="save-container-state">Loading containers...</p>
        ) : hasContainers ? (
          <>
            <fieldset className="save-container-list">
              <legend>Choose a container</legend>
              {folders.map((folder) => (
                <label className="save-container-option" key={folder._id}>
                  <input
                    type="radio"
                    name="saved-container"
                    value={folder._id}
                    checked={selectedFolderId === String(folder._id)}
                    onChange={() => setSelectedFolderId(String(folder._id))}
                  />
                  <span>{folder.name}</span>
                </label>
              ))}
            </fieldset>

            <button className="save-container-empty-create" type="button" onClick={goToCreateContainer}>
              Create container
            </button>
          </>
        ) : (
          <div className="save-container-empty">
            <span className="save-container-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z" />
              </svg>
            </span>
            <h2>No container</h2>
            <p>You must have a container to save a {itemType}</p>
            <button className="save-container-empty-create" type="button" onClick={goToCreateContainer}>
              Create container
            </button>
          </div>
        )}

        {error && <p className="save-container-error" role="alert">{error}</p>}

        {hasContainers && (
          <div className="save-container-actions">
            {isSaved && (
              <button className="save-container-remove" type="button" onClick={removeFromSaved} disabled={isSaving || isLoading}>
                Remove from saved
              </button>
            )}
            <button className="save-container-submit" type="button" onClick={saveToContainer} disabled={!selectedFolderId || isSaving || isLoading}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SaveToContainerPage

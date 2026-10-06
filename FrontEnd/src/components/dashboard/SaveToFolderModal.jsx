import React from 'react'
import { AuthContext } from '../../api/context/AuthContext'
import '../../styles/components/dashboard/save-to-folder-modal.css'

const API_ORIGIN = 'http://localhost:5000'

function SaveToFolderModal({ itemType, itemId, currentFolderId, isSaved, onClose, onSaved }) {
  const { user } = React.useContext(AuthContext)
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [folders, setFolders] = React.useState([])
  const [selectedFolderId, setSelectedFolderId] = React.useState(currentFolderId || '')
  const [newFolderName, setNewFolderName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    async function loadFolders() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/saves`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Unable to load saved folders.')
        const userFolders = Array.isArray(result.folders) ? result.folders : []
        setFolders(userFolders)
        if (currentFolderId && userFolders.some((folder) => String(folder._id) === String(currentFolderId))) {
          setSelectedFolderId(String(currentFolderId))
        }
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadFolders()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentFolderId, onClose, token])

  async function createFolder(event) {
    event.preventDefault()
    const name = newFolderName.trim()
    if (!name) return

    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/saves/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })
      const folder = await response.json()
      if (!response.ok) throw new Error(folder.message || 'Unable to create folder.')
      setFolders((existing) => [...existing, folder].sort((left, right) => left.name.localeCompare(right.name)))
      setSelectedFolderId(String(folder._id))
      setNewFolderName('')
    } catch (createError) {
      setError(createError.message)
    }
  }

  async function saveToFolder() {
    if (!selectedFolderId) return
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
      onSaved(result)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeFromSaved() {
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
      onSaved(result)
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="save-folder-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="save-folder-dialog" role="dialog" aria-modal="true" aria-labelledby="save-folder-title">
        <button className="save-folder-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <h2 id="save-folder-title">Save to a folder</h2>
        {isLoading ? (
          <p className="save-folder-state">Loading folders...</p>
        ) : (
          <>
            {folders.length ? (
              <fieldset className="save-folder-list">
                <legend>Choose a folder</legend>
                {folders.map((folder) => (
                  <label className="save-folder-option" key={folder._id}>
                    <input
                      type="radio"
                      name="saved-folder"
                      value={folder._id}
                      checked={selectedFolderId === String(folder._id)}
                      onChange={() => setSelectedFolderId(String(folder._id))}
                    />
                    <span>{folder.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="save-folder-state">Create a folder to start saving items.</p>
            )}

            <form className="save-folder-create" onSubmit={createFolder}>
              <label htmlFor="new-saved-folder">Create a new folder</label>
              <div>
                <input
                  id="new-saved-folder"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  maxLength={50}
                  placeholder="Folder name"
                />
                <button type="submit" disabled={!newFolderName.trim()}>Create</button>
              </div>
            </form>
          </>
        )}

        {error && <p className="save-folder-error" role="alert">{error}</p>}
        <div className="save-folder-actions">
          {isSaved && (
            <button className="save-folder-remove" type="button" onClick={removeFromSaved} disabled={isSaving || isLoading}>
              Remove from saved
            </button>
          )}
          <button className="save-folder-submit" type="button" onClick={saveToFolder} disabled={!selectedFolderId || isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SaveToFolderModal

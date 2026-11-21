import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import '../styles/pages/create-container-page.css'

const API_ORIGIN = 'http://localhost:5000'

// Create-container modal:
// back header, name field, Public/Private type pills, and a Create button
// that stays disabled until the form is valid.
function CreateContainerPage() {
  const { user } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  // Carry-over context from the save page so we can return straight into it.
  const saveState = location.state?.fromSave ? location.state : null

  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [name, setName] = React.useState('')
  const [containerType, setContainerType] = React.useState('public')
  const [isCreating, setIsCreating] = React.useState(false)
  const [error, setError] = React.useState('')

  const trimmedName = name.trim()
  const canCreate = trimmedName.length > 0 && !isCreating

  function goBack() {
    navigate(-1)
  }

  async function createContainer(event) {
    event.preventDefault()
    if (!trimmedName) return

    setIsCreating(true)
    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/saves/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName, type: containerType }),
      })
      const folder = await response.json()
      if (!response.ok) throw new Error(folder.message || 'Unable to create container.')

      if (saveState) {
        // Return to the save flow with the new container preselected.
        navigate('/for-you/save', {
          replace: true,
          state: {
            ...saveState,
            newContainerId: String(folder._id),
            newContainerName: folder.name,
          },
        })
      } else {
        navigate(-1)
      }
    } catch (createError) {
      setError(createError.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="create-container-page" role="dialog" aria-modal="true" aria-labelledby="create-container-title">
      <div className="create-container-card">
        <header className="create-container-header">
          <button className="create-container-back" type="button" onClick={goBack} aria-label="Go back">‹</button>
          <h1 id="create-container-title">Create Container</h1>
        </header>

        <form className="create-container-form" onSubmit={createContainer}>
          <label className="create-container-label" htmlFor="create-container-name">Container name</label>
          <input
            id="create-container-name"
            className="create-container-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={50}
            autoComplete="off"
          />

          <p className="create-container-label" id="container-type-label">Container type</p>
          <div className="create-container-types" role="radiogroup" aria-labelledby="container-type-label">
            <label className={`create-container-type${containerType === 'public' ? ' is-selected' : ''}`}>
              <span>Public</span>
              <input
                type="radio"
                name="container-type"
                value="public"
                checked={containerType === 'public'}
                onChange={() => setContainerType('public')}
              />
            </label>
            <label className={`create-container-type${containerType === 'private' ? ' is-selected' : ''}`}>
              <span>Private</span>
              <input
                type="radio"
                name="container-type"
                value="private"
                checked={containerType === 'private'}
                onChange={() => setContainerType('private')}
              />
            </label>
          </div>

          <a className="create-container-learn" href="#learn-container-type" onClick={(event) => event.preventDefault()}>
            Learn about container type
          </a>

          {error && <p className="create-container-error" role="alert">{error}</p>}

          <button className="create-container-submit" type="submit" disabled={!canCreate}>
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateContainerPage

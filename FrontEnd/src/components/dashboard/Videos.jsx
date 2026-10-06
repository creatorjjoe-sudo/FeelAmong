import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import LoginRequiredModal from './LoginRequiredModal'
import SaveToFolderModal from './SaveToFolderModal'
import '../../styles/components/dashboard/videos.css'

const API_ORIGIN = 'http://localhost:5000'

function Videos() {
  const { user, logout } = React.useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [videos, setVideos] = React.useState([])
  const [savedItemFolders, setSavedItemFolders] = React.useState({})
  const [saveModalItem, setSaveModalItem] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [showLoginModal, setShowLoginModal] = React.useState(false)
  const saveModalOpen = location.state?.routedModal === 'save-folder'

  const closeSaveModal = React.useCallback(() => {
    setSaveModalItem(null)
    closeRoutedModal(navigate, location)
  }, [location, navigate])

  React.useEffect(() => {
    let isActive = true

    async function loadVideos() {
      try {
        const response = await fetch(`${API_ORIGIN}/api/videos`)
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load videos.')
        if (isActive) setVideos(Array.isArray(result) ? result : [])

        if (user && token && !user.isAnonymous) {
          const savedResponse = await fetch(`${API_ORIGIN}/api/saves`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const savedResult = await savedResponse.json()
          if (!savedResponse.ok) throw new Error(savedResult.message || 'Could not load saved videos.')
          if (isActive) {
            setSavedItemFolders(Object.fromEntries(
              (savedResult.items || []).map((item) => [`${item.itemType}:${item.itemId}`, item.folderId])
            ))
          }
        }
      } catch (loadError) {
        if (isActive) setError(loadError.message)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadVideos()
    return () => {
      isActive = false
    }
  }, [token, user])

  function openSaveModal(video) {
    if (!user || user.isAnonymous || !token) {
      setShowLoginModal(true)
      return
    }
    setSaveModalItem(video)
    pushRoutedModal(navigate, location, 'save-folder')
  }

  function handleSavedItem(result) {
    const key = `${result.itemType}:${result.itemId}`
    setSavedItemFolders((current) => {
      if (!result.isSaved) {
        const next = { ...current }
        delete next[key]
        return next
      }
      return { ...current, [key]: result.folderId }
    })
    setVideos((current) => current.map((video) => {
      if (String(video._id) !== String(result.itemId)) return video
      const saves = Array.isArray(video.saves) ? video.saves : []
      const alreadySaved = saves.some((savedId) => (
        String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
      ))
      if (result.isSaved === alreadySaved) return video
      return {
        ...video,
        saves: result.isSaved
          ? [...saves, user._id]
          : saves.filter((savedId) => (
            String(typeof savedId === 'object' ? savedId?._id : savedId) !== String(user?._id)
          )),
      }
    }))
    closeSaveModal()
  }

  async function handleLogin() {
    setShowLoginModal(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <main className="videos-page">
      <h1>Videos</h1>
      {isLoading && <p className="videos-state">Loading videos...</p>}
      {error && <p className="videos-state videos-error" role="alert">{error}</p>}
      {!isLoading && !error && videos.length === 0 && <p className="videos-state">No videos yet.</p>}

      <div className="videos-list">
        {videos.map((video) => {
          const key = `video:${video._id}`
          const isSaved = Object.prototype.hasOwnProperty.call(savedItemFolders, key)
            || video.saves?.some((savedId) => (
              String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
            ))
          const videoUrl = typeof video.videoUrl === 'string' && video.videoUrl.startsWith('/')
            ? `${API_ORIGIN}${video.videoUrl}`
            : video.videoUrl

          return (
            <article className="video-card" key={video._id}>
              <header className="video-card-header">
                <img src={getProfileAvatar(video.user)} alt="" />
                <div>
                  <h2>{video.user?.username || 'Unknown creator'}</h2>
                  {video.caption && <p>{video.caption}</p>}
                </div>
              </header>
              <video className="video-card-player" src={videoUrl} controls preload="metadata">
                Your browser does not support video playback.
              </video>
              <footer className="video-card-footer">
                <span>{video.saves?.length || 0} saves</span>
                <button type="button" onClick={() => openSaveModal(video)}>
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </footer>
            </article>
          )
        })}
      </div>

      {saveModalItem && saveModalOpen && (
        <SaveToFolderModal
          itemType="video"
          itemId={saveModalItem._id}
          currentFolderId={savedItemFolders[`video:${saveModalItem._id}`]}
          isSaved={Object.prototype.hasOwnProperty.call(savedItemFolders, `video:${saveModalItem._id}`)
            || saveModalItem.saves?.some((savedId) => (
              String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
            ))}
          onClose={closeSaveModal}
          onSaved={handleSavedItem}
        />
      )}
      {showLoginModal && (
        <LoginRequiredModal
          message="Please log in to save videos"
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLogin}
        />
      )}
    </main>
  )
}

export default Videos

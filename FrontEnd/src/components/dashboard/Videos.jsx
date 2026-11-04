import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import LoginRequiredModal from './LoginRequiredModal'
import SaveToFolderModal from './SaveToFolderModal'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react/player'
import { defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { DefaultLayout } from '@vidstack/react/player/layouts/default'
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
  const cardRefs = React.useRef(new Map())
  const playerRefs = React.useRef(new Map())
  const activePlayerRef = React.useRef(null)
  const manuallyPausedRef = React.useRef(new WeakSet())
  const observerPausingRef = React.useRef(new WeakSet())

  // Play the video currently in view, pause everything else.
  React.useEffect(() => {
    if (isLoading || !videos.length) return undefined

    const attemptPlay = (player) => {
      player.muted = true // browsers block unmuted autoplay
      if (player.state.canPlay) {
        player.play().catch(() => {})
      } else {
        // Player not loaded yet — wait for it to become ready, then play.
        const onReady = () => player.play().catch(() => {})
        player.addEventListener('can-play', onReady, { once: true })
      }
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = [...cardRefs.current.entries()].find(([, card]) => card === entry.target)?.[0]
        const player = id && playerRefs.current.get(id)
        if (!player) return
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (activePlayerRef.current && activePlayerRef.current !== player) {
            activePlayerRef.current.pause()
          }
          activePlayerRef.current = player
          if (!manuallyPausedRef.current.has(player)) attemptPlay(player)
        } else if (activePlayerRef.current === player) {
          observerPausingRef.current.add(player)
          player.pause()
          player.currentTime = 0
          observerPausingRef.current.delete(player)
          activePlayerRef.current = null
          manuallyPausedRef.current.delete(player)
        }
      })
    }, { threshold: [0, 0.6] })

    cardRefs.current.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [isLoading, videos, error])

  const registerCard = React.useCallback((id, card) => {
    if (card) cardRefs.current.set(id, card)
    else cardRefs.current.delete(id)
  }, [])

  const registerPlayer = React.useCallback((id, player) => {
    if (player) playerRefs.current.set(id, player)
    else playerRefs.current.delete(id)
  }, [])

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
            <article
              className="video-card"
              key={video._id}
              ref={(card) => registerCard(video._id, card)}
            >
              <header className="video-card-header">
                <img src={getProfileAvatar(video.user)} alt="" />
                <div>
                  <h2>{video.user?.username || 'Unknown creator'}</h2>
                  {video.caption && <p>{video.caption}</p>}
                </div>
              </header>
              <MediaPlayer
                ref={(player) => registerPlayer(video._id, player)}
                className="video-card-player"
                src={{ src: videoUrl, type: 'video/mp4' }}
                playsInline
                muted
                onPlay={() => {
                  const player = playerRefs.current.get(video._id)
                  if (player) manuallyPausedRef.current.delete(player)
                }}
                onPause={(event) => {
                  const player = playerRefs.current.get(video._id)
                  if (!player || observerPausingRef.current.has(player)) return
                  manuallyPausedRef.current.add(player)
                }}
                load="visible"
                posterLoad="eager"
                crossOrigin
                title={video.caption || video.user?.username || 'Video'}
              >
                <MediaProvider>
                  <Poster
                    className="vds-poster"
                    src={video.thumbnailUrl || undefined}
                    alt=""
                  />
                  {/* Default layout gives TikTok/YouTube-style controls with
                      full keyboard support and quality/rate menus when the
                      source supports them. */}
                  <DefaultLayout icons={defaultLayoutIcons} />
                </MediaProvider>
              </MediaPlayer>
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

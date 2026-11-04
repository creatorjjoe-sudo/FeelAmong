import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import LoginRequiredModal from './LoginRequiredModal'
import SaveToFolderModal from './SaveToFolderModal'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/videosfeed.css'
import '../../styles/pages/profile.css'

const API_ORIGIN = 'http://localhost:5000'

function VideoFeedItem({ video, isSaved, onSave, isActive, index, registryRef, onLike, onComment, onShare, onMore, isLikedByMe, likedUsers, isMoreOpen, moreActions, moreAnchorsRef }) {
  const videoRef = React.useRef(null)
  const [isPaused, setIsPaused] = React.useState(false)
  const registerVideo = React.useCallback((element) => {
    videoRef.current = element
    if (element) {
      element.dataset.slideIndex = String(index)
      registryRef.current.set(index, element)
    } else {
      registryRef.current.delete(index)
    }
  }, [index, registryRef])
  const [progress, setProgress] = React.useState(0)
  const [burst, setBurst] = React.useState(false)

  const likeCount = video.likes?.length || 0
  const commentCount = video.comments?.length || 0
  const shareCount = video.sharesCount || 0

  const videoUrl = typeof video.videoUrl === 'string' && video.videoUrl.startsWith('/')
    ? `${API_ORIGIN}${video.videoUrl}`
    : video.videoUrl

  // Play when this slide snaps into view, pause when it leaves.
  React.useEffect(() => {
    const element = videoRef.current
    if (!element) return undefined

    if (isActive) {
      element.muted = false
      element.play().then(() => setIsPaused(false)).catch(() => {
        // Autoplay with sound may be blocked; retry muted so it still starts.
        element.muted = true
        element.play().then(() => setIsPaused(false)).catch(() => { })
      })
    } else {
      element.pause()
      setIsPaused(false)
    }
    return undefined
  }, [isActive])

  function togglePlayback() {
    const element = videoRef.current
    if (!element) return
    if (element.paused) {
      element.play().then(() => setIsPaused(false)).catch(() => { })
    } else {
      element.pause()
      setIsPaused(true)
    }
  }

  function handleTimeUpdate() {
    const element = videoRef.current
    if (!element || !element.duration) return
    setProgress((element.currentTime / element.duration) * 100)
  }

  function handleSeek(event) {
    event.stopPropagation()
    const element = videoRef.current
    const bar = event.currentTarget
    if (!element || !element.duration) return
    const rect = bar.getBoundingClientRect()
    element.currentTime = ((event.clientX - rect.left) / rect.width) * element.duration
  }

  function handleEnded() {
    // Loop TikTok-style.
    const element = videoRef.current
    if (!element) return
    element.currentTime = 0
    element.play().catch(() => { })
  }

  return (
    <section className={`video-slide${isActive ? ' is-active' : ''}`}>
      <div className="video-slide-row">
      <div className="video-stage" onClick={togglePlayback}>
        <video
          ref={registerVideo}
          className="video-stage-player"
          src={videoUrl}
          loop
          playsInline
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        >
          Your browser does not support video playback.
        </video>

        {isPaused && <span className="video-pause-badge"><img src={ICONS.play} alt="Paused" /></span>}

        <div className="video-overlay video-overlay-creator-only">
          <header className="video-overlay-creator">
            <img src={getProfileAvatar(video.user)} alt="" />
            <div className="video-overlay-creator-copy">
              <strong>{video.user?.username || 'Unknown creator'}</strong>
              {video.caption && <p>{video.caption}</p>}
            </div>
          </header>
        </div>

        <div
          className="video-progress"
          onClick={handleSeek}
          role="slider"
          aria-label="Video progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={-1}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <aside className="video-overlay-actions video-side-actions">
            <button
              type="button"
              className={`video-action-btn${isLikedByMe ? ' is-liked' : ''}${burst ? ' is-burst' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onLike(video)
                if (!isLikedByMe) {
                  setBurst(true)
                  setTimeout(() => setBurst(false), 400)
                }
              }}
              aria-pressed={isLikedByMe}
              aria-label={isLikedByMe ? 'Unlike' : 'Like'}
            >
              <span className="icon-disc"><img src={isLikedByMe ? ICONS.liked : ICONS.like} alt="" /></span>
              <span>{likeCount}</span>
            </button>

            <button
              type="button"
              className="video-action-btn"
              onClick={(event) => {
                event.stopPropagation()
                onComment(video)
              }}
              aria-label="Comments"
            >
              <span className="icon-disc"><img src={ICONS.comment} alt="" /></span>
              <span>{commentCount}</span>
            </button>

            <button
              type="button"
              className="video-action-btn"
              onClick={(event) => {
                event.stopPropagation()
                onShare(video)
              }}
              aria-label="Share"
            >
              <span className="icon-disc"><img src={ICONS.share} alt="" /></span>
              <span>{shareCount}</span>
            </button>

            <button
              type="button"
              className={`video-action-btn${isSaved ? ' is-saved' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onSave(video)
              }}
            >
              <span className="icon-disc"><img src={isSaved ? ICONS.saved : ICONS.save} alt="" /></span>
              <span>{video.saves?.length || 0}</span>
            </button>

            <div
              className="video-more-anchor"
              ref={(element) => {
                if (element) moreAnchorsRef.current.set(video._id, element)
                else moreAnchorsRef.current.delete(video._id)
              }}
            >
              <button
                type="button"
                className="video-action-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onMore(video)
                }}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
              >
                <span className="icon-disc"><img src={ICONS.more} alt="" /></span>
              </button>
              {isMoreOpen && (
                <ul className="video-more-options" role="menu" aria-label="Video options">
                  <li role="none">
                    <button className={`video-more-option${isLikedByMe ? ' is-active' : ''}`} type="button" role="menuitem" onClick={() => moreActions.onLike(video)}>
                      <img src={isLikedByMe ? ICONS.liked : ICONS.like} alt="" />
                      <span>{isLikedByMe ? 'Liked' : 'Like'}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button className="video-more-option" type="button" role="menuitem" onClick={() => moreActions.onComment(video)}>
                      <img src={ICONS.comment} alt="" />
                      <span>Comment</span>
                    </button>
                  </li>
                  <li role="none">
                    <button className="video-more-option" type="button" role="menuitem" onClick={() => moreActions.onShare(video)}>
                      <img src={ICONS.share} alt="" />
                      <span>Share</span>
                    </button>
                  </li>
                  <li role="none">
                    <button className={`video-more-option${isSaved ? ' is-active' : ''}`} type="button" role="menuitem" onClick={() => moreActions.onSave(video)}>
                      <img src={isSaved ? ICONS.saved : ICONS.save} alt="" />
                      <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>
                  </li>
                  <li role="none">
                    <button className="video-more-option" type="button" role="menuitem" onClick={() => moreActions.onReport(video)}>
                      <img src={ICONS.info} alt="" />
                      <span>Report video</span>
                    </button>
                  </li>
                  <li role="none">
                    <button className="video-more-option" type="button" role="menuitem" onClick={() => moreActions.onNotInterested(video)}>
                      <img src={ICONS.eyeClose} alt="" />
                      <span>Not interested</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
      </aside>
      </div>
    </section>
  )
}

function Videos() {
  const { user, logout } = React.useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const routedModal = location.state?.routedModal
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [videos, setVideos] = React.useState([])
  const [savedItemFolders, setSavedItemFolders] = React.useState({})
  const [saveModalItem, setSaveModalItem] = React.useState(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const isLoginRequiredOpen = routedModal === 'video-feed-login-required'
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [activeVideoDialogData, setActiveVideoDialogData] = React.useState(null)
  const [commentDraft, setCommentDraft] = React.useState('')
  const [moreMenuVideoId, setMoreMenuVideoId] = React.useState(null)
  const moreAnchorsRef = React.useRef(new Map())
  const [reportVideoItemData, setReportVideoItemData] = React.useState(null)
  const activeVideoDialog = routedModal === 'video-feed-comments' ? activeVideoDialogData : null
  const reportVideoItem = routedModal === 'video-feed-report' ? reportVideoItemData : null
  const [reportReason, setReportReason] = React.useState('')
  const [reportDetails, setReportDetails] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const scrollRef = React.useRef(null)
  const saveModalOpen = location.state?.routedModal === 'save-folder'
  // Every mounted <video> element registers itself here so the parent can
  // pause all of them except the active one whenever the active slide changes.
  const videoRegistryRef = React.useRef(new Map())

  const closeSaveModal = React.useCallback(() => {
    setSaveModalItem(null)
    closeRoutedModal(navigate, location)
  }, [location, navigate])
  const closeRoutedDialog = React.useCallback(() => {
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

  // Track which slide is currently snapped into view to drive playback.
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container || videos.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = Number(entry.target.dataset.slideIndex)
          if (!Number.isNaN(index)) setActiveIndex(index)
        })
      },
      { root: container, threshold: 0.6 },
    )

    container.querySelectorAll('.video-slide').forEach((slide) => observer.observe(slide))
    return () => observer.disconnect()
  }, [videos])

  // Single source of truth for playback: whenever the active slide changes,
  // pause every registered video that is not the active one, then play the
  // active one. If autoplay with sound is blocked by the browser, retry once
  // muted so the video still starts (the user can unmute via the stage tap).
  React.useEffect(() => {
    let cancelled = false
    const registry = videoRegistryRef.current
    registry.forEach((element) => {
      if (!element) return
      if (element.dataset.slideIndex === String(activeIndex)) return
      element.pause()
    })
    const activeElement = registry.get(activeIndex)
    if (activeElement && !cancelled) {
      activeElement.muted = false
      activeElement.play().catch(() => {
        if (cancelled) return
        activeElement.muted = true
        activeElement.play().catch(() => { })
      })
    }
    return () => { cancelled = true }
  }, [activeIndex, videos.length])

  // Keyboard navigation (desktop convenience).
  React.useEffect(() => {
    const container = scrollRef.current
    if (!container) return undefined

    function scrollToIndex(index) {
      const slide = container.querySelectorAll('.video-slide')[index]
      if (slide) slide.scrollIntoView({ behavior: 'smooth' })
    }

    function handleKeyDown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        scrollToIndex(Math.min(activeIndex + 1, videos.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        scrollToIndex(Math.max(activeIndex - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, videos.length])

  function openSaveModal(video) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }
    setSaveModalItem(video)
    pushRoutedModal(navigate, location, 'save-folder')
  }

  async function toggleLike(video) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }
    try {
      const response = await fetch(`${API_ORIGIN}/api/videos/${video._id}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to like video.')
      setVideos((current) => current.map((item) => {
        if (String(item._id) !== String(video._id)) return item
        const likes = Array.isArray(item.likes) ? item.likes : []
        const alreadyLiked = likes.some((id) => String(typeof id === 'object' ? id?._id : id) === String(user._id))
        return {
          ...item,
          likes: result.isLiked
            ? [...likes, user._id]
            : likes.filter((id) => String(typeof id === 'object' ? id?._id : id) !== String(user._id)),
        }
      }))
    } catch (likeError) {
      setNotice(likeError.message)
    }
  }

  function openComments(video) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }
    setCommentDraft('')
    setActiveVideoDialogData({ type: 'comment', video })
    pushRoutedModal(navigate, location, 'video-feed-comments')
  }

  async function addComment(event) {
    event.preventDefault()
    if (!activeVideoDialog) return
    const text = commentDraft.trim()
    if (!text) return
    try {
      const response = await fetch(`${API_ORIGIN}/api/videos/${activeVideoDialog.video._id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to add comment.')
      setVideos((current) => current.map((item) =>
        String(item._id) === String(activeVideoDialog.video._id)
          ? { ...item, comments: [...(item.comments || []), result.comment] }
          : item
      ))
      setCommentDraft('')
      closeRoutedDialog()
    } catch (commentError) {
      setNotice(commentError.message)
    }
  }

  async function shareVideoLink(video) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }
    const url = `${API_ORIGIN}${video.videoUrl}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FEEL-AMONG video', text: video.caption || '', url })
      } else {
        await navigator.clipboard.writeText(url)
        setNotice('Link copied to clipboard.')
      }
      const response = await fetch(`${API_ORIGIN}/api/videos/${video._id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) return
      const result = await response.json()
      setVideos((current) => current.map((item) =>
        String(item._id) === String(video._id) ? { ...item, sharesCount: result.sharesCount } : item
      ))
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setNotice(shareError.message)
    }
  }

  function openMoreMenu(video) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }
    setMoreMenuVideoId((current) => (current === video._id ? null : video._id))
  }

  // Close the more menu on outside click / Escape (same as posts).
  React.useEffect(() => {
    if (!moreMenuVideoId) return undefined

    function handlePointerDown(event) {
      if (!moreAnchorsRef.current.get(moreMenuVideoId)?.contains(event.target)) {
        setMoreMenuVideoId(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setMoreMenuVideoId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [moreMenuVideoId])

  async function reportVideo(event) {
    event.preventDefault()
    if (!reportVideoItem) return
    try {
      const response = await fetch(`${API_ORIGIN}/api/videos/${reportVideoItem._id}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not submit this report.')
      closeRoutedDialog()
      showNotice(result.message || 'Report submitted.')
    } catch (reportError) {
      showNotice(reportError.message)
    }
  }

  async function markNotInterested(video) {
    try {
      const response = await fetch(`${API_ORIGIN}/api/videos/${video._id}/not-interested`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to update this video.')
      if (result.isNotInterested) {
        setVideos((current) => current.filter((item) => String(item._id) !== String(video._id)))
        showNotice('We will show you fewer videos like this.')
      }
    } catch (notInterestedError) {
      showNotice(notInterestedError.message)
    }
  }

  const isLikedByMeHelper = (video) => Boolean(
    user && (video.likes || []).some((id) => String(typeof id === 'object' ? id?._id : id) === String(user._id))
  )

  function showNotice(message) {
    setNotice(message)
    window.clearTimeout(showNotice._timer)
    showNotice._timer = window.setTimeout(() => setNotice(''), 2600)
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
    await logout()
    navigate('/', { replace: true })
  }

  const isVideoSaved = (video) => (
    Object.prototype.hasOwnProperty.call(savedItemFolders, `video:${video._id}`)
    || video.saves?.some((savedId) => (
      String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
    ))
  )

  return (
    <main className="videos-page">
      <h1 className="sr-only">Videos</h1>
      {isLoading && <div className="videos-state"><span className="videos-spinner" />Loading videos...</div>}
      {error && <p className="videos-state videos-error" role="alert">{error}</p>}
      {!isLoading && !error && videos.length === 0 && (
        <p className="videos-state">No videos yet.</p>
      )}

      {videos.length > 0 && (
        <div className="videos-scroll" ref={scrollRef}>
          {videos.map((video, index) => (
            <VideoFeedItem
              key={video._id}
              video={video}
              isActive={index === activeIndex}
              index={index}
              registryRef={videoRegistryRef}
              isSaved={isVideoSaved(video)}
              onSave={openSaveModal}
              onLike={toggleLike}
              onComment={openComments}
              onShare={shareVideoLink}
              onMore={openMoreMenu}
              isLikedByMe={Boolean(user && (video.likes || []).some((id) => String(typeof id === 'object' ? id?._id : id) === String(user._id)))}
              isMoreOpen={moreMenuVideoId === video._id}
              moreAnchorsRef={moreAnchorsRef}
              moreActions={{
                onLike: (item) => { toggleLike(item) },
                onComment: (item) => { setMoreMenuVideoId(null); openComments(item) },
                onShare: (item) => { setMoreMenuVideoId(null); shareVideoLink(item) },
                onSave: (item) => { openSaveModal(item) },
                onReport: (item) => {
                  setMoreMenuVideoId(null)
                  setReportReason('')
                  setReportDetails('')
                  setReportVideoItemData(item)
                  pushRoutedModal(navigate, location, 'video-feed-report')
                },
                onNotInterested: (item) => { setMoreMenuVideoId(null); markNotInterested(item) },
              }}
            />
          ))}
        </div>
      )}

      {saveModalItem && saveModalOpen && (
        <SaveToFolderModal
          itemType="video"
          itemId={saveModalItem._id}
          currentFolderId={savedItemFolders[`video:${saveModalItem._id}`]}
          isSaved={isVideoSaved(saveModalItem)}
          onClose={closeSaveModal}
          onSaved={handleSavedItem}
        />
      )}
      {isLoginRequiredOpen && (
        <LoginRequiredModal
          message="Please log in to save videos"
          onClose={closeRoutedDialog}
          onLogin={handleLogin}
        />
      )}

      {activeVideoDialog?.type === 'comment' && (
        <div className="post-action-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRoutedDialog()
        }}>
          <section className="post-action-dialog" role="dialog" aria-modal="true" aria-labelledby="video-comment-dialog-title">
            <button className="post-action-dialog-close" type="button" aria-label="Close dialog" onClick={closeRoutedDialog}>×</button>
            <h2 id="video-comment-dialog-title">Comments</h2>
            <div className="post-comments-list">
              {(activeVideoDialog.video.comments || []).map((comment) => (
                <article className="post-comment" key={comment._id}>
                  <strong>{comment.user?.username || 'User'}</strong>
                  <p>{comment.text}</p>
                </article>
              ))}
              {!activeVideoDialog.video.comments?.length && <p className="post-dialog-empty">No comments yet.</p>}
            </div>
            <form onSubmit={addComment}>
              <label htmlFor="video-comment-input">Add a comment</label>
              <textarea id="video-comment-input" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={1000} required rows={3} />
              <button className="post-dialog-submit" type="submit">Comment</button>
            </form>
          </section>
        </div>
      )}

      {reportVideoItem && (
        <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRoutedDialog()
        }}>
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="report-video-title">
            <h2 id="report-video-title">Report video</h2>
            <form onSubmit={reportVideo}>
              <label>
                Reason
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} required>
                  <option value="">Select a reason</option>
                  <option value="Spam">Spam</option>
                  <option value="Harassment">Harassment</option>
                  <option value="Inappropriate content">Inappropriate content</option>
                  <option value="False information">False information</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Details (optional)
                <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3} />
              </label>
              <div className="profile-dialog-actions">
                <button type="button" onClick={closeRoutedDialog}>Cancel</button>
                <button type="submit">Submit report</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {notice && <div className="video-notice" role="status">{notice}</div>}
    </main>
  )
}

export default Videos

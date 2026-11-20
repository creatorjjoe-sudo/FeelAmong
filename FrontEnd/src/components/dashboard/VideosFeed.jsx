import React from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../api/context/AuthContext'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import LoginRequiredModal from './LoginRequiredModal'
import { ICONS } from '../../assets/icons'
import '../../styles/components/dashboard/posts.css'
import '../../styles/components/dashboard/videosfeed.css'
import '../../styles/pages/profile.css'

const API_ORIGIN = 'http://localhost:5000'
const VISIBILITY_ICONS = {
  public: ICONS.publicIcon,
  private: ICONS.lock,
  friends: ICONS.userIcon,
}

function getCommentThreadCounts(comments = []) {
  return comments.reduce((counts, comment) => {
    counts.replies += comment.replies?.length || 0
    for (const reply of comment.replies || []) {
      counts.subReplies += reply.replies?.length || 0
    }
    return counts
  }, { comments: comments.length, replies: 0, subReplies: 0 })
}

function getCommentReplyCount(comment) {
  return (comment.replies || []).reduce(
    (count, reply) => count + 1 + (reply.replies?.length || 0),
    0,
  )
}

function getLikeUserId(like) {
  return String(typeof like === 'object' && like !== null ? like._id : like)
}

function formatThreadTime(createdAt) {
  if (!createdAt) return ''
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'just now'
  const units = [['year', 31536000, 'y'], ['month', 2592000, 'mo'], ['day', 86400, 'd'], ['hour', 3600, 'h'], ['minute', 60, 'm']]
  const [unit, secondsPerUnit, shortUnit] = units.find(([, seconds]) => elapsedSeconds >= seconds)
  const value = Math.floor(elapsedSeconds / secondsPerUnit)
  return `${value}${shortUnit}`
}

function VideoFeedItem({ video, isSaved, onSave, isActive, index, registryRef, onLike, onComment, onShare, onMore, isLikedByMe, likedUsers, isMoreOpen, moreActions, moreAnchorsRef, isLoading = false }) {
  const videoRef = React.useRef(null)
  const rowRef = React.useRef(null)
  const [isPaused, setIsPaused] = React.useState(false)
  const [isMediaLoading, setIsMediaLoading] = React.useState(true)
  const [videoAspectRatio, setVideoAspectRatio] = React.useState(9 / 16)
  const [stageSize, setStageSize] = React.useState(null)
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

  const likeCount = video?.likes?.length || 0
  const commentCount = video?.comments?.length || 0
  const shareCount = video?.sharesCount || 0

  const originalVideo = video?.sharedVideo || video
  const videoUrl = typeof originalVideo?.videoUrl === 'string' && originalVideo.videoUrl.startsWith('/')
    ? `${API_ORIGIN}${originalVideo.videoUrl}`
    : originalVideo?.videoUrl

  React.useEffect(() => {
    const row = rowRef.current
    if (!row) return undefined

    function updateStageSize() {
      const bounds = row.getBoundingClientRect()
      const styles = window.getComputedStyle(row)
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
      const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
      const isMobile = window.matchMedia('(max-width: 800px)').matches
      const availableWidth = Math.max(0, bounds.width - horizontalPadding)
      const availableHeight = Math.max(0, bounds.height - verticalPadding)
      const maxWidth = isMobile ? availableWidth : Math.min(480, availableWidth)
      const maxHeight = Math.min(780, availableHeight)
      const height = Math.min(maxHeight, maxWidth / videoAspectRatio)
      const nextSize = { width: height * videoAspectRatio, height }

      setStageSize((current) => (
        current
        && Math.abs(current.width - nextSize.width) < 0.5
        && Math.abs(current.height - nextSize.height) < 0.5
          ? current
          : nextSize
      ))
    }

    updateStageSize()
    const observer = new ResizeObserver(updateStageSize)
    observer.observe(row)
    return () => observer.disconnect()
  }, [videoAspectRatio])

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

  function handleLoadedMetadata(event) {
    const { videoWidth, videoHeight } = event.currentTarget
    if (videoWidth && videoHeight) setVideoAspectRatio(videoWidth / videoHeight)
  }

  const stageStyle = stageSize
    ? { width: `${stageSize.width}px`, height: `${stageSize.height}px` }
    : undefined

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

  if (isLoading) {
    return (
      <section className={`video-slide${isActive ? ' is-active' : ''}`} data-slide-index={index}>
        <div className="video-slide-row" ref={rowRef}>
          <div className="video-stage" style={stageStyle}>
            <div className="video-stage-content">
              <video className="video-stage-player is-loading" aria-hidden="true" />
              <div className="video-overlay video-overlay-creator-only" aria-hidden="true">
                <header className="video-overlay-creator">
                  <span className="video-loading-shape video-loading-avatar" />
                  <div className="video-overlay-creator-copy video-loading-copy">
                    <span className="video-loading-shape video-loading-name" />
                    <span className="video-loading-shape video-loading-caption" />
                    <span className="video-loading-shape video-loading-caption" />
                  </div>
                </header>
              </div>
            </div>
            <aside className="video-overlay-actions video-side-actions video-loading-actions" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((action) => (
                <span className="video-action-btn video-loading-action" key={action}>
                  <span className="icon-disc video-loading-shape video-loading-icon" />
                  {action < 4 && <span className="video-loading-shape video-loading-count" />}
                </span>
              ))}
            </aside>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`video-slide${isActive ? ' is-active' : ''}${isMediaLoading ? ' is-media-loading' : ''}`} data-slide-index={index}>
      <div className="video-slide-row" ref={rowRef}>
      <div className="video-stage" style={stageStyle} onClick={togglePlayback}>
        <div className="video-stage-content">
          <video
            ref={registerVideo}
            className={`video-stage-player${isMediaLoading ? ' is-loading' : ''}`}
            src={videoUrl}
            loop
            playsInline
            preload="metadata"
            onLoadStart={() => setIsMediaLoading(true)}
            onWaiting={() => setIsMediaLoading(true)}
            onPlaying={() => setIsMediaLoading(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          >
            Your browser does not support video playback.
          </video>

          {isPaused && <span className="video-pause-badge"><img src={ICONS.play} alt="Paused" /></span>}

          <div className="video-overlay video-overlay-creator-only">
            <header className="video-overlay-creator">
              {isMediaLoading
                ? <span className="video-loading-shape video-loading-avatar" />
                : <img src={getProfileAvatar(video.user)} alt="" />}
              <div className="video-overlay-creator-copy">
                {isMediaLoading ? (
                  <>
                    <span className="video-loading-shape video-loading-name" />
                    <span className="video-loading-shape video-loading-caption" />
                    <span className="video-loading-shape video-loading-caption" />
                  </>
                ) : (
                  <>
                    <strong>{video.user?.username || 'Unknown creator'}</strong>
                    {video.sharedVideo && <span className="video-shared-byline">shared a video</span>}
                    {(video.shareCaption || video.caption) && <p>{video.shareCaption || video.caption}</p>}
                    {video.sharedVideo && (
                      <div className="video-original-creator">
                        <img src={getProfileAvatar(video.sharedVideo.user)} alt="" />
                        <span>Original video by <strong>{video.sharedVideo.user?.username || 'Unknown creator'}</strong></span>
                      </div>
                    )}
                  </>
                )}
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

      <aside className="video-overlay-actions video-side-actions" onClick={(event) => event.stopPropagation()}>
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
      </div>
    </section>
  )
}

function Videos() {
  const { user, personalUser, logout, switchToCompany } = React.useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const routedModal = location.state?.routedModal
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [videos, setVideos] = React.useState([])
  const [savedItemFolders, setSavedItemFolders] = React.useState({})
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const isLoginRequiredOpen = routedModal === 'video-feed-login-required'
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [activeVideoDialogData, setActiveVideoDialogData] = React.useState(null)
  const [commentDraft, setCommentDraft] = React.useState('')
  const [replyTarget, setReplyTarget] = React.useState(null)
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false)
  const commentInputRef = React.useRef(null)
  const [moreMenuVideoId, setMoreMenuVideoId] = React.useState(null)
  const moreAnchorsRef = React.useRef(new Map())
  const [reportVideoItemData, setReportVideoItemData] = React.useState(null)
  const activeVideoDialog = routedModal === 'video-feed-comments' ? activeVideoDialogData : null
  const reportVideoItem = routedModal === 'video-feed-report' ? reportVideoItemData : null
  const [reportReason, setReportReason] = React.useState('')
  const [reportDetails, setReportDetails] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [activeVideoShareData, setActiveVideoShareData] = React.useState(null)
  const [shareDescription, setShareDescription] = React.useState('')
  const [shareVisibility, setShareVisibility] = React.useState('public')
  const [isSubmittingShare, setIsSubmittingShare] = React.useState(false)
  const [shareError, setShareError] = React.useState('')
  const [shareLinkCopied, setShareLinkCopied] = React.useState(false)
  const [isCompanySharePromptOpen, setIsCompanySharePromptOpen] = React.useState(false)
  const [companies, setCompanies] = React.useState([])
  const [selectedCompanyId, setSelectedCompanyId] = React.useState('')
  const [isCompanyLoading, setIsCompanyLoading] = React.useState(false)
  const [isSwitchingAccount, setIsSwitchingAccount] = React.useState(false)
  const [companyShareError, setCompanyShareError] = React.useState('')
  const scrollRef = React.useRef(null)
  const saveModalOpen = location.state?.routedModal === 'save-folder'
  // Every mounted <video> element registers itself here so the parent can
  // pause all of them except the active one whenever the active slide changes.
  const videoRegistryRef = React.useRef(new Map())

  React.useLayoutEffect(() => {
    const textarea = commentInputRef.current
    if (!textarea) return
    textarea.style.height = '40px'
    const contentHeight = textarea.scrollHeight
    textarea.style.height = `${Math.min(contentHeight, 100)}px`
    textarea.style.overflowY = contentHeight > 100 ? 'auto' : 'hidden'
  }, [activeVideoDialog, commentDraft])

  const closeRoutedDialog = React.useCallback(() => {
    closeRoutedModal(navigate, location)
  }, [location, navigate])
  const isVideoShareOpen = routedModal === 'video-feed-share' && Boolean(activeVideoShareData)
  const shareSourceVideo = activeVideoShareData?.sharedVideo || activeVideoShareData

  React.useEffect(() => {
    if (!isCompanySharePromptOpen || !personalUser?.token) return undefined

    const controller = new AbortController()
    async function loadCompanies() {
      setIsCompanyLoading(true)
      setCompanyShareError('')
      try {
        const response = await fetch(`${API_ORIGIN}/api/companies`, {
          headers: { Authorization: `Bearer ${personalUser.token}` },
          signal: controller.signal,
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Could not load company accounts.')
        if (!Array.isArray(result)) throw new Error('Could not load company accounts.')
        setCompanies(result)
        setSelectedCompanyId(result[0]?._id ? String(result[0]._id) : '')
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setCompanyShareError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setIsCompanyLoading(false)
      }
    }

    loadCompanies()
    return () => controller.abort()
  }, [isCompanySharePromptOpen, personalUser])

  React.useEffect(() => {
    if (!isCompanySharePromptOpen) return undefined
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSwitchingAccount) setIsCompanySharePromptOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCompanySharePromptOpen, isSwitchingAccount])

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
    navigate('/for-you/save', {
      state: {
        itemType: 'video',
        itemId: video._id,
        authorName: video.user?.username || 'this user',
        currentFolderId: savedItemFolders[`video:${video._id}`] || '',
        isSaved: isVideoSaved(video),
      },
    })
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
    setReplyTarget(null)
    setActiveVideoDialogData({ type: 'comment', video })
    pushRoutedModal(navigate, location, 'video-feed-comments')
  }

  function updateVideoComments(videoId, updateComments) {
    setVideos((current) => current.map((video) => (
      String(video._id) === String(videoId)
        ? { ...video, comments: updateComments(video.comments || []) }
        : video
    )))
    setActiveVideoDialogData((current) => (
      current && String(current.video._id) === String(videoId)
        ? { ...current, video: { ...current.video, comments: updateComments(current.video.comments || []) } }
        : current
    ))
  }

  async function addComment(event) {
    event.preventDefault()
    if (!activeVideoDialog || !token || isSubmittingComment) return
    const text = commentDraft.trim()
    if (!text) return
    setIsSubmittingComment(true)
    try {
      const endpoint = replyTarget
        ? `${API_ORIGIN}/api/videos/${activeVideoDialog.video._id}/comments/${replyTarget.commentId}/replies`
        : `${API_ORIGIN}/api/videos/${activeVideoDialog.video._id}/comments`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          ...(replyTarget?.replyId ? { parentReplyId: replyTarget.replyId } : {}),
          ...(replyTarget?.replyToSubReplyId ? { replyToSubReplyId: replyTarget.replyToSubReplyId } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || (replyTarget ? 'Unable to add reply.' : 'Unable to add comment.'))
      updateVideoComments(activeVideoDialog.video._id, (comments) => {
        if (!replyTarget) return [...comments, result.comment]
        return comments.map((comment) => {
          if (String(comment._id) !== String(result.commentId)) return comment
          if (!result.parentReplyId) return { ...comment, replies: [...(comment.replies || []), result.reply] }
          return {
            ...comment,
            replies: (comment.replies || []).map((reply) => (
              String(reply._id) === String(result.parentReplyId)
                ? { ...reply, replies: [...(reply.replies || []), result.reply] }
                : reply
            )),
          }
        })
      })
      setCommentDraft('')
      setReplyTarget(null)
    } catch (commentError) {
      setNotice(commentError.message)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function toggleVideoCommentLike(videoId, commentId, replyId = null, subReplyId = null) {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'video-feed-login-required')
      return
    }

    try {
      const response = await fetch(`${API_ORIGIN}/api/videos/${videoId}/comments/${commentId}/like`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(replyId ? { replyId } : {}),
          ...(subReplyId ? { subReplyId } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to update comment like.')

      const currentUserId = String(user._id)
      const currentUser = {
        _id: currentUserId,
        username: user.username || 'User',
        avatar: user.avatar || '',
        sex: user.sex || '',
      }
      const updateLikes = (likes = []) => (
        result.isLiked
          ? [...likes.filter((like) => getLikeUserId(like) !== currentUserId), currentUser]
          : likes.filter((like) => getLikeUserId(like) !== currentUserId)
      )

      updateVideoComments(videoId, (comments) => comments.map((comment) => {
        if (String(comment._id) !== String(commentId)) return comment
        if (!replyId) return { ...comment, likes: updateLikes(comment.likes) }
        return {
          ...comment,
          replies: (comment.replies || []).map((reply) => {
            if (String(reply._id) !== String(replyId)) return reply
            if (!subReplyId) return { ...reply, likes: updateLikes(reply.likes) }
            return {
              ...reply,
              replies: (reply.replies || []).map((subReply) => (
                String(subReply._id) === String(subReplyId)
                  ? { ...subReply, likes: updateLikes(subReply.likes) }
                  : subReply
              )),
            }
          }),
        }
      }))
    } catch (likeError) {
      setNotice(likeError.message)
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
    closeRoutedDialog()
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

  const activeVideoCommentCounts = getCommentThreadCounts(activeVideoDialog?.video.comments || [])

  function renderVideoComment(item, commentId, depth = 0, parentReplyId = null) {
    const itemLikes = item.likes || []
    const isLiked = itemLikes.some((like) => getLikeUserId(like) === String(user?._id))
    const itemReplies = item.replies || []
    const replyId = depth === 1 ? item._id : (depth === 2 ? parentReplyId : null)
    const subReplyId = depth > 1 ? item._id : null

    return (
      <article className={`post-thread-item depth-${depth}${itemReplies.length > 0 ? ' has-replies' : ''}`} key={item._id}>
        {depth > 0 && <span className="post-thread-branch" aria-hidden="true" />}
        <div className="post-thread-message">
          <div className="post-thread-identity">
            <img src={getProfileAvatar(item.user)} alt="" />
            {item.user?._id ? (
              <Link className="post-thread-author-link" to={`/for-you/profile/${item.user._id}`}>
                {item.user.username || 'User'}
              </Link>
            ) : (
              <strong>{item.user?.username || 'User'}</strong>
            )}
            <span className="post-thread-number">{depth === 0 ? '' : itemReplies.length || ''}</span>
          </div>
          <div className="post-thread-bubble">
            <p>{item.text}</p>
          </div>
          <div className="post-thread-actions">
            <button
              type="button"
              className={`post-thread-action${isLiked ? ' is-liked' : ''}`}
              aria-label={isLiked ? 'Unlike comment' : 'Like comment'}
              onClick={() => toggleVideoCommentLike(activeVideoDialog.video._id, commentId, replyId || parentReplyId, subReplyId)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
              </svg>
              {itemLikes.length > 0 && <span>{itemLikes.length}</span>}
            </button>
            {depth < 3 && (
              <button
                type="button"
                className="post-thread-action"
                aria-label={`Reply to ${item.user?.username || 'comment'}`}
                onClick={() => {
                  if (!user || user.isAnonymous || !token) {
                    pushRoutedModal(navigate, location, 'video-feed-login-required')
                    return
                  }
                  setReplyTarget({
                    commentId,
                    replyId: depth === 0 ? null : depth === 1 ? item._id : parentReplyId,
                    replyToSubReplyId: depth === 2 ? item._id : null,
                    username: item.user?.username || 'User',
                  })
                  window.requestAnimationFrame(() => document.getElementById('video-comment-input')?.focus())
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14 4 21 11l-7 7v-4C8.5 14 5 16 3 20c0-7 3-11 11-11V4Z" />
                </svg>
              </button>
            )}
            <time>{formatThreadTime(item.createdAt)}</time>
          </div>
          {depth === 0 && itemReplies.length > 0 && (
            <button
              className="post-thread-replies-count"
              type="button"
              onClick={() => {
                if (!user || user.isAnonymous || !token) {
                  pushRoutedModal(navigate, location, 'video-feed-login-required')
                  return
                }
                setReplyTarget({
                  commentId,
                  replyId: null,
                  username: item.user?.username || 'User',
                })
                window.requestAnimationFrame(() => document.getElementById('video-comment-input')?.focus())
              }}
            >
              Replies: {getCommentReplyCount(item)}
            </button>
          )}
        </div>
        {itemReplies.length > 0 && depth < 2 && (
          <div className="post-thread-children">
            {itemReplies.map((reply) => renderVideoComment(
              reply,
              commentId,
              depth + 1,
              depth === 0 ? reply._id : parentReplyId
            ))}
          </div>
        )}
      </article>
    )
  }

  return (
    <main className="videos-page">
      <h1 className="sr-only">Videos</h1>
      {user && !user.isAnonymous && (
        <button
          className="videos-create-button"
          type="button"
          onClick={() => navigate('/video-create-one')}
        >
          Create video
        </button>
      )}
      {isLoading && (
        <div className="videos-scroll videos-loading" role="status" aria-label="Loading videos">
          <VideoFeedItem
            isLoading
            video={null}
            isActive={false}
            index={0}
            registryRef={videoRegistryRef}
          />
        </div>
      )}
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

      {isLoginRequiredOpen && (
        <LoginRequiredModal
          message="Please log in to save videos"
          onClose={closeRoutedDialog}
          onLogin={handleLogin}
        />
      )}

      {activeVideoDialog?.type === 'comment' && (
        <div className="post-action-dialog-backdrop is-post-comments" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRoutedDialog()
        }}>
          <section className="post-action-dialog post-comments-dialog" role="dialog" aria-modal="true" aria-labelledby="video-comment-dialog-title">
            <button className="post-action-dialog-close" type="button" aria-label="Close dialog" onClick={closeRoutedDialog}>×</button>
            <header className="post-comments-mobile-header">
              <button
                className="post-comments-back"
                type="button"
                aria-label="Back to video"
                onClick={closeRoutedDialog}
              >
                <img src={ICONS.backArrow} alt="" />
              </button>
              <img
                className="post-comments-author-avatar"
                src={getProfileAvatar(activeVideoDialog.video.user)}
                alt=""
              />
              <div className="post-comments-heading">
                <h2 id="video-comment-dialog-title">
                  {activeVideoDialog.video.user?.username || 'User'}'s video
                </h2>
                <p>
                  {activeVideoCommentCounts.comments} comments, {activeVideoCommentCounts.replies} replies and {activeVideoCommentCounts.subReplies} sub-replies ({activeVideoCommentCounts.comments + activeVideoCommentCounts.replies + activeVideoCommentCounts.subReplies})
                </p>
              </div>
              <img className="post-comments-search" src={ICONS.search} alt="" />
            </header>
            <h2 className="post-comments-desktop-title">Comments</h2>
            <div className="post-comments-list">
              {(activeVideoDialog.video.comments || []).map((comment) => renderVideoComment(comment, comment._id))}
              {!activeVideoDialog.video.comments?.length && (
                <>
                  <p className="post-dialog-empty">No comments yet.</p>
                  <div className="post-comments-mobile-empty" aria-live="polite">
                    <svg viewBox="0 0 200 150" role="img" aria-label="Empty conversation">
                      <path d="M75 20c-29 0-52 21-52 47 0 14 7 27 19 36l-9 22c-2 5 4 9 9 6l30-16c2 0 4 1 7 1 29 0 52-21 52-48S104 20 75 20Z" />
                      <path d="M121 8c34 0 61 24 61 54 0 17-9 33-24 43l7 27c1 5-4 8-8 5l-30-20c-2 0-4 1-6 1-33 0-60-24-60-55S88 8 121 8Z" />
                    </svg>
                    <h3>No comments yet</h3>
                    <p>Be the first to comment</p>
                  </div>
                </>
              )}
            </div>
            <form className="post-comment-form" onSubmit={addComment}>
              <label className="post-comment-desktop-label" htmlFor="video-comment-input">Add a comment</label>
              {replyTarget && (
                <div className="post-comment-reply-target">
                  Replying to {replyTarget.username}
                  <button
                    type="button"
                    aria-label="Cancel reply"
                    onClick={() => setReplyTarget(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="post-comment-mobile-tools" aria-hidden="true">
                <img src={ICONS.addPhoto} alt="" />
                <img src={ICONS.micGreen} alt="" />
              </div>
              <div className="post-comment-input-row">
                <img className="post-comment-avatar" src={getProfileAvatar(user)} alt="" />
                <textarea
                  id="video-comment-input"
                  ref={commentInputRef}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder={replyTarget
                    ? `Reply to ${replyTarget.username}`
                    : `Comment as ${[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'you'}`}
                  aria-label="Write a comment"
                  maxLength={1000}
                  required
                  disabled={isSubmittingComment}
                  rows={1}
                />
                <button
                  className="post-dialog-submit"
                  type="submit"
                  aria-label={replyTarget ? 'Send reply' : 'Send comment'}
                  disabled={isSubmittingComment}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 20.5 22 12 3 3.5l.5 6.7L16 12l-12.5 1.8-.5 6.7Z" />
                  </svg>
                </button>
              </div>
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

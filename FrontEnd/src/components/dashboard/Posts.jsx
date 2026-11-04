import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import LoginRequiredModal from './LoginRequiredModal'
import PostImageGrid from '../createpost/PostImageGrid'
import ImagePreviewModal from './ImagePreviewModal'
import { DEFAULT_TEXT_POST_BACKGROUND, getTextPostColor, isNoneTextPostBackground } from '../../utils/textPostColors'
import { animate, motion } from 'framer-motion'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'
import SaveToFolderModal from './SaveToFolderModal'

const API_ORIGIN = 'http://localhost:5000'
function formatTimeAgo(createdAt) {
  if (!createdAt) return ''

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'just now'

  const units = [
    ['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60],
  ]

  const [unit, secondsPerUnit] = units.find(([, seconds]) => elapsedSeconds >= seconds) || ['second', 1]
  const value = Math.floor(elapsedSeconds / secondsPerUnit)
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}

function getLikeUserId(like) {
  return String(typeof like === 'object' && like !== null ? like._id : like)
}

function getAvatarSrc(user) {
  return getProfileAvatar(user)
}

const VISIBILITY_ICONS = {
  public: ICONS.publicIcon,
  private: ICONS.lock,
  friends: ICONS.userIcon,
}

function TextPostContent({ text, backgroundColor, onClick, contentRef, maxFontSize = 24 }) {
  const isPlain = isNoneTextPostBackground(backgroundColor)
  const containerRef = React.useRef(null)
  const textRef = React.useRef(null)

  React.useLayoutEffect(() => {
    if (isPlain) return undefined
    const container = containerRef.current
    const textElement = textRef.current
    if (!container || !textElement) return undefined

    function fitText() {
      const styles = window.getComputedStyle(container)
      const availableHeight = container.clientHeight
        - parseFloat(styles.paddingTop)
        - parseFloat(styles.paddingBottom)

      let smallestFontSize = 6
      let largestFontSize = maxFontSize
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const fontSize = (smallestFontSize + largestFontSize) / 2
        textElement.style.fontSize = `${fontSize}px`

        if (textElement.scrollHeight <= availableHeight) {
          smallestFontSize = fontSize
        } else {
          largestFontSize = fontSize
        }
      }

      textElement.style.fontSize = `${smallestFontSize}px`
    }

    fitText()
    const resizeObserver = new ResizeObserver(fitText)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [text, maxFontSize, isPlain])

  return (
    <div
      className={`text-post-content${onClick ? ' text-post-content-interactive' : ''}${isPlain ? ' text-post-content-plain' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Open text post' : undefined}
      onClick={onClick ? (event) => onClick(event.currentTarget) : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(event.currentTarget)
        }
      } : undefined}
      ref={(element) => {
        containerRef.current = element
        if (contentRef) contentRef.current = element
      }}
      style={isPlain ? undefined : {
        backgroundColor,
        color: getTextPostColor(backgroundColor),
      }}
    >
      <p ref={textRef}>{text}</p>
    </div>
  )
}

const TEXT_FLY_IN_EASE = [0.2, 0.75, 0.25, 1]
// Matches the backdrop fade duration: the dark backdrop must be fully up
// before the clone flight begins, so it covers everything behind it.
const BACKDROP_FADE_DURATION = 0.22

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Shared-element fly-in: clones the clicked text card and animates it from its
// post position into the modal's card slot with framer-motion.
async function flyInFromRect(sourceElement, targetElement, originRect) {
  if (!sourceElement || !targetElement || !originRect) return
  if (prefersReducedMotion()) return

  await wait(BACKDROP_FADE_DURATION * 1000)

  const targetRect = targetElement.getBoundingClientRect()
  if (!targetRect.width || !targetRect.height) return

  const clone = sourceElement.cloneNode(true)
  clone.setAttribute('aria-hidden', 'true')
  clone.removeAttribute('role')
  clone.removeAttribute('tabindex')
  Object.assign(clone.style, {
    position: 'fixed',
    top: `${targetRect.top}px`,
    left: `${targetRect.left}px`,
    width: `${targetRect.width}px`,
    height: `${targetRect.height}px`,
    boxSizing: 'border-box',
    margin: '0',
    zIndex: '1300',
    pointerEvents: 'none',
    transformOrigin: 'top left',
  })
  document.body.appendChild(clone)

  try {
    await animate(
      clone,
      {
        transform: [
          `translate3d(${originRect.left - targetRect.left}px, ${originRect.top - targetRect.top}px, 0) scale(${originRect.width / targetRect.width}, ${originRect.height / targetRect.height})`,
          'translate3d(0, 0, 0) scale(1, 1)',
        ],
      },
      { duration: 0.42, ease: TEXT_FLY_IN_EASE },
    )
  } finally {
    clone.remove()
  }
}

function TextPostPreviewModal({ text, backgroundColor, originRect, onClose }) {
  const contentRef = React.useRef(null)
  const [isCloneFlying, setIsCloneFlying] = React.useState(Boolean(originRect) && !prefersReducedMotion())
  const [isClosing, setIsClosing] = React.useState(false)

  React.useEffect(() => {
    if (isClosing) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClosing])

  React.useLayoutEffect(() => {
    let cancelled = false
    // The flying clone carries the text card into place first; only once it
    // lands does the real modal content reveal, so the two never overlap.
    flyInFromRect(originRect?.sourceElement, contentRef.current, originRect).then(() => {
      if (!cancelled) setIsCloneFlying(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    if (isClosing) return
    setIsClosing(true)
  }

  return (
    <motion.div
      className="text-post-preview-backdrop"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      onAnimationComplete={() => {
        if (isClosing) onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose()
      }}
    >
      <motion.section
        className="text-post-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Text post preview"
        initial={{ opacity: 0 }}
        animate={isClosing
          ? { opacity: 0, scale: 0.96 }
          : isCloneFlying
            ? { opacity: 0 }
            : { opacity: 1 }}
        transition={isClosing
          ? { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
          : { duration: 0.18, ease: 'easeOut' }}
      >
        <button className="text-post-preview-close" type="button" aria-label="Close text post preview" onClick={handleClose}>
          ×
        </button>
        <TextPostContent
          text={text}
          backgroundColor={backgroundColor}
          contentRef={contentRef}
          maxFontSize={48}
        />
      </motion.section>
    </motion.div>
  )
}

// While posts are loading, render placeholder rows using the exact same class
// names as real posts. The shimmer CSS in posts.css paints the animation
// directly onto these elements, so the shimmer occupies precisely the space
// the loaded posts will fill — no separate skeleton shapes needed.
function PostSkeleton() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div className="post-wrapper" key={index} aria-hidden="true">
          <div className="left-items">
            <div className="post-header">
              <div className="header-left-items">
                <div className="creator-avata">
                  <img className="creator-icon" alt="" />
                </div>
                <div className="creator-details">
                  <h2>Placeholder</h2>
                  <div className="post-time-visibility">
                    <p className="time-ago">Placeholder</p>
                  </div>
                </div>
              </div>
              <div className="header-right-items">
                <p className="add-friend">Add friend</p>
              </div>
            </div>
            <div className="top"></div>
            <div className="middle">
              <div className="signgle-image"></div>
              <div className="liked-users">
                <img className="liked-img" alt="" />
                <div className="liked-users-list"></div>
              </div>
            </div>
            <div className="bottom"></div>
          </div>
          <div className="right-items e">
            <div className="engage-folder likes">
              <div className="engage-background">
                <img alt="" />
              </div>
              <p className="engage-count">0</p>
            </div>
            <div className="engage-folder comments">
              <div className="engage-background">
                <img alt="" />
              </div>
              <p className="engage-count">0</p>
            </div>
            <div className="engage-folder shares">
              <div className="engage-background">
                <img alt="" />
              </div>
              <p className="engage-count">0</p>
            </div>
            <div className="engage-folder saves">
              <div className="engage-background">
                <img alt="" />
              </div>
              <p className="engage-count">0</p>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function Posts() {
  const baseURL = 'http://localhost:5000/api/posts'
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)
  const previewPostId = new URLSearchParams(location.search).get('post')
  const routedModal = location.state?.routedModal
  const isLoginRequiredOpen = routedModal === 'posts-login-required'
  const isPostPreviewOpen = Boolean(previewPostId)

  const [posts, setPosts] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [openPostMenuId, setOpenPostMenuId] = React.useState(null)
  const postMenuRefs = React.useRef(new Map())
  const [friendIds, setFriendIds] = React.useState(() => new Set(
    (user?.friends || []).map((friend) => String(typeof friend === 'object' ? friend._id : friend))
  ))
  const [activeDialog, setActiveDialog] = React.useState(null)
  const [commentDraft, setCommentDraft] = React.useState('')
  const [reportReason, setReportReason] = React.useState('')
  const [reportDetails, setReportDetails] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [isNoticeExiting, setIsNoticeExiting] = React.useState(false)
  const [imagePreview, setImagePreview] = React.useState(null)
  const [textPostPreview, setTextPostPreview] = React.useState(null)
  const [savedItemFolders, setSavedItemFolders] = React.useState({})
  const [saveModalItem, setSaveModalItem] = React.useState(null)
  const visiblePosts = isPostPreviewOpen
    ? posts.filter((post) => String(post._id) === previewPostId)
    : posts

  const closeCurrentModal = React.useCallback(
    (fallbackUrl = '/for-you') => closeRoutedModal(navigate, location, fallbackUrl),
    [location, navigate]
  )
  const openPostModal = React.useCallback(
    (modalName) => pushRoutedModal(navigate, location, modalName),
    [location, navigate]
  )
  const closeSaveFolderModal = React.useCallback(() => {
    setSaveModalItem(null)
    closeCurrentModal()
  }, [closeCurrentModal])
  const showNotice = React.useCallback((message) => {
    setIsNoticeExiting(false)
    setNotice(message)
  }, [])

  const getPosts = async () => {
    try {
      const res = await fetch(baseURL)
      if (!res.ok) throw new Error('Error getting post!', res.status)
      const data = await res.json()
      setPosts(data)

      const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
      if (user && token) {
        const headers = { Authorization: ['Bearer', token].join(' ') }
        const [profileResponse, savedItemsResponse] = await Promise.all([
          fetch('http://localhost:5000/api/auth/profile', { headers }),
          fetch('http://localhost:5000/api/saves', { headers }),
        ])
        const [profile, savedItems] = await Promise.all([
          profileResponse.json(),
          savedItemsResponse.json(),
        ])
        if (!profileResponse.ok) throw new Error(profile.message || 'Could not load your friend list.')
        if (!savedItemsResponse.ok) throw new Error(savedItems.message || 'Could not load your saved items.')
        setFriendIds(new Set((profile.friends || []).map((friend) => String(typeof friend === 'object' ? friend._id : friend))))
        setSavedItemFolders(Object.fromEntries(
          (savedItems.items || []).map((item) => [`${item.itemType}:${item.itemId}`, item.folderId])
        ))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    getPosts()
  }, [])

  React.useEffect(() => {
    if (!previewPostId || routedModal) return
    const previewUrl = `${location.pathname}${location.search}${location.hash}`
    navigate('/for-you', { replace: true })
    navigate(previewUrl, {
      state: {
        routedModal: 'post-preview',
        routedModalReturn: { url: '/for-you', state: null },
      },
    })
  }, [location.hash, location.pathname, location.search, navigate, previewPostId, routedModal])

  React.useEffect(() => {
    const postId = new URLSearchParams(location.search).get('post')
    if (!postId || posts.length === 0) return
    document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.search, posts])

  React.useEffect(() => {
    if (!isPostPreviewOpen || routedModal !== 'post-preview') return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeCurrentModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeCurrentModal, isPostPreviewOpen, routedModal])

  React.useEffect(() => {
    if (routedModal !== 'comments' && routedModal !== 'report') return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeCurrentModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeCurrentModal, routedModal])

  React.useEffect(() => {
    if (!openPostMenuId) return undefined

    function handlePointerDown(event) {
      if (!postMenuRefs.current.get(openPostMenuId)?.contains(event.target)) {
        setOpenPostMenuId(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpenPostMenuId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPostMenuId])

  React.useEffect(() => {
    if (!notice) return undefined

    const exitTimer = window.setTimeout(() => setIsNoticeExiting(true), 2600)
    const dismissTimer = window.setTimeout(() => setNotice(''), 2950)
    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(dismissTimer)
    }
  }, [notice])

  const isGuestUser = !user || user.isAnonymous === true

  function getAuthHeaders(contentType = 'application/json') {
    const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
    return {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  function requireLogin() {
    if (!isGuestUser) return true
    pushRoutedModal(navigate, location, 'posts-login-required')
    return false
  }

  const toggleLike = async (postId) => {
    if (isGuestUser) {
      pushRoutedModal(navigate, location, 'posts-login-required')
      return
    }

    try {
      const res = await fetch(`${baseURL}/${postId}/like`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Unable to like post.')

      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post._id !== postId) return post

          const existingLikes = Array.isArray(post.likes) ? post.likes : []
          const currentUserId = user?._id
          const alreadyLiked = existingLikes.some((like) => getLikeUserId(like) === String(currentUserId))

          const nextLikes = alreadyLiked
            ? existingLikes.filter((like) => getLikeUserId(like) !== String(currentUserId))
            : [...existingLikes, {
              _id: currentUserId,
              username: user?.username || 'User',
              avatar: user?.avatar || '',
              sex: user?.sex || '',
            }]

          return {
            ...post,
            likes: nextLikes,
            likesCount: data.likesCount ?? nextLikes.length
          }
        })
      )
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleSave(postId) {
    if (!requireLogin()) return
    setSaveModalItem({ itemType: 'post', itemId: postId })
    openPostModal('save-folder')
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
    if (result.itemType === 'post') {
      setPosts((currentPosts) => currentPosts.map((post) => {
        if (String(post._id) !== String(result.itemId)) return post
        const saves = Array.isArray(post.saves) ? post.saves : []
        const alreadySaved = saves.some((savedUserId) => (
          String(typeof savedUserId === 'object' ? savedUserId?._id : savedUserId) === String(user?._id)
        ))
        if (result.isSaved === alreadySaved) return post
        return {
          ...post,
          saves: result.isSaved
            ? [...saves, user._id]
            : saves.filter((savedUserId) => (
              String(typeof savedUserId === 'object' ? savedUserId?._id : savedUserId) !== String(user?._id)
            )),
        }
      }))
    }
    setSaveModalItem(null)
    closeCurrentModal()
    const itemLabel = result.itemType === 'video' ? 'Video' : 'Post'
    showNotice(result.isSaved ? `${itemLabel} saved to folder.` : 'Item removed from saved items.')
  }

  async function toggleFriend(postUserId) {
    if (!requireLogin()) return
    if (!postUserId || String(postUserId) === String(user?._id)) return

    const isFriend = friendIds.has(String(postUserId))
    try {
      const response = await fetch(`http://localhost:5000/api/users/${postUserId}/friend`, {
        method: isFriend ? 'DELETE' : 'PUT',
        headers: getAuthHeaders(),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to update friend status.')

      setFriendIds(new Set((result.friends || []).map((friend) => String(typeof friend === 'object' ? friend._id : friend))))
      showNotice(result.isFriend ? 'Friend added.' : 'Friend removed.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function addComment(event) {
    event.preventDefault()
    if (!requireLogin() || !activeDialog) return

    const text = commentDraft.trim()
    if (!text) return

    try {
      const response = await fetch(`${baseURL}/${activeDialog.postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to add comment.')
      setPosts((currentPosts) => currentPosts.map((post) =>
        post._id === activeDialog.postId
          ? { ...post, comments: [...(post.comments || []), result.comment] }
          : post
      ))
      setCommentDraft('')
      setActiveDialog(null)
      closeCurrentModal()
      showNotice('Comment added.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function submitReport(event) {
    event.preventDefault()
    if (!requireLogin() || !activeDialog) return

    try {
      const response = await fetch(`${baseURL}/${activeDialog.postId}/report`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to submit report.')
      setActiveDialog(null)
      closeCurrentModal()
      setReportReason('')
      setReportDetails('')
      showNotice('Report submitted. Thank you for letting us know.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function recordShare(postId) {
    const response = await fetch(`${baseURL}/${postId}/share`, { method: 'POST' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Unable to record the share.')
    setPosts((currentPosts) => currentPosts.map((post) =>
      post._id === postId ? { ...post, sharesCount: result.sharesCount } : post
    ))
  }

  async function copyPostLink(postId) {
    const url = new URL(`/for-you?post=${encodeURIComponent(postId)}`, window.location.origin).toString()
    if (!navigator.clipboard?.writeText) {
      throw new Error('Copying links is not supported by this browser.')
    }
    await navigator.clipboard.writeText(url)
    await recordShare(postId)
    showNotice('Post link copied.')
  }

  async function sharePost(postId) {
    const url = new URL(`/for-you?post=${encodeURIComponent(postId)}`, window.location.origin).toString()
    const post = posts.find((item) => item._id === postId)
    try {
      if (navigator.share) {
        await navigator.share({
          title: post?.title || 'FeelAmong post',
          text: post?.description || 'See this post on FeelAmong',
          url,
        })
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        showNotice('Post link copied because sharing is not supported by this browser.')
      } else {
        throw new Error('Sharing is not supported by this browser.')
      }
      await recordShare(postId)
    } catch (shareError) {
      if (shareError.name !== 'AbortError') throw shareError
    }
  }

  async function deletePost(postId) {
    if (!requireLogin()) return
    if (!window.confirm('Delete this post? This cannot be undone.')) return

    try {
      const response = await fetch(`${baseURL}/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(null),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to delete post.')
      setPosts((currentPosts) => currentPosts.filter((post) => post._id !== postId))
      showNotice('Post deleted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  const activePost = activeDialog
    ? posts.find((post) => post._id === activeDialog.postId)
    : null

  return (
    <div
      className={`posts-wrapper${isPostPreviewOpen ? ' post-preview-overlay' : ''}`}
      onMouseDown={(event) => {
        if (isPostPreviewOpen && event.target === event.currentTarget) {
          closeCurrentModal()
        }
      }}
    >
      {isPostPreviewOpen && (
        <button
          className="post-preview-close"
          type="button"
          aria-label="Close post preview"
          onClick={() => closeCurrentModal()}
        >
          ×
        </button>
      )}
      {isLoginRequiredOpen && (
        <LoginRequiredModal message="Please login to interact with posts" onClose={() => closeCurrentModal()} onLogin={async () => { await logout(); navigate('/', { replace: true }) }}
        />
      )}

      {error && <div>{error}</div>}
      {notice && (
        <div className={`post-action-notice${isNoticeExiting ? ' is-exiting' : ''}`} role="status">
          {notice}
        </div>
      )}

      <div className={`post-container${isPostPreviewOpen ? ' post-preview-container' : ''}${isLoading ? ' is-loading' : ''}`}>
        {isLoading && !isPostPreviewOpen && (
          <PostSkeleton />
        )}
        {isPostPreviewOpen && !isLoading && !visiblePosts.length && (
          <p className="post-preview-state">This post is unavailable.</p>
        )}
        {visiblePosts.map((post) => {
          const postLikes = Array.isArray(post.likes) ? post.likes : []
          const likedByCurrentUser = Boolean(user && postLikes.some((like) => getLikeUserId(like) === String(user._id)))
          const likeCount = typeof post.likesCount === 'number' ? post.likesCount : (Array.isArray(post.likes) ? post.likes.length : 0)
          const visibility = VISIBILITY_ICONS[post.visibility] ? post.visibility : 'public'
          const isTextPost = post.postType === 'text'
          const isPostCreator = Boolean(user?._id) && String(post.user?._id) === String(user._id)
          const isPostCreatorFriend = friendIds.has(String(post.user?._id))
          const savedItemKey = `post:${post._id}`
          const savedByCurrentUser = Boolean(user) && (
            Object.prototype.hasOwnProperty.call(savedItemFolders, savedItemKey)
            || (Array.isArray(post.saves) && post.saves.some((savedId) => (
              String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user._id)
            )))
          )
          const postTitle = typeof post.title === 'string' ? post.title.trim() : ''
          const postDescription = typeof post.description === 'string' ? post.description.trim() : ''
          const textPostBackground = /^#[0-9a-f]{6}$/i.test(post.backgroundColor || '')
            ? post.backgroundColor
            : isNoneTextPostBackground(post.backgroundColor)
              ? 'none'
              : DEFAULT_TEXT_POST_BACKGROUND
          const postImages = Array.isArray(post.images)
            ? post.images.filter((image) => typeof image === 'string').map((image) => ({
              src: image.startsWith('/') ? `${API_ORIGIN}${image}` : image,
            }))
            : []

          return (
            <div
              id={`post-${post._id}`}
              key={post._id}
              className={`post-wrapper${isPostPreviewOpen ? ' post-preview-item' : ''}`}
            >
              <div className="left-items">
                <div className="post-header">
                  <div className="header-left-items">
                    <div className="creator-avata">
                      <img className='creator-icon' src={getProfileAvatar(post.user)} alt={post.user?.username || 'Creator'} />
                    </div>
                    <div className="creator-details">
                      {post.user?._id ? (
                        <h2>
                          <Link className="post-creator-link" to={`/for-you/profile/${post.user._id}`}>
                            {post.user.username || 'Unknown creator'}
                          </Link>
                        </h2>
                      ) : (
                        <h2>{post.user?.username || 'Unknown creator'}</h2>
                      )}
                      <div className="post-time-visibility">
                        <p className='time-ago'>{formatTimeAgo(post.createdAt)}</p>
                        <img className="post-visibility-icon" src={VISIBILITY_ICONS[visibility]} alt="" title={`${visibility[0].toUpperCase()}${visibility.slice(1)} post`} aria-label={`${visibility[0].toUpperCase()} post`} />
                      </div>
                    </div>
                  </div>

                  <div className="header-right-items">
                    <p className='add-friend'>Add friend</p>
                  </div>
                </div>

                <div className="top"></div>
                <div className="middle">
                  {isTextPost
                    ? postDescription && (
                      <TextPostContent text={postDescription} backgroundColor={textPostBackground} onClick={(element) => {
                        const { left, top, width, height } = element.getBoundingClientRect(); setTextPostPreview({
                          text: postDescription, backgroundColor: textPostBackground, originRect: { left, top, width, height, sourceElement: element },
                        })
                        openPostModal('text-preview')
                      }}
                      />
                    )
                    : (
                      <>
                        {postTitle && <p>Title: {postTitle}</p>}
                        {postImages.length > 0
                          ? <PostImageGrid images={postImages} className="post-image-grid-feed" onImageClick={(index, tile) => {
                            const { left, top, width, height } = tile.getBoundingClientRect(); setImagePreview({
                              images: postImages, initialIndex: index, originRect: { left, top, width, height, sourceElement: tile },
                            })
                            openPostModal('image-preview')
                          }}
                          />
                          : <div className="signgle-image" style={{ background: post.color }}></div>}
                        {postDescription && <p>Description: {postDescription}</p>}
                      </>
                    )}
                  <div className='liked-users'>
                    <img className='liked-img' src={ICONS.likedusersicon} alt="" />
                    <div className="liked-users-list" role="list" aria-label={`${likeCount} people liked this post`}>
                      {postLikes.map((like, index) => {
                        const liker = typeof like === 'object' && like !== null ? like : null
                        const likerName = liker?.username || 'User'
                        return (
                          <img className="liked-user-avatar" key={getLikeUserId(like) || index} src={getAvatarSrc(liker)} alt="" title={likerName} role="listitem" onError={(event) => {
                            event.currentTarget.onerror = null; event.currentTarget.src = getProfileAvatar(liker)
                          }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="bottom"></div>
              </div>

              <div className="right-items e">
                <div onClick={() => toggleLike(post._id)} className="engage-folder likes">
                  <div className="engage-background">
                    <img src={likedByCurrentUser ? ICONS.liked : ICONS.like} alt="Like" />
                  </div>
                  <p className='engage-count'>{likeCount}</p>
                </div>
                <button className="engage-folder comments" type="button" onClick={() => {
                  if (!requireLogin()) return; setCommentDraft(''); setActiveDialog({ type: 'comment', postId: post._id }); openPostModal('comments'); setOpenPostMenuId(null);
                }}>
                  <div className="engage-background">
                    <img src={ICONS.comment} alt="" />
                  </div>
                  <p className='engage-count'>{post.comments?.length || 0}</p>
                </button>
                <button className="engage-folder shares" type="button" onClick={() => {
                  setOpenPostMenuId(null)
                  sharePost(post._id).catch((shareError) => setError(shareError.message))
                }}>
                  <div className="engage-background">
                    <img src={ICONS.share} alt="" />
                  </div>
                  <p className='engage-count'>{post.sharesCount || 0}</p>
                </button>
                <button className="engage-folder saves" type="button" onClick={() => toggleSave(post._id)}>
                  <div className="engage-background">
                    <img src={savedByCurrentUser ? ICONS.saved : ICONS.save} alt="" />
                  </div>
                  <p className='engage-count'>{post.saves?.length || 0}</p>
                </button>
                <div
                  className="post-more-menu"
                  ref={(element) => {
                    if (element) postMenuRefs.current.set(post._id, element)
                    else postMenuRefs.current.delete(post._id)
                  }}
                >
                  <button className="engage-folder post-more-trigger" type="button" aria-label="More post options" aria-expanded={openPostMenuId === post._id} aria-haspopup="menu" onClick={() => setOpenPostMenuId((currentId) => currentId === post._id ? null : post._id)}
                  >
                    <span className="engage-background">
                      <img src={ICONS.more} alt="" />
                    </span>
                  </button>
                  {openPostMenuId === post._id && (
                    <ul className="post-more-options" role="menu" aria-label="Post options">
                      <li role="none">
                        <button className={`post-more-option ${likedByCurrentUser ? 'is-active' : ''}`} type="button" role="menuitem" onClick={() => {
                          setOpenPostMenuId(null)
                          toggleLike(post._id)
                        }}>
                          <img src={likedByCurrentUser ? ICONS.liked : ICONS.like} alt="" />
                          <span>{likedByCurrentUser ? 'Liked' : 'Like'}</span>
                        </button>
                      </li>
                      <li role="none">
                        <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                          if (!requireLogin()) return; setCommentDraft(''); setActiveDialog({ type: 'comment', postId: post._id }); openPostModal('comments'); setOpenPostMenuId(null);
                        }}>
                          <img src={ICONS.comment} alt="" />
                          <span>Comment</span>
                        </button>
                      </li>
                      <li role="none">
                        <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                          setOpenPostMenuId(null)
                          sharePost(post._id).catch((shareError) => setError(shareError.message))
                        }}>
                          <img src={ICONS.share} alt="" />
                          <span>Share</span>
                        </button>
                      </li>
                      <li role="none">
                        <button className={`post-more-option ${savedByCurrentUser ? 'is-active' : ''}`} type="button" role="menuitem" onClick={() => {
                          setOpenPostMenuId(null)
                          toggleSave(post._id)
                        }}>
                          <img src={savedByCurrentUser ? ICONS.saved : ICONS.save} alt="" />
                          <span>{savedByCurrentUser ? 'Saved' : 'Save'}</span>
                        </button>
                      </li>
                      {isPostCreator && (
                        <li role="none">
                          <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                            setOpenPostMenuId(null)
                            navigate(`/post-create-one?type=${isTextPost ? 'text' : 'image'}&edit=${post._id}`)
                          }}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                        </li>
                      )}
                      {isPostCreator && (
                        <li role="none">
                          <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                            setOpenPostMenuId(null)
                            deletePost(post._id)
                          }}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </li>
                      )}
                      {!isPostCreator && (
                        <li role="none">
                          <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                            setOpenPostMenuId(null)
                            toggleFriend(post.user?._id)
                          }}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="10" cy="7" r="4" />
                              <path d="M19 8v6M22 11h-6" />
                            </svg>
                            <span>{isPostCreatorFriend ? 'Unfriend' : 'Add friend'}</span>
                          </button>
                        </li>
                      )}
                      <li role="none">
                        <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                          if (!requireLogin()) return; setReportReason(''); setReportDetails(''); setActiveDialog({ type: 'report', postId: post._id }); openPostModal('report'); setOpenPostMenuId(null);
                        }}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 9v4" />
                            <path d="M12 17h.01" />
                            <path d="M10.3 3.9 1.8 18.2A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                          </svg>
                          <span>Report</span>
                        </button>
                      </li>
                      <li role="none">
                        <button className="post-more-option" type="button" role="menuitem" onClick={() => {
                          setOpenPostMenuId(null)
                          copyPostLink(post._id).catch((copyError) => setError(copyError.message))
                        }}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="8" y="8" width="13" height="13" rx="2" />
                            <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                          </svg>
                          <span>Copy link</span>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {activeDialog && activePost && (routedModal === 'comments' || routedModal === 'report') && (
        <div className="post-action-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCurrentModal()
        }}>
          <section className="post-action-dialog" role="dialog" aria-modal="true" aria-labelledby="post-action-dialog-title">
            <button className="post-action-dialog-close" type="button" aria-label="Close dialog" onClick={() => closeCurrentModal()}>×</button>
            {activeDialog.type === 'comment' ? (
              <>
                <h2 id="post-action-dialog-title">Comments</h2>
                <div className="post-comments-list">
                  {(activePost.comments || []).map((comment) => (
                    <article className="post-comment" key={comment._id}>
                      <strong>{comment.user?.username || 'User'}</strong>
                      <p>{comment.text}</p>
                    </article>
                  ))}
                  {!activePost.comments?.length && <p className="post-dialog-empty">No comments yet.</p>}
                </div>
                <form onSubmit={addComment}>
                  <label htmlFor="post-comment-input">Add a comment</label>
                  <textarea id="post-comment-input" value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={1000} required rows={3}
                  />
                  <button className="post-dialog-submit" type="submit">Comment</button>
                </form>
              </>
            ) : (
              <>
                <h2 id="post-action-dialog-title">Report post</h2>
                <p>Choose the reason that best describes your concern.</p>
                <form onSubmit={submitReport}>
                  <label htmlFor="post-report-reason">Reason</label>
                  <select id="post-report-reason" value={reportReason} onChange={(event) => setReportReason(event.target.value)} required>
                    <option value="">Select a reason</option>
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Inappropriate content">Inappropriate content</option>
                    <option value="False information">False information</option>
                    <option value="Other">Other</option>
                  </select>
                  <label htmlFor="post-report-details">Details (optional)</label>
                  <textarea id="post-report-details" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={1000} rows={3}
                  />
                  <button className="post-dialog-submit" type="submit">Submit report</button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {imagePreview && routedModal === 'image-preview' && (
        <ImagePreviewModal images={imagePreview.images} initialIndex={imagePreview.initialIndex} originRect={imagePreview.originRect} onClose={() => closeCurrentModal()}
        />
      )}
      {textPostPreview && routedModal === 'text-preview' && (
        <TextPostPreviewModal text={textPostPreview.text} backgroundColor={textPostPreview.backgroundColor} originRect={textPostPreview.originRect} onClose={() => closeCurrentModal()}
        />
      )}
      {saveModalItem && routedModal === 'save-folder' && (
        <SaveToFolderModal itemType={saveModalItem.itemType} itemId={saveModalItem.itemId} currentFolderId={savedItemFolders[`${saveModalItem.itemType}:${saveModalItem.itemId}`]} isSaved={Object.prototype.hasOwnProperty.call(savedItemFolders, `${saveModalItem.itemType}:${saveModalItem.itemId}`
        ) || posts.some((post) => (
          String(post._id) === String(saveModalItem.itemId)
          && post.saves?.some((savedId) => (
            String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
          ))
        ))}
          onClose={closeSaveFolderModal}
          onSaved={handleSavedItem}
        />
      )}
    </div>
  )
}

export default Posts
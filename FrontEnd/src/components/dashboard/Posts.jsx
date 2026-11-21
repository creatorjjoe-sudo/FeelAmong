import React, { useContext } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import LoginRequiredModal from './LoginRequiredModal'
import PostImageGrid from '../createpost/PostImageGrid'
import ImagePreviewModal from './ImagePreviewModal'
import { DEFAULT_TEXT_POST_BACKGROUND, getTextPostColor, isNoneTextPostBackground, isValidTextPostBackground } from '../../utils/textPostColors'
import { animate, motion } from 'framer-motion'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { closeRoutedModal, pushRoutedModal } from '../../utils/routedModal'

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

function formatThreadTime(createdAt) {
  const label = formatTimeAgo(createdAt)
  const match = label.match(/^(\d+) (year|month|day|hour|minute)s? ago$/)
  if (!match) return label
  const unitShort = {
    year: 'y',
    month: 'mo',
    day: 'd',
    hour: 'h',
    minute: 'm',
  }[match[2]]
  return `${match[1]}${unitShort}`
}

function getLikeUserId(like) {
  return String(typeof like === 'object' && like !== null ? like._id : like)
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
        background: backgroundColor,
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
  const { user, personalUser, switchToPersonal, logout } = useContext(AuthContext)
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
  const commentInputRef = React.useRef(null)
  const [replyTarget, setReplyTarget] = React.useState(null)
  const [isSubmittingComment, setIsSubmittingComment] = React.useState(false)
  const [shareDescription, setShareDescription] = React.useState('')
  const [shareVisibility, setShareVisibility] = React.useState('public')
  const [isSubmittingShare, setIsSubmittingShare] = React.useState(false)
  const [isCompanySharePromptOpen, setIsCompanySharePromptOpen] = React.useState(false)
  const [companySharePromptError, setCompanySharePromptError] = React.useState('')
  const [shareLinkCopied, setShareLinkCopied] = React.useState(false)
  const [reportReason, setReportReason] = React.useState('')
  const [reportDetails, setReportDetails] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [isNoticeExiting, setIsNoticeExiting] = React.useState(false)
  const [imagePreview, setImagePreview] = React.useState(null)
  const [textPostPreview, setTextPostPreview] = React.useState(null)
  const [savedItemFolders, setSavedItemFolders] = React.useState({})
  React.useLayoutEffect(() => {
    const textarea = commentInputRef.current
    if (!textarea) return

    textarea.style.height = '40px'
    const contentHeight = textarea.scrollHeight
    const maxHeight = 100
    textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`
    textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
  }, [activeDialog, commentDraft])
  const visiblePosts = isPostPreviewOpen
    ? posts.filter((post) => String(post._id) === previewPostId)
    : posts

  const closeCurrentModal = React.useCallback(
    (fallbackUrl = '/for-you') => {
      setIsCompanySharePromptOpen(false)
      closeRoutedModal(navigate, location, fallbackUrl)
    },
    [location, navigate]
  )
  const openPostModal = React.useCallback(
    (modalName) => pushRoutedModal(navigate, location, modalName),
    [location, navigate]
  )
  const showNotice = React.useCallback((message) => {
    setIsNoticeExiting(false)
    setNotice(message)
  }, [])

  React.useEffect(() => {
    if (!isCompanySharePromptOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsCompanySharePromptOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isCompanySharePromptOpen])

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
    if (!postId || isPostPreviewOpen || posts.length === 0) return
    document.getElementById(`post-${postId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isPostPreviewOpen, location.search, posts])

  React.useEffect(() => {
    if (!isPostPreviewOpen || routedModal !== 'post-preview') return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeCurrentModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeCurrentModal, isPostPreviewOpen, routedModal])

  React.useEffect(() => {
    if (routedModal !== 'comments' && routedModal !== 'report' && routedModal !== 'share-post') return undefined
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
    const post = posts.find((candidate) => String(candidate._id) === String(postId))
    const authorName = post?.user?.username || post?.user?.firstName || post?.company?.name || 'this user'
    navigate('/for-you/save', {
      state: {
        itemType: 'post',
        itemId: postId,
        authorName,
        currentFolderId: savedItemFolders[`post:${postId}`] || '',
        isSaved: Object.prototype.hasOwnProperty.call(savedItemFolders, `post:${postId}`)
          || Boolean(post?.saves?.some((savedId) => (
            String(typeof savedId === 'object' ? savedId?._id : savedId) === String(user?._id)
          ))),
      },
    })
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
    showNotice(result.isSaved ? `${itemLabel} saved to container.` : 'Item removed from saved items.')
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
    if (!requireLogin() || !activeDialog || isSubmittingComment) return

    const text = commentDraft.trim()
    if (!text) return

    setIsSubmittingComment(true)
    try {
      const endpoint = replyTarget
        ? `${baseURL}/${activeDialog.postId}/comments/${replyTarget.commentId}/replies`
        : `${baseURL}/${activeDialog.postId}/comments`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text,
          ...(replyTarget?.replyId ? { parentReplyId: replyTarget.replyId } : {}),
          ...(replyTarget?.replyToSubReplyId ? { replyToSubReplyId: replyTarget.replyToSubReplyId } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to add comment.')
      setPosts((currentPosts) => currentPosts.map((post) => {
        if (String(post._id) !== String(activeDialog.postId)) return post

        if (!replyTarget) {
          return { ...post, comments: [...(post.comments || []), result.comment] }
        }

        return {
          ...post,
          comments: (post.comments || []).map((comment) => {
            if (String(comment._id) !== String(result.commentId)) return comment
            if (!result.parentReplyId) {
              return { ...comment, replies: [...(comment.replies || []), result.reply] }
            }
            return {
              ...comment,
              replies: (comment.replies || []).map((reply) => (
                String(reply._id) === String(result.parentReplyId)
                  ? { ...reply, replies: [...(reply.replies || []), result.reply] }
                  : reply
              )),
            }
          }),
        }
      }))
      setCommentDraft('')
      setReplyTarget(null)
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function toggleCommentLike(postId, commentId, replyId = null, subReplyId = null) {
    if (!requireLogin()) return

    try {
      const response = await fetch(`${baseURL}/${postId}/comments/${commentId}/like`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...(replyId ? { replyId } : {}),
          ...(subReplyId ? { subReplyId } : {}),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to update comment like.')

      const currentUserId = String(user?._id)
      const currentUser = {
        _id: currentUserId,
        username: user?.username || 'User',
        avatar: user?.avatar || '',
        sex: user?.sex || '',
      }
      const updateLikes = (likes = []) => (
        result.isLiked
          ? [...likes.filter((like) => getLikeUserId(like) !== currentUserId), currentUser]
          : likes.filter((like) => getLikeUserId(like) !== currentUserId)
      )

      setPosts((currentPosts) => currentPosts.map((post) => {
        if (String(post._id) !== String(postId)) return post
        return {
          ...post,
          comments: (post.comments || []).map((comment) => {
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
          }),
        }
      }))
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
    if (!requireLogin()) return
    setError('')
    setIsCompanySharePromptOpen(false)
    setCompanySharePromptError('')
    setShareDescription('')
    setShareLinkCopied(false)
    setShareVisibility('public')
    setActiveDialog({ type: 'share', postId })
    openPostModal('share-post')
    setOpenPostMenuId(null)
  }

  async function submitSharedPost(event) {
    event.preventDefault()
    if (!requireLogin() || !activeDialog || isSubmittingShare) return
    if (user?.isCompany) {
      setCompanySharePromptError('')
      setIsCompanySharePromptOpen(true)
      return
    }

    setIsSubmittingShare(true)
    setError('')
    try {
      const response = await fetch(`${baseURL}/${activeDialog.postId}/repost`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          description: shareDescription.trim(),
          visibility: shareVisibility,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Unable to share this post.')

      setPosts((currentPosts) => [
        result.post,
        ...currentPosts.map((post) => (
          String(post._id) === String(result.sourcePostId)
            ? { ...post, sharesCount: result.sharesCount }
            : post
        )),
      ])
      setActiveDialog(null)
      setShareDescription('')
      closeCurrentModal()
      showNotice('Post shared.')
    } catch (shareError) {
      setError(shareError.message || 'Unable to share this post.')
    } finally {
      setIsSubmittingShare(false)
    }
  }

  function switchToPersonalToShare() {
    try {
      if (!personalUser) throw new Error('Your main account is unavailable. Please sign in again.')
      switchToPersonal()
      setIsCompanySharePromptOpen(false)
      setCompanySharePromptError('')
      showNotice('Switched to your main account. Select Share again to share this post.')
    } catch (switchError) {
      setCompanySharePromptError(switchError.message || 'Could not switch to your main account.')
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
  const shareSourcePost = activeDialog?.type === 'share' ? activePost : null
  const activeCommentCounts = getCommentThreadCounts(activePost?.comments || [])

  function renderThreadItem(item, commentId, depth = 0, parentReplyId = null) {
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
            <img src={getAvatarSrc(item.user)} alt="" />
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
              onClick={() => toggleCommentLike(activeDialog.postId, commentId, replyId || parentReplyId, subReplyId)}
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
                  if (!requireLogin()) return
                  setReplyTarget({
                    commentId,
                    replyId: depth === 0 ? null : depth === 1 ? item._id : parentReplyId,
                    replyToSubReplyId: depth === 2 ? item._id : null,
                    username: item.user?.username || 'User',
                  })
                  window.requestAnimationFrame(() => document.getElementById('post-comment-input')?.focus())
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
                if (!requireLogin()) return
                setReplyTarget({
                  commentId,
                  replyId: null,
                  username: item.user?.username || 'User',
                })
                window.requestAnimationFrame(() => document.getElementById('post-comment-input')?.focus())
              }}
            >
              Replies: {getCommentReplyCount(item)}
            </button>
          )}
        </div>
        {itemReplies.length > 0 && depth < 2 && (
          <div className="post-thread-children">
            {itemReplies.map((reply) => renderThreadItem(
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

      {error && activeDialog?.type !== 'share' && <div role="alert">{error}</div>}
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
          const commentCounts = getCommentThreadCounts(post.comments || [])
          const commentCount = commentCounts.comments + commentCounts.replies + commentCounts.subReplies
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
          const shareCaption = typeof post.shareCaption === 'string' ? post.shareCaption.trim() : ''
          const sharedPost = post.sharedPost
          const contentPost = sharedPost || post
          const isTextContentPost = contentPost.postType === 'text'
          const postTitle = typeof contentPost.title === 'string' ? contentPost.title.trim() : ''
          const postDescription = typeof contentPost.description === 'string' ? contentPost.description.trim() : ''
          const textPostBackground = isValidTextPostBackground(contentPost.backgroundColor)
            ? contentPost.backgroundColor
            : DEFAULT_TEXT_POST_BACKGROUND
          const postImages = Array.isArray(contentPost.images)
            ? contentPost.images.filter((image) => typeof image === 'string').map((image) => ({
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
                      {sharedPost && <p className="post-shared-byline">shared a post</p>}
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
                  {sharedPost ? (
                    <div className="post-shared-content">
                      {shareCaption && <p className="post-share-caption">{shareCaption}</p>}
                      <div className="post-shared-original-header">
                        <img src={getProfileAvatar(sharedPost.user)} alt="" />
                        {sharedPost.user?._id ? (
                          <Link to={`/for-you/profile/${sharedPost.user._id}`}>
                            {sharedPost.user.username || 'Original creator'}
                          </Link>
                        ) : (
                          <strong>{sharedPost.user?.username || 'Original creator'}</strong>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {isTextContentPost
                    ? (
                      <>
                        {postDescription && (
                          <TextPostContent text={postDescription} backgroundColor={textPostBackground} onClick={(element) => {
                            const { left, top, width, height } = element.getBoundingClientRect(); setTextPostPreview({
                              text: postDescription, backgroundColor: textPostBackground, originRect: { left, top, width, height, sourceElement: element },
                            })
                            openPostModal('text-preview')
                          }}
                          />
                        )}
                        {postImages.length > 0 && (
                          <PostImageGrid images={postImages} className="post-image-grid-feed" onImageClick={(index, tile) => {
                            const { left, top, width, height } = tile.getBoundingClientRect(); setImagePreview({
                              images: postImages, initialIndex: index, originRect: { left, top, width, height, sourceElement: tile },
                            })
                            openPostModal('image-preview')
                          }}
                          />
                        )}
                      </>
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
                          : <div className="signgle-image" style={{ background: contentPost.color }}></div>}
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
                  if (!requireLogin()) return; setCommentDraft(''); setReplyTarget(null); setActiveDialog({ type: 'comment', postId: post._id }); openPostModal('comments'); setOpenPostMenuId(null);
                }}>
                  <div className="engage-background">
                    <img src={ICONS.comment} alt="" />
                  </div>
                  <p className='engage-count'>{commentCount}</p>
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
                          if (!requireLogin()) return; setCommentDraft(''); setReplyTarget(null); setActiveDialog({ type: 'comment', postId: post._id }); openPostModal('comments'); setOpenPostMenuId(null);
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
                      {isPostCreator && !sharedPost && (
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
      {activeDialog && activePost && (routedModal === 'comments' || routedModal === 'report' || routedModal === 'share-post') && (
        <div
          className={`post-action-dialog-backdrop${activeDialog.type === 'comment' ? ' is-post-comments' : ''}${activeDialog.type === 'share' ? ' is-post-share' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCurrentModal()
          }}
        >
          <section
            className={`post-action-dialog${activeDialog.type === 'comment' ? ' post-comments-dialog' : ''}${activeDialog.type === 'share' ? ' post-share-dialog' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={activeDialog.type === 'comment' ? 'Post comments' : activeDialog.type === 'share' ? 'Share post' : 'Report post'}
          >
            <button className="post-action-dialog-close" type="button" aria-label="Close dialog" onClick={() => closeCurrentModal()}>×</button>
            {activeDialog.type === 'share' ? (
              <>
                <header className="post-share-header">
                  <button
                    className="post-share-back"
                    type="button"
                    aria-label="Back to post"
                    onClick={() => closeCurrentModal()}
                  >
                    <img src={ICONS.backArrow} alt="" />
                  </button>
                  <h2>Share Post</h2>
                </header>
                <div className="post-share-content">
                  <h3>Create post</h3>
                  <form className="post-share-form" onSubmit={submitSharedPost}>
                    {error && <p className="post-share-error" role="alert">{error}</p>}
                    <div className="post-share-identity">
                      <img className="post-share-avatar" src={getProfileAvatar(user)} alt="" />
                      <div className="post-share-user">
                        <strong>{user?.username || 'Feelamonger'}</strong>
                        <label className="post-share-visibility">
                          <img src={VISIBILITY_ICONS[shareVisibility]} alt="" />
                          <select
                            aria-label="Post visibility"
                            value={shareVisibility}
                            onChange={(event) => setShareVisibility(event.target.value)}
                            disabled={isSubmittingShare}
                          >
                            <option value="public">Public</option>
                            <option value="friends">Friends</option>
                            <option value="private">Only me</option>
                          </select>
                        </label>
                      </div>
                      <img className="post-share-original-avatar" src={getProfileAvatar(shareSourcePost?.user)} alt="" />
                      <button className="post-share-submit" type="submit" disabled={isSubmittingShare}>
                        {isSubmittingShare ? 'Sharing...' : 'Share'}
                      </button>
                    </div>
                    <textarea
                      className="post-share-description"
                      value={shareDescription}
                      onChange={(event) => setShareDescription(event.target.value)}
                      placeholder="Give a description to this post..."
                      aria-label="Description for shared post"
                      maxLength={1000}
                      disabled={isSubmittingShare}
                    />
                    <button
                      className="post-share-copy-link"
                      type="button"
                      onClick={() => copyPostLink(activeDialog.postId)
                        .then(() => setShareLinkCopied(true))
                        .catch((copyError) => setError(copyError.message))}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="8" y="8" width="13" height="13" rx="2" />
                        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                      </svg>
                      Copy link
                    </button>
                    {shareLinkCopied && <span className="post-share-link-copied" role="status">Link copied</span>}
                  </form>
                </div>
              </>
            ) : activeDialog.type === 'comment' ? (
              <>
                <header className="post-comments-mobile-header">
                  <button
                    className="post-comments-back"
                    type="button"
                    aria-label="Back to post"
                    onClick={() => closeCurrentModal()}
                  >
                    <img src={ICONS.backArrow} alt="" />
                  </button>
                  <img
                    className="post-comments-author-avatar"
                    src={getAvatarSrc(activePost.user)}
                    alt=""
                  />
                  <div className="post-comments-heading">
                    <h2 id="post-action-dialog-title">
                      {activePost.user?.username || 'User'}'s post
                    </h2>
                    <p>
                      {activeCommentCounts.comments} comments, {activeCommentCounts.replies} replies and {activeCommentCounts.subReplies} sub-replies ({activeCommentCounts.comments + activeCommentCounts.replies + activeCommentCounts.subReplies})
                    </p>
                  </div>
                  <img className="post-comments-search" src={ICONS.search} alt="" />
                </header>
                <h2 className="post-comments-desktop-title">Comments</h2>
                <div className="post-comments-list">
                  {(activePost.comments || []).map((comment) => renderThreadItem(comment, comment._id))}
                  {!activePost.comments?.length && (
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
                  <label className="post-comment-desktop-label" htmlFor="post-comment-input">Add a comment</label>
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
                      id="post-comment-input"
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
      {isCompanySharePromptOpen && activeDialog?.type === 'share' && routedModal === 'share-post' && createPortal(
        <div
          className="post-company-share-prompt-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCompanySharePromptOpen(false)
          }}
        >
          <section
            className="post-company-share-prompt"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="post-company-share-prompt-title"
            aria-describedby="post-company-share-prompt-description"
          >
            <h2 id="post-company-share-prompt-title">Switch to your main account?</h2>
            <p id="post-company-share-prompt-description">
              Company accounts cannot create posts right now. You must switch to your main account to share this post. Company posting may be available in the future.
            </p>
            {companySharePromptError && <p className="post-company-share-prompt-error" role="alert">{companySharePromptError}</p>}
            <div className="post-company-share-prompt-actions">
              <button
                type="button"
                className="post-company-share-prompt-cancel"
                onClick={() => setIsCompanySharePromptOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="post-company-share-prompt-switch"
                autoFocus
                onClick={switchToPersonalToShare}
              >
                Switch account
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
      {imagePreview && routedModal === 'image-preview' && (
        <ImagePreviewModal images={imagePreview.images} initialIndex={imagePreview.initialIndex} originRect={imagePreview.originRect} onClose={() => closeCurrentModal()}
        />
      )}
      {textPostPreview && routedModal === 'text-preview' && (
        <TextPostPreviewModal text={textPostPreview.text} backgroundColor={textPostPreview.backgroundColor} originRect={textPostPreview.originRect} onClose={() => closeCurrentModal()}
        />
      )}
    </div>
  )
}

export default Posts
import React from 'react'
import { useContext } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import LoginRequiredModal from '../components/dashboard/LoginRequiredModal'
import '../styles/pages/profile.css'
import { getProfileAvatar } from '../utils/profileAvatar'
import { getTextPostColor } from '../utils/textPostColors'
import { closeRoutedModal, pushRoutedModal } from '../utils/routedModal'
import { animatePreviewElement } from '../utils/animatePreviewElement'

const API_ORIGIN = 'http://localhost:5000'

function resolveImageUrl(image) {
  if (typeof image !== 'string' || !image) return ''
  return image.startsWith('/') ? `${API_ORIGIN}${image}` : image
}

function ProfilePage() {
  const { user, login, logout } = useContext(AuthContext)
  const { userId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isAvatarPreviewOpen = location.state?.routedModal === 'profile-avatar-preview'
  const isEditProfileOpen = location.state?.routedModal === 'profile-edit'
  const isReportProfileOpen = location.state?.routedModal === 'profile-report'
  const isLoginRequiredOpen = location.state?.routedModal === 'profile-login-required'
  const isOwnProfile = !userId || String(userId) === String(user?._id)
  const [profile, setProfile] = React.useState(isOwnProfile ? user : null)
  const [posts, setPosts] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [isFriend, setIsFriend] = React.useState(
    Boolean(user?.friends?.some((friend) => String(typeof friend === 'object' ? friend._id : friend) === String(userId)))
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [editDraft, setEditDraft] = React.useState({})
  const [avatarSelection, setAvatarSelection] = React.useState(null)
  const [editError, setEditError] = React.useState('')
  const [avatarOriginRect, setAvatarOriginRect] = React.useState(null)
  const avatarImageRef = React.useRef(null)
  const avatarPreviewImageRef = React.useRef(null)
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)
  const [reportReason, setReportReason] = React.useState('')
  const [reportDetails, setReportDetails] = React.useState('')

  React.useEffect(() => () => {
    if (avatarSelection) URL.revokeObjectURL(avatarSelection.previewUrl)
  }, [avatarSelection])

  React.useEffect(() => {
    if (!isAvatarPreviewOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeRoutedModal(navigate, location)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAvatarPreviewOpen, location, navigate])

  React.useEffect(() => {
    let isActive = true

    async function loadProfile() {
      try {
        if (!userId && !user?._id) throw new Error('Log in to view your profile.')
        const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
        const [postsResponse, profileResponse, viewerResponse] = await Promise.all([
          fetch(`${API_ORIGIN}/api/posts`),
          isOwnProfile && user && token
            ? fetch(`${API_ORIGIN}/api/auth/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            : fetch(`${API_ORIGIN}/api/users/${userId || user?._id}`),
          !isOwnProfile && user && token
            ? fetch(`${API_ORIGIN}/api/auth/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            : Promise.resolve(null),
        ])

        if (!postsResponse.ok) throw new Error('Could not load your posts.')
        const allPosts = await postsResponse.json()
        const profileData = await profileResponse.json()
        if (!profileResponse.ok) throw new Error(profileData.message || 'Could not load this profile.')
        const currentProfile = profileData
        let viewerProfile = user
        if (viewerResponse) {
          const viewerData = await viewerResponse.json()
          if (!viewerResponse.ok) throw new Error(viewerData.message || 'Could not check your friend status.')
          viewerProfile = viewerData
        }

        if (!isActive) return
        setProfile(currentProfile)
        setEditDraft({
          firstName: currentProfile.firstName || '',
          lastName: currentProfile.lastName || '',
          bio: currentProfile.bio || '',
          from: currentProfile.from || '',
          status: currentProfile.status || '',
        })
        setIsFriend(Boolean(viewerProfile?.friends?.some(
          (friend) => String(typeof friend === 'object' ? friend._id : friend) === String(currentProfile?._id)
        )))
        setPosts(allPosts.filter((post) => {
          const belongsToProfile = String(post.user?._id || post.user) === String(currentProfile?._id)
          return belongsToProfile && (isOwnProfile || post.visibility === 'public')
        }))
      } catch (loadError) {
        if (isActive) setError(loadError.message)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadProfile()
    return () => {
      isActive = false
    }
  }, [isOwnProfile, user, userId])

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
  const avatar = getProfileAvatar(profile)
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')

  function requireLogin() {
    if (!user || user.isAnonymous || !token) {
      pushRoutedModal(navigate, location, 'profile-login-required')
      return false
    }
    return true
  }

  function openChat() {
    if (!requireLogin()) return
    navigate(`/for-you/messages?user=${encodeURIComponent(profile._id)}`)
  }

  function openAvatarPreview() {
    const sourceElement = avatarImageRef.current
    if (!sourceElement) return
    const { left, top, width, height } = sourceElement.getBoundingClientRect()
    setAvatarOriginRect({ left, top, width, height, sourceElement })
    pushRoutedModal(navigate, location, 'profile-avatar-preview')
  }

  function closeAvatarPreview() {
    setAvatarOriginRect(null)
    closeRoutedModal(navigate, location)
  }

  React.useLayoutEffect(() => {
    if (!isAvatarPreviewOpen || !avatarOriginRect) return undefined

    let isActive = true
    animatePreviewElement(
      avatarOriginRect.sourceElement,
      avatarPreviewImageRef.current,
      avatarOriginRect,
    ).then(() => {
      if (isActive) setAvatarOriginRect(null)
    })

    return () => {
      isActive = false
    }
  }, [avatarOriginRect, isAvatarPreviewOpen])

  function handleCreatePost() {
    if (requireLogin()) navigate('/post-create-one')
  }

  async function handleAccountLogin() {
    await logout()
    navigate('/', { replace: true })
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!requireLogin()) return
    setIsSaving(true)
    setError('')
    setEditError('')
    setNotice('')

    try {
      const formData = new FormData()
      Object.entries(editDraft).forEach(([field, value]) => formData.append(field, value || ''))
      if (avatarSelection) formData.append('avatar', avatarSelection.file)

      const response = await fetch(`${API_ORIGIN}/api/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update your profile.')

      setProfile((current) => ({ ...current, ...result }))
      login({ ...user, ...result, token }, { recordDeviceLogin: false })
      closeRoutedModal(navigate, location)
      setAvatarSelection(null)
      setNotice('Profile updated.')
    } catch (actionError) {
      setEditError(actionError.message)
    } finally {
      setIsSaving(false)
    }
  }

  function openEditProfile() {
    setAvatarSelection(null)
    setEditError('')
    pushRoutedModal(navigate, location, 'profile-edit')
  }

  function closeEditProfile() {
    if (isSaving) return
    closeRoutedModal(navigate, location)
    setAvatarSelection(null)
    setEditError('')
  }

  function selectAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setEditError('Choose a JPEG, PNG, WebP, or GIF image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditError('Profile pictures must be smaller than 5 MB.')
      return
    }
    setEditError('')
    setAvatarSelection({ file, previewUrl: URL.createObjectURL(file) })
  }

  async function toggleFriend() {
    if (!requireLogin()) return
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/users/${profile._id}/friend`, {
        method: isFriend ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update friendship.')
      setIsFriend(result.isFriend)
      setProfile((current) => ({
        ...current,
        friendsCount: Math.max(0, (current?.friendsCount || 0) + (result.isFriend ? 1 : -1)),
      }))
      setNotice(result.isFriend ? 'Friend added.' : 'Friend removed.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setNotice('Profile link copied.')
      setError('')
    } catch {
      setError('Could not copy the profile link. Check browser clipboard permissions.')
    } finally {
      setIsMoreOpen(false)
    }
  }

  async function submitProfileReport(event) {
    event.preventDefault()
    if (!requireLogin()) return
    setError('')
    try {
      const response = await fetch(`${API_ORIGIN}/api/users/${profile._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not submit this report.')
      closeRoutedModal(navigate, location)
      setNotice(result.message || 'Report submitted.')
    } catch (actionError) {
      setError(actionError.message)
    }
  }

  return (
    <main className="profile-page">
      {isLoginRequiredOpen && (
        <LoginRequiredModal
          message="Please log in to interact with profiles"
          onClose={() => closeRoutedModal(navigate, location)}
          onLogin={handleAccountLogin}
        />
      )}
      <div className="profile-page-inner">
        <section className="profile-card" aria-labelledby="profile-name">
          <div className="profile-cover" aria-hidden="true" />
          <div className="profile-identity">
            <button className="profile-avatar-trigger" type="button" onClick={openAvatarPreview} aria-label="View profile picture">
              <img ref={avatarImageRef} className="profile-avatar" src={avatar} alt="" />
            </button>
            <div className="profile-heading">
              <h1 id="profile-name">{fullName || profile?.username || 'Your profile'}</h1>
              {profile?.username && fullName && <p className="profile-username">@{profile.username}</p>}
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                profile?.isCompany
                  ? <span className="profile-account-type">Company account</span>
                  : (
                    <button className="profile-action-button profile-edit-button" type="button" onClick={openEditProfile}>
                      Edit profile
                    </button>
                  )
              ) : (
                <>
                  <button className="profile-action-button profile-friend-button" type="button" onClick={toggleFriend}>
                    {isFriend ? 'Unfriend' : 'Add friend'}
                  </button>
                  <button className="profile-action-button profile-chat-button" type="button" onClick={openChat}>
                    Chat
                  </button>
                </>
              )}
              {!isOwnProfile && (
                <div className="profile-more">
                  <button
                    className="profile-action-button profile-more-button"
                    type="button"
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsMoreOpen((open) => !open)}
                  >
                    More
                  </button>
                  {isMoreOpen && (
                    <div className="profile-more-menu" role="menu">
                      <button type="button" role="menuitem" onClick={copyProfileLink}>Copy profile link</button>
                      <button type="button" role="menuitem" onClick={() => {
                        if (requireLogin()) {
                          setReportReason('')
                          setReportDetails('')
                          pushRoutedModal(navigate, location, 'profile-report')
                        }
                        setIsMoreOpen(false)
                      }}>Report profile</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {profile?.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-stats" aria-label="Profile statistics">
            <div><strong>{posts.length}</strong><span>Posts</span></div>
            <div><strong>{profile?.friendsCount ?? profile?.friends?.length ?? 0}</strong><span>Friends</span></div>
          </div>
          <dl className="profile-details">
            {isOwnProfile && profile?.email && <div><dt>Email</dt><dd>{profile.email}</dd></div>}
            {profile?.from && <div><dt>From</dt><dd>{profile.from}</dd></div>}
            {profile?.status && <div><dt>Status</dt><dd>{profile.status}</dd></div>}
          </dl>
        </section>

        {isAvatarPreviewOpen && (
          <div
            className="profile-avatar-preview-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAvatarPreview()
            }}
          >
            <section className="profile-avatar-preview-modal" role="dialog" aria-modal="true" aria-label="Profile picture">
              <button className="profile-avatar-preview-close" type="button" onClick={closeAvatarPreview} aria-label="Close profile picture">
                ×
              </button>
              <img
                ref={avatarPreviewImageRef}
                className={`profile-avatar-large${avatarOriginRect ? ' is-transitioning' : ''}`}
                src={avatar}
                alt={`${fullName || profile?.username || 'Profile'} profile picture`}
              />
            </section>
          </div>
        )}

        {notice && <p className="profile-notice" role="status">{notice}</p>}
        {error && <p className="profile-page-error" role="alert">{error}</p>}

        {isEditProfileOpen && (
          <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditProfile()
          }}>
            <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
              <h2 id="edit-profile-title">Edit profile</h2>
              <form onSubmit={saveProfile}>
                <div className="profile-avatar-editor">
                  <img
                    className="profile-avatar-preview"
                    src={avatarSelection?.previewUrl || avatar}
                    alt="Profile picture preview"
                  />
                  <div className="profile-avatar-controls">
                    <label className="profile-avatar-upload" htmlFor="profile-picture-input">Choose picture</label>
                    <input
                      className="profile-avatar-input"
                      id="profile-picture-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={selectAvatar}
                    />
                    <small>JPEG, PNG, WebP, or GIF. Maximum 5 MB.</small>
                    {avatarSelection && (
                      <button className="profile-avatar-remove" type="button" onClick={() => setAvatarSelection(null)}>
                        Remove selected picture
                      </button>
                    )}
                  </div>
                </div>
                {editError && <p className="profile-edit-error" role="alert">{editError}</p>}
                <label>
                  First name
                  <input value={editDraft.firstName || ''} onChange={(event) => setEditDraft({ ...editDraft, firstName: event.target.value })} required maxLength={80} />
                </label>
                <label>
                  Last name
                  <input value={editDraft.lastName || ''} onChange={(event) => setEditDraft({ ...editDraft, lastName: event.target.value })} required maxLength={80} />
                </label>
                <label>
                  Bio
                  <textarea value={editDraft.bio || ''} onChange={(event) => setEditDraft({ ...editDraft, bio: event.target.value })} maxLength={500} rows={3} />
                </label>
                <label>
                  From
                  <input value={editDraft.from || ''} onChange={(event) => setEditDraft({ ...editDraft, from: event.target.value })} maxLength={120} />
                </label>
                <label>
                  Status
                  <input value={editDraft.status || ''} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value })} maxLength={80} />
                </label>
                <div className="profile-dialog-actions">
                  <button type="button" onClick={closeEditProfile} disabled={isSaving}>Cancel</button>
                  <button type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isReportProfileOpen && (
          <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRoutedModal(navigate, location)
          }}>
            <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="report-profile-title">
              <h2 id="report-profile-title">Report profile</h2>
              <form onSubmit={submitProfileReport}>
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
                  <button type="button" onClick={() => closeRoutedModal(navigate, location)}>Cancel</button>
                  <button type="submit">Submit report</button>
                </div>
              </form>
            </section>
          </div>
        )}

        <section className="profile-posts" aria-labelledby="profile-posts-title">
          <div className="profile-posts-heading">
            <h2 id="profile-posts-title">{isOwnProfile ? 'Your posts' : `${profile?.firstName || profile?.username || 'User'}’s posts`}</h2>
            <span>{posts.length}</span>
          </div>

          {isLoading && <p className="profile-state">Loading your profile…</p>}
          {error && <p className="profile-state profile-state-error" role="alert">{error}</p>}
          {!isLoading && !error && posts.length === 0 && (
            <div className="profile-empty-state">
              <p className="profile-state">{isOwnProfile ? 'You haven’t shared any posts yet.' : 'This user hasn’t shared any posts yet.'}</p>
              {isOwnProfile && (
                <button className="profile-create-post-button" type="button" onClick={handleCreatePost}>
                  Create post
                </button>
              )}
            </div>
          )}

          {!isLoading && !error && posts.length > 0 && (
            <div className="profile-post-grid">
              {posts.map((post) => {
                const displayedPost = post.sharedPost || post
                const firstImage = Array.isArray(displayedPost.images) ? resolveImageUrl(displayedPost.images[0]) : ''
                return (
                  <article className="profile-post-card" key={post._id}>
                    {displayedPost.postType === 'text' ? (
                      <div
                        className="profile-text-post"
                        style={{
                          background: displayedPost.backgroundColor === 'none' ? 'transparent' : (displayedPost.backgroundColor || '#f1f7f1'),
                          color: getTextPostColor(displayedPost.backgroundColor || '#f1f7f1'),
                        }}
                      >
                        <p>{displayedPost.description}</p>
                        {firstImage && <img className="profile-text-post-photo" src={firstImage} alt="" />}
                      </div>
                    ) : firstImage ? (
                      <img className="profile-post-image" src={firstImage} alt={displayedPost.title || 'Post'} />
                    ) : (
                      <div className="profile-post-placeholder">{displayedPost.title || 'Post'}</div>
                    )}
                    <div className="profile-post-copy">
                      {post.shareCaption && <h3>{post.shareCaption}</h3>}
                      {!post.sharedPost && post.title && <h3>{post.title}</h3>}
                      <p>
                        {post.sharedPost
                          ? `Shared from ${displayedPost.user?.username || 'another user'}`
                          : post.description || (post.images?.length ? `${post.images.length} image${post.images.length === 1 ? '' : 's'}` : 'Post')}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default ProfilePage

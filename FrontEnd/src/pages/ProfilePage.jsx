import React from 'react'
import { useContext } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import LoginRequiredModal from '../components/dashboard/LoginRequiredModal'
import PostImageGrid from '../components/createpost/PostImageGrid'
import '../styles/pages/profile.css'
import { getProfileAvatar } from '../utils/profileAvatar'
import { getTextPostColor } from '../utils/textPostColors'
import { closeRoutedModal, pushRoutedModal } from '../utils/routedModal'
import { animatePreviewElement } from '../utils/animatePreviewElement'

import { API_ORIGIN } from '../api/config'

function resolveImageUrl(image) {
  if (typeof image !== 'string' || !image) return ''
  return image.startsWith('/') ? `${API_ORIGIN}${image}` : image
}

function ProfilePage() {
  const { user, personalUser, login, logout } = useContext(AuthContext)
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
  const [isAboutExpanded, setIsAboutExpanded] = React.useState(false)
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
            : fetch(`${API_ORIGIN}/api/users/${userId || user?._id}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
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
        setEditDraft(currentProfile.isCompany
          ? {
            name: currentProfile.firstName || currentProfile.username || '',
            description: currentProfile.bio || '',
          }
          : {
            firstName: currentProfile.firstName || '',
            lastName: currentProfile.lastName || '',
            bio: currentProfile.bio || '',
            from: currentProfile.from || '',
            location: currentProfile.location || '',
            status: currentProfile.status || '',
          })
        setIsFriend(currentProfile.isCompany
          ? Boolean(currentProfile.isFollowing)
          : Boolean(viewerProfile?.friends?.some(
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
  const profileName = fullName || profile?.username || 'Your profile'
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

  function openProfilePost(postId) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`
    navigate(`/for-you?post=${encodeURIComponent(String(postId))}`, {
      state: { postPreviewReturn: { url: returnUrl, state: null } }
    })
  }

  async function handleAccountLogin() {
    await logout()
    navigate('/', { replace: true })
  }

  async function saveProfile(event) {
    event.preventDefault()
    if (!requireLogin()) return
    if (profile?.isCompany && !personalUser?.token) {
      setEditError('Switch to your personal account to edit this company.')
      return
    }
    setIsSaving(true)
    setError('')
    setEditError('')
    setNotice('')

    try {
      const formData = new FormData()
      Object.entries(editDraft).forEach(([field, value]) => formData.append(field, value || ''))
      if (avatarSelection) formData.append('avatar', avatarSelection.file)

      const endpoint = profile?.isCompany
        ? `${API_ORIGIN}/api/companies/${profile._id}`
        : `${API_ORIGIN}/api/users/${user._id}`
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${profile?.isCompany ? personalUser?.token : token}`,
        },
        body: formData,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update your profile.')

      setProfile((current) => ({ ...current, ...result }))
      if (!profile?.isCompany) {
        login({ ...user, ...result, token }, { recordDeviceLogin: false })
      }
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
    if (profile?.isCompany) {
      setEditDraft({
        name: profile.firstName || profile.username || '',
        description: profile.bio || '',
      })
    }
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
      const endpoint = profile.isCompany
        ? `${API_ORIGIN}/api/companies/${profile._id}/follow`
        : `${API_ORIGIN}/api/users/${profile._id}/friend`
      const response = await fetch(endpoint, {
        method: isFriend ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || `Could not ${profile.isCompany ? 'update follow' : 'update friendship'}.`)
      const isConnected = profile.isCompany ? result.isFollowing : result.isFriend
      setIsFriend(isConnected)
      if (profile.isCompany) {
        setProfile((current) => ({
          ...current,
          followersCount: Math.max(0, (current?.followersCount || 0) + (isConnected ? 1 : -1)),
        }))
      } else {
        setProfile((current) => ({
          ...current,
          friendsCount: Math.max(0, (current?.friendsCount || 0) + (isConnected ? 1 : -1)),
        }))
      }
      setNotice(profile.isCompany
        ? (isConnected ? 'You are now following this company.' : 'You unfollowed this company.')
        : (isConnected ? 'Friend added.' : 'Friend removed.'))
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
          <div className="profile-cover">
            <button className="profile-avatar-trigger" type="button" onClick={openAvatarPreview} aria-label="View profile picture">
              <img ref={avatarImageRef} className="profile-avatar" src={avatar} alt="" />
            </button>
          </div>
          <div className="profile-identity">
            <div className="profile-heading">
              <h1 id="profile-name">{profileName}</h1>
              {profile?.isCompany && (
                <span className="profile-company-badge">Company account</span>
              )}
              {profile?.isCompany && profile?.bio && (
                <p className="profile-bio">{profile.bio}</p>
              )}
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                profile?.isCompany
                  ? (
                    <button className="profile-action-button profile-edit-button" type="button" onClick={openEditProfile}>
                      Edit company
                    </button>
                  )
                  : (
                    <button className="profile-action-button profile-edit-button" type="button" onClick={openEditProfile}>
                      Edit profile
                    </button>
                  )
              ) : (
                <button className={`profile-action-button profile-friend-button${isFriend ? ' is-friend' : ''}`} type="button" onClick={toggleFriend}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {profile?.isCompany ? (
                      isFriend
                        ? <path d="m5 12 4 4L19 6" />
                        : <path d="M12 5v14M5 12h14" />
                    ) : (
                      <>
                        <path d="M15.5 20.5v-1.6a4.4 4.4 0 0 0-4.4-4.4H6.9a4.4 4.4 0 0 0-4.4 4.4v1.6" />
                        <circle cx="9" cy="7" r="4" />
                        {isFriend && <path d="m15.5 9.5 2 2 4-4" />}
                        {!isFriend && <path d="M17.5 14v5m-2.5-2.5h5" />}
                      </>
                    )}
                  </svg>
                  <span>{profile?.isCompany
                    ? (isFriend ? 'Following' : 'Follow')
                    : (isFriend ? 'Your friend' : 'Add friend')}</span>
                </button>
              )}
              {!isOwnProfile && (
                <div className="profile-more">
                  <button
                    className="profile-action-button profile-more-button"
                    type="button"
                    aria-label={`More options for ${profileName}`}
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsMoreOpen((open) => !open)}
                  >
                    <span aria-hidden="true">•••</span>
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
          <div className="profile-stats" aria-label={profile?.isCompany ? 'Company follow counts' : 'Friend counts'}>
            {profile?.isCompany ? (
              <>
                <span><strong>{profile.followersCount ?? 0}</strong> followers</span>
                <span className="profile-stats-separator" aria-hidden="true">—</span>
                <span><strong>{profile.followingCount ?? 0}</strong> following</span>
              </>
            ) : (
              <>
                <span><strong>{profile?.friendsCount ?? profile?.friends?.length ?? 0}</strong> friends</span>
                {!isOwnProfile && Number.isFinite(profile?.commonFriendsCount) && (
                  <>
                    <span className="profile-stats-separator" aria-hidden="true">—</span>
                    <span><strong>{profile.commonFriendsCount}</strong> common friends</span>
                    <svg className="profile-stats-chevron" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </>
                )}
              </>
            )}
          </div>
          <dl className="profile-details">
            {isOwnProfile && profile?.email && (
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                <dt>Email</dt><dd>{profile.email}</dd>
              </div>
            )}
            {profile?.sex && (
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
                <dt>Profile</dt><dd className="profile-sex">{profile.sex}</dd>
              </div>
            )}
            {profile?.from && (
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /></svg>
                <dt>From</dt><dd>{profile.from}</dd>
              </div>
            )}
            {profile?.location && (
              <div>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                <dt>Lives in</dt><dd>{profile.location}</dd>
              </div>
            )}
          </dl>
          <button
            className="profile-more-info"
            type="button"
            aria-expanded={isAboutExpanded}
            onClick={() => setIsAboutExpanded((expanded) => !expanded)}
          >
            <span className="profile-more-info-icon" aria-hidden="true">•••</span>
            <span>More of {profileName}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          {isAboutExpanded && (
            <div className="profile-about-more">
              {profile?.bio && <p>{profile.bio}</p>}
              {profile?.status && <p>Status: {profile.status}</p>}
              {!profile?.bio && !profile?.status && <p>No additional profile information yet.</p>}
            </div>
          )}
          {!isOwnProfile && (
            <div className="profile-contact-actions">
              <button className="profile-action-button profile-chat-button" type="button" onClick={openChat}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
                  <path d="M8 11h.01M12 11h.01M16 11h.01" />
                </svg>
                Talk
              </button>
            </div>
          )}
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
              <h2 id="edit-profile-title">{profile?.isCompany ? 'Edit company profile' : 'Edit profile'}</h2>
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
                {profile?.isCompany ? (
                  <>
                    <label>
                      Company name
                      <input value={editDraft.name || ''} onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })} required minLength={2} maxLength={80} />
                    </label>
                    <label>
                      Description
                      <textarea value={editDraft.description || ''} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} maxLength={500} rows={4} />
                    </label>
                  </>
                ) : (
                  <>
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
                      Lives in
                      <input value={editDraft.location || ''} onChange={(event) => setEditDraft({ ...editDraft, location: event.target.value })} maxLength={120} />
                    </label>
                    <label>
                      Status
                      <input value={editDraft.status || ''} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value })} maxLength={80} />
                    </label>
                  </>
                )}
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
            <h2 id="profile-posts-title">
              {isOwnProfile
                ? (profile?.isCompany ? 'Company posts' : 'Your posts')
                : `${profile?.firstName || profile?.username || 'User'}’s posts`}
            </h2>
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
                const postImages = Array.isArray(displayedPost.images)
                  ? displayedPost.images
                    .filter((image) => typeof image === 'string')
                    .map((image, index) => ({
                      src: resolveImageUrl(image),
                      alt: `Post image ${index + 1}`
                    }))
                  : []
                const firstImage = postImages[0]?.src || ''
                return (
                  <article
                    className="profile-post-card"
                    key={post._id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open post by ${profile?.username || 'user'}`}
                    onClick={() => openProfilePost(post._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openProfilePost(post._id)
                      }
                    }}
                  >
                    <div className="profile-post-author">
                      <img className="profile-post-author-avatar" src={avatar} alt="" />
                      <span>{fullName || profile?.username || 'User'}</span>
                    </div>
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
                    ) : postImages.length ? (
                      <PostImageGrid images={postImages} className="post-image-grid-feed" />
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

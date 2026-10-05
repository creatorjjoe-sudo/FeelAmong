import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/components/dashboard/posts.css'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import LoginRequiredModal from './LoginRequiredModal'
import PostImageGrid from '../createpost/PostImageGrid'

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

const VISIBILITY_ICONS = {
  public: ICONS.publicIcon,
  private: ICONS.lock,
  friends: ICONS.userIcon,
}

function Posts() {
  const baseURL = 'http://localhost:5000/api/posts'
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)

  const [posts, setPosts] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [showLoginModal, setShowLoginModal] = React.useState(false)

  const getPosts = async () => {
    try {
      const res = await fetch(baseURL)
      if (!res.ok) throw new Error('Error getting post!', res.status)
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    getPosts()
  }, [])

  const isGuestUser = !user || user.isAnonymous === true

  const toggleLike = async (postId) => {
    if (isGuestUser) {
      setShowLoginModal(true)
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
          const alreadyLiked = existingLikes.some((likeId) => String(likeId) === String(currentUserId))

          const nextLikes = alreadyLiked
            ? existingLikes.filter((likeId) => String(likeId) !== String(currentUserId))
            : [...existingLikes, currentUserId]

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

  return (
    <div className="posts-wrapper">
      {showLoginModal && (
        <LoginRequiredModal message="Please login to like this post" onClose={() => setShowLoginModal(false)} onLogin={async () => { setShowLoginModal(false); await logout(); navigate('/', { replace: true })}}
        />
      )}

      {isLoading && <div>Loading posts...</div>}
      {error && <div>{error}</div>}

      <div className="post-container">
        {posts.map((post) => {
          const likedByCurrentUser = Array.isArray(post.likes) && user && post.likes.some((likeId) => String(likeId) === String(user._id))
          const likeCount = typeof post.likesCount === 'number' ? post.likesCount : (Array.isArray(post.likes) ? post.likes.length : 0)
          const visibility = VISIBILITY_ICONS[post.visibility] ? post.visibility : 'public'
          const isTextPost = post.postType === 'text'
          const postImages = Array.isArray(post.images)
            ? post.images.filter((image) => typeof image === 'string').map((image) => ({
              src: image.startsWith('/') ? `${API_ORIGIN}${image}` : image,
            }))
            : []

          return (
            <div key={post._id} className='post-wrapper'>
              <div className="left-items">
                <div className="post-header">
                  <div className="header-left-items">
                    <div className="creator-avata">
                      <img className='creator-icon' src={post.user?.avatar || ICONS.maleUser} alt={post.user?.username || 'Creator'} />
                    </div>
                    <div className="creator-details">
                      <h2>{post.user?.username || 'Unknown creator'}</h2>
                      <div className="post-time-visibility">
                        <p className='time-ago'>{formatTimeAgo(post.createdAt)}</p>
                        <img className="post-visibility-icon" src={VISIBILITY_ICONS[visibility]} alt="" title={`${visibility[0].toUpperCase()}${visibility.slice(1)} post`} aria-label={`${visibility[0].toUpperCase()} post`}/>
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
                    ? <p>{post.description}</p>
                    : (
                      <>
                        <p>Title: {post.title}</p>
                        {postImages.length > 0
                          ? <PostImageGrid images={postImages} className="post-image-grid-feed" />
                          : <div className="signgle-image" style={{ background: post.color }}></div>}
                        <p>Description: {post.description}</p>
                      </>
                    )}
                  <div className='liked-users'>
                    <img className='liked-img' src={ICONS.likedusersicon} alt="" />
                    <img className='liked-users-list-img' src={ICONS.usersliked} alt="" />
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
                <div className="engage-folder comments">
                  <div className="engage-background">
                    <img src={ICONS.comment} alt="" />
                  </div>
                  <p className='engage-count'></p>
                </div>
                <div className="engage-folder shares">
                  <div className="engage-background">
                    <img src={ICONS.share} alt="" />
                  </div>
                  <p className='engage-count'></p>
                </div>
                <div className="engage-folder saves">
                  <div className="engage-background">
                    <img src={ICONS.save} alt="" />
                  </div>
                  <p className='engage-count'>{}</p>
                </div>
                <div className="engage-folder">
                  <div className="engage-background">
                    <img src={ICONS.more} alt="" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Posts
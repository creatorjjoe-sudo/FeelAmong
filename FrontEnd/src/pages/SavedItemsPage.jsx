import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../api/context/AuthContext'
import '../styles/components/dashboard/profile-menu.css'

import { API_ORIGIN } from '../api/config'

function SavedItemsPage() {
  const { user } = React.useContext(AuthContext)
  const navigate = useNavigate()
  const token = user?.token || user?.accessToken || user?.data?.token || localStorage.getItem('token')
  const [folders, setFolders] = React.useState([])
  const [items, setItems] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [activeFolderId, setActiveFolderId] = React.useState(null)

  React.useEffect(() => {
    let isActive = true

    async function loadSavedItems() {
      if (!user || user.isAnonymous || !token) {
        setError('Log in to view your saved items.')
        setIsLoading(false)
        return
      }

      try {
        const headers = { Authorization: `Bearer ${token}` }
        const [savedResponse, postsResponse, videosResponse] = await Promise.all([
          fetch(`${API_ORIGIN}/api/saves`, { headers }),
          fetch(`${API_ORIGIN}/api/posts`),
          fetch(`${API_ORIGIN}/api/videos`),
        ])
        const [savedResult, posts, videos] = await Promise.all([
          savedResponse.json(),
          postsResponse.json(),
          videosResponse.json(),
        ])
        if (!savedResponse.ok) throw new Error(savedResult.message || 'Could not load your saved items.')
        if (!postsResponse.ok) throw new Error(posts.message || 'Could not load saved posts.')
        if (!videosResponse.ok) throw new Error(videos.message || 'Could not load saved videos.')

        const postById = new Map(posts.map((post) => [String(post._id), post]))
        const videoById = new Map(videos.map((video) => [String(video._id), video]))
        const savedContent = (savedResult.items || []).flatMap((item) => {
          const content = item.itemType === 'post'
            ? postById.get(String(item.itemId))
            : videoById.get(String(item.itemId))
          return content ? [{ ...item, content }] : []
        })

        if (isActive) {
          setFolders(Array.isArray(savedResult.folders) ? savedResult.folders : [])
          setItems(savedContent)
        }
      } catch (loadError) {
        if (isActive) setError(loadError.message || 'Could not load your saved items.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadSavedItems()
    return () => {
      isActive = false
    }
  }, [token, user])

  const folderNameById = new Map(folders.map((folder) => [String(folder._id), folder.name]))
  const unsortedItems = items.filter((item) => (
    !item.folderId || !folderNameById.has(String(item.folderId))
  ))
  const displayedFolder = activeFolderId === 'unsorted'
    ? { _id: 'unsorted', name: 'Unsorted' }
    : folders.find((folder) => String(folder._id) === String(activeFolderId))
  const displayedItems = activeFolderId === 'unsorted'
    ? unsortedItems
    : items.filter((item) => String(item.folderId) === String(activeFolderId))

  return (
    <main className="saved-items-page">
      <header className="saved-items-heading">
        {displayedFolder && (
          <button
            className="saved-items-back"
            type="button"
            onClick={() => setActiveFolderId(null)}
          >
            ← All folders
          </button>
        )}
        <div>
          <h1>{displayedFolder?.name || 'Saved items'}</h1>
          <p>{displayedFolder
            ? `${displayedItems.length} saved ${displayedItems.length === 1 ? 'item' : 'items'}`
            : 'Choose a folder to view the posts and videos saved in it.'}</p>
        </div>
      </header>
      {isLoading && <p className="saved-items-state">Loading saved items...</p>}
      {error && (
        <p className="saved-items-state saved-items-error" role="alert">
          {error}
          {(!user || user.isAnonymous) && (
            <button type="button" onClick={() => navigate('/')}>Log in</button>
          )}
        </p>
      )}
      {!isLoading && !error && !displayedFolder && folders.length === 0 && unsortedItems.length === 0 && (
        <p className="saved-items-state">You haven’t saved any items or created any folders yet.</p>
      )}
      {!isLoading && !error && !displayedFolder && (
        <div className="saved-folders-list">
          {folders.map((folder) => {
            const itemCount = items.filter((item) => String(item.folderId) === String(folder._id)).length
            return (
              <button
                className="saved-folder-card"
                type="button"
                key={folder._id}
                onClick={() => setActiveFolderId(String(folder._id))}
              >
                <span className="saved-folder-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
                  </svg>
                </span>
                <span className="saved-folder-copy">
                  <strong>{folder.name}</strong>
                  <small>{itemCount} {itemCount === 1 ? 'item' : 'items'}</small>
                </span>
                <span className="saved-folder-chevron" aria-hidden="true">›</span>
              </button>
            )
          })}
          {unsortedItems.length > 0 && (
            <button
              className="saved-folder-card"
              type="button"
              onClick={() => setActiveFolderId('unsorted')}
            >
              <span className="saved-folder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2h7.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
                </svg>
              </span>
              <span className="saved-folder-copy">
                <strong>Unsorted</strong>
                <small>{unsortedItems.length} {unsortedItems.length === 1 ? 'item' : 'items'}</small>
              </span>
              <span className="saved-folder-chevron" aria-hidden="true">›</span>
            </button>
          )}
        </div>
      )}
      {!isLoading && !error && displayedFolder && displayedItems.length === 0 && (
        <p className="saved-items-state">This folder is empty.</p>
      )}
      {!isLoading && !error && displayedFolder && displayedItems.length > 0 && (
        <div className="saved-items-grid">
          {displayedItems.map((item) => (
            <SavedItemCard
              key={`${item.itemType}:${item.itemId}`}
              item={item}
              onOpen={() => navigate(item.itemType === 'post'
                ? `/for-you?post=${encodeURIComponent(item.itemId)}`
                : '/for-you/videos')}
            />
          ))}
        </div>
      )}
    </main>
  )
}

function SavedItemCard({ item, onOpen }) {
  const content = item.content
  const postImage = item.itemType === 'post' && Array.isArray(content.images) && content.images[0]
    ? content.images[0].startsWith('/') ? `${API_ORIGIN}${content.images[0]}` : content.images[0]
    : null

  return (
    <button className="saved-item-card" type="button" onClick={onOpen}>
      {postImage ? (
        <img className="saved-item-preview" src={postImage} alt="" />
      ) : (
        <span className="saved-item-preview saved-item-placeholder">
          {item.itemType === 'video' ? 'Video' : content.title || content.description || 'Text post'}
        </span>
      )}
      <span className="saved-item-copy">
        <strong>{item.itemType === 'video' ? content.caption || 'Saved video' : content.title || 'Saved post'}</strong>
        <small>{item.itemType === 'video' ? 'Video' : 'Post'}</small>
      </span>
    </button>
  )
}

export default SavedItemsPage

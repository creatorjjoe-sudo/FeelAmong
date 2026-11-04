import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { ICONS } from '../../assets/icons'
import { AuthContext } from '../../api/context/AuthContext'
import '../../styles/components/dashboard/searchmodal.css'
import { getProfileAvatar } from '../../utils/profileAvatar'
import { replaceWithRoutedModal } from '../../utils/routedModal'

const RECENT_SEARCHES_KEY = 'recentSearchItems'
const API_ORIGIN = 'http://localhost:5000'

function getRecentSearchesKey(userId) {
  return userId ? `${RECENT_SEARCHES_KEY}:${userId}` : `${RECENT_SEARCHES_KEY}:guest`
}

function readRecentSearches(storageKey) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function findBestMatchIndexes(text, searchTerm) {
  const characters = Array.from(text.toLowerCase())
  const queryCharacters = Array.from(searchTerm.toLowerCase())
  let bestMatch = null

  for (let start = 0; start < characters.length; start += 1) {
    if (characters[start] !== queryCharacters[0]) continue

    const match = [start]
    let cursor = start + 1

    for (const queryCharacter of queryCharacters.slice(1)) {
      while (cursor < characters.length && characters[cursor] !== queryCharacter) cursor += 1
      if (cursor === characters.length) break
      match.push(cursor)
      cursor += 1
    }

    if (match.length === queryCharacters.length && (!bestMatch || match.at(-1) - match[0] < bestMatch.at(-1) - bestMatch[0])) {
      bestMatch = match
    }
  }

  return new Set(bestMatch || [])
}

function highlightMatches(value, query) {
  const characters = Array.from(String(value || ''))
  const searchTerm = query.trim()
  if (!searchTerm) return characters.join('')

  const matchingIndexes = findBestMatchIndexes(characters.join(''), searchTerm)
  if (!matchingIndexes.size) return characters.join('')

  return characters.map((character, index) => (
    matchingIndexes.has(index)
      ? <mark key={`${index}-${character}`}>{character}</mark>
      : character
  ))
}

function SearchModal({ open, onClose, anchorRef, modalKey }) {
  const { user } = useContext(AuthContext)
  const recentSearchesKey = getRecentSearchesKey(user?._id || user?.id)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  const [recentSearches, setRecentSearches] = React.useState(() => readRecentSearches(recentSearchesKey))
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [anchorStyle, setAnchorStyle] = React.useState({})
  const inputRef = React.useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    if (!open) return undefined

    setQuery('')
    setResults([])
    setRecentSearches(readRecentSearches(recentSearchesKey))

    const updateAnchor = () => {
      if (window.innerWidth < 800) {
        setAnchorStyle({})
        return
      }
      const bounds = anchorRef?.current?.getBoundingClientRect()
      if (bounds) {
        setAnchorStyle({
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`
        })
      }
    }

    updateAnchor()
    inputRef.current?.focus()
    window.addEventListener('resize', updateAnchor)
    return () => window.removeEventListener('resize', updateAnchor)
  }, [open, anchorRef, recentSearchesKey])

  React.useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  React.useEffect(() => {
    const searchTerm = query.trim()
    if (!open || !searchTerm) {
      setResults([])
      setLoading(false)
      setError('')
      return undefined
    }

    setLoading(true)
    setError('')
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`, {
          signal: controller.signal
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Search is unavailable')
        setResults(Array.isArray(data) ? data : [])
      } catch (searchError) {
        if (searchError.name !== 'AbortError') {
          setError(searchError.message || 'Search is unavailable')
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, query])

  const saveRecentSearch = (item) => {
    const next = [item, ...recentSearches.filter((recent) => recent.id !== item.id || recent.type !== item.type)].slice(0, 8)
    setRecentSearches(next)
    localStorage.setItem(recentSearchesKey, JSON.stringify(next))
  }

  const openResult = (item) => {
    saveRecentSearch(item)
    if (item.type === 'user') {
      replaceWithRoutedModal(navigate, `/for-you/profile/${item.id}`, null, location)
      return
    }
    if (item.type === 'video') {
      replaceWithRoutedModal(navigate, '/for-you/videos', null, location)
      return
    }

    replaceWithRoutedModal(
      navigate,
      `/for-you?post=${encodeURIComponent(item.id)}`,
      location.state?.routedModal === modalKey ? 'post-preview' : null,
      location
    )
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(recentSearchesKey)
  }

  if (!open) return null

  const items = query.trim() ? results : recentSearches
  const sectionTitle = query.trim() ? 'Matches' : 'Recently searched'

  return (
    <div className="search-modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        className="search-modal-panel"
        style={anchorStyle}
        role="dialog"
        aria-modal="true"
        aria-label="Search FeelAmong"
      >
        <div className="search-modal-heading">
          <h2>Search</h2>
          <button className="search-modal-close" type="button" onClick={onClose} aria-label="Close search">
            Close
          </button>
        </div>
        <label className="search-modal-input-wrap">
          <img src={ICONS.search} alt="" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, posts, videos"
            aria-label="Search people, posts, and videos"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">Clear</button>
          )}
        </label>

        <div className="search-modal-list-heading">
          <h3>{sectionTitle}</h3>
          {!query.trim() && recentSearches.length > 0 && (
            <button type="button" onClick={clearRecentSearches}>Clear all</button>
          )}
        </div>

        <div className="search-modal-results" aria-live="polite">
          {loading && items.length === 0 && <p className="search-modal-state">Searching...</p>}
          {!loading && error && items.length === 0 && <p className="search-modal-state">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="search-modal-state">
              {query.trim() ? 'No matches found' : 'Your recent searches will appear here'}
            </p>
          )}
          {items.length > 0 && items.map((item) => (
            <button
              className="search-result-item"
              type="button"
              key={`${item.type}-${item.id}`}
              onClick={() => openResult(item)}
            >
              {item.type === 'post' ? (
                item.previewImage ? (
                  <img
                    className="search-result-avatar search-result-post-image"
                    src={item.previewImage.startsWith('/') ? `${API_ORIGIN}${item.previewImage}` : item.previewImage}
                    alt=""
                  />
                ) : (
                  <span
                    className="search-result-avatar search-result-text-post"
                    style={{ backgroundColor: item.backgroundColor === 'none' ? 'transparent' : (item.backgroundColor || '#f1f7f1') }}
                    aria-hidden="true"
                  >
                    {item.previewText || item.title}
                  </span>
                )
              ) : (
                <img className="search-result-avatar" src={getProfileAvatar(item)} alt="" />
              )}
              <span className="search-result-copy">
                <span className="search-result-title">{highlightMatches(item.title, query)}</span>
                <span className="search-result-meta">
                  {item.type === 'user' ? 'Person' : item.type === 'post' ? 'Post' : 'Video'}
                  {item.description ? <> - {highlightMatches(item.description, query)}</> : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default SearchModal

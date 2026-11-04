import React from 'react'
import '../../styles/components/dashboard/createpostmenu.css'

const POST_TYPES = [
  { value: 'text', label: 'Text post' },
  { value: 'image', label: 'Image post' },
  { value: 'video', label: 'Video post' },
]

function CreatePostMenu({ children, className = '', onSelect }) {
  const menuRef = React.useRef(null)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={`create-post-menu ${className}`.trim()} ref={menuRef}>
      {children({ isOpen, toggle: () => setIsOpen((open) => !open) })}
      {isOpen && (
        <div className="create-post-menu-options" role="menu" aria-label="Choose post type">
          {POST_TYPES.map((postType) => (
            <button
              key={postType.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false)
                onSelect(postType.value)
              }}
            >
              {postType.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CreatePostMenu

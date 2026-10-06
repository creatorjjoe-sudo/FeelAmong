import '../../styles/components/post-image-grid.css'

function PostImageGrid({ images, className = '', onImageClick }) {
  if (!images?.length) return null

  const visibleImages = images.slice(0, 5)

  return (
    <div
      className={`post-image-grid post-image-grid-${visibleImages.length} ${className}`.trim()}
      role="group"
      aria-label="Post images"
    >
      {visibleImages.map((image, index) => {
        const src = typeof image === 'string' ? image : image.src
        const alt = typeof image === 'string' ? `Post image ${index + 1}` : image.alt || `Post image ${index + 1}`

        const isInteractive = typeof onImageClick === 'function'

        return (
          <div
            className={`post-image-grid-tile${isInteractive ? ' post-image-grid-tile-interactive' : ''}`}
            key={`${src}-${index}`}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={isInteractive ? `View image ${index + 1} of ${images.length}` : undefined}
            onClick={isInteractive ? (event) => onImageClick(index, event.currentTarget) : undefined}
            onKeyDown={isInteractive ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onImageClick(index, event.currentTarget)
              }
            } : undefined}
          >
            <img src={src} alt={alt} />
            {index === 4 && images.length > 5 && (
              <span className="post-image-grid-overflow" aria-label={`${images.length - 5} more images`}>
                +{images.length - 5}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PostImageGrid

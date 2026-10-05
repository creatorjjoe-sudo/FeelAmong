import '../../styles/components/post-image-grid.css'

function PostImageGrid({ images, className = '' }) {
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

        return (
          <div className="post-image-grid-tile" key={`${src}-${index}`}>
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

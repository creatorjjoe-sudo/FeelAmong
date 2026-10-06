import React from 'react'
import '../../styles/components/dashboard/imagepreviewmodal.css'
import { animatePreviewElement } from '../../utils/animatePreviewElement'

function ImagePreviewModal({ images, initialIndex, originRect, onClose }) {
  const [selectedIndex, setSelectedIndex] = React.useState(initialIndex)
  const [isTransitioning, setIsTransitioning] = React.useState(Boolean(originRect))
  const thumbnailRailRef = React.useRef(null)
  const thumbnailRefs = React.useRef(new Map())
  const mainImageRef = React.useRef(null)

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        setSelectedIndex((index) => Math.max(0, index - 1))
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        setSelectedIndex((index) => Math.min(images.length - 1, index + 1))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [images.length, onClose])

  React.useLayoutEffect(() => {
    let cancelled = false
    animatePreviewElement(originRect?.sourceElement, mainImageRef.current, originRect).then(() => {
      if (!cancelled) setIsTransitioning(false)
    })
    return () => {
      cancelled = true
    }
  }, [originRect])

  React.useEffect(() => {
    const rail = thumbnailRailRef.current
    const thumbnail = thumbnailRefs.current.get(selectedIndex)
    if (!rail || !thumbnail) return

    if (window.matchMedia('(max-width: 600px)').matches) {
      rail.scrollTo({
        left: thumbnail.offsetLeft - (rail.clientWidth - thumbnail.offsetWidth) / 2,
        behavior: 'smooth',
      })
    } else {
      rail.scrollTo({
        top: thumbnail.offsetTop - (rail.clientHeight - thumbnail.offsetHeight) / 2,
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  const selectedImage = images[selectedIndex]
  if (!selectedImage) return null

  return (
    <div
      className={`image-preview-backdrop${isTransitioning ? ' is-transitioning' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`image-preview-modal${isTransitioning ? ' is-transitioning' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Post image gallery"
      >
        <button className="image-preview-close" type="button" aria-label="Close image preview" onClick={onClose}>
          ×
        </button>
        <div className="image-preview-main">
          <img
            ref={mainImageRef}
            src={selectedImage.src}
            alt={selectedImage.alt || `Post image ${selectedIndex + 1}`}
          />
          <p className="image-preview-count">{selectedIndex + 1} / {images.length}</p>
        </div>
        <div className="image-preview-rail" ref={thumbnailRailRef} aria-label="Post images">
          {images.map((image, index) => (
            <button
              key={`${image.src}-${index}`}
              ref={(element) => {
                if (element) thumbnailRefs.current.set(index, element)
                else thumbnailRefs.current.delete(index)
              }}
              className={`image-preview-thumbnail${selectedIndex === index ? ' is-selected' : ''}`}
              type="button"
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={selectedIndex === index ? 'true' : undefined}
              onClick={() => setSelectedIndex(index)}
            >
              <img src={image.src} alt="" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ImagePreviewModal

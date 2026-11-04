import React from 'react'
import { AnimatePresence, animate, motion } from 'framer-motion'
import '../../styles/components/dashboard/imagepreviewmodal.css'

const FLY_IN_DURATION = 0.42
const FLY_IN_EASE = [0.2, 0.75, 0.25, 1]
// Matches the backdrop fade duration: the dark backdrop must be fully up
// before the clone flight / panel entrance begins, so it covers everything.
const BACKDROP_FADE_DURATION = 0.22

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Shared-element fly-in: clones the source image and animates it from the
// clicked thumbnail's rect into the modal's main image slot with framer-motion.
async function flyInFromRect(sourceElement, targetElement, originRect) {
  if (!sourceElement || !targetElement || !originRect) return
  if (prefersReducedMotion()) return

  await wait(BACKDROP_FADE_DURATION * 1000)

  if (targetElement instanceof HTMLImageElement && !targetElement.complete) {
    await new Promise((resolve) => {
      targetElement.addEventListener('load', resolve, { once: true })
      targetElement.addEventListener('error', resolve, { once: true })
    })
  }

  const targetRect = targetElement.getBoundingClientRect()
  if (!targetRect.width || !targetRect.height) return

  const sourceImage = sourceElement instanceof HTMLImageElement ? sourceElement : null
  const clone = sourceImage ? sourceImage.cloneNode(false) : sourceElement.cloneNode(true)
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
  if (sourceImage) {
    const targetStyle = window.getComputedStyle(targetElement)
    clone.src = sourceImage.currentSrc || sourceImage.src
    clone.style.objectFit = targetStyle.objectFit
    clone.style.objectPosition = targetStyle.objectPosition
    clone.style.borderRadius = targetStyle.borderRadius
  }
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
      { duration: FLY_IN_DURATION, ease: FLY_IN_EASE },
    )
  } finally {
    clone.remove()
  }
}

function ImagePreviewModal({ images, initialIndex, originRect, onClose }) {
  const [selectedIndex, setSelectedIndex] = React.useState(initialIndex)
  const [isTransitioning, setIsTransitioning] = React.useState(Boolean(originRect))
  // When the fly-in clone lands it is pixel-identical to the real image, so the
  // handoff must be instant (no fade) — a fade here reads as a blink.
  const [instantReveal, setInstantReveal] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const thumbnailRailRef = React.useRef(null)
  const thumbnailRefs = React.useRef(new Map())
  const mainImageRef = React.useRef(null)

  React.useEffect(() => {
    if (isClosing) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event) {
      if (event.key === 'Escape') handleClose()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, isClosing])

  React.useLayoutEffect(() => {
    let cancelled = false
    flyInFromRect(originRect?.sourceElement, mainImageRef.current, originRect).then(() => {
      if (!cancelled) {
        setIsTransitioning(false)
        setInstantReveal(true)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function handleClose() {
    if (isClosing) return
    setIsClosing(true)
  }

  function handleThumbnailSelect(index) {
    if (index === selectedIndex || isClosing) return
    setInstantReveal(false)
    setSelectedIndex(index)
  }

  const selectedImage = images[selectedIndex]
  if (!selectedImage) return null

  return (
    <motion.div
      className="image-preview-backdrop"
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
        className="image-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Post image gallery"
        initial={prefersReducedMotion() ? false : { opacity: 0 }}
        animate={isClosing
          ? { opacity: 0, scale: 0.96, y: 14 }
          : isTransitioning
            ? { opacity: 0 }
            : { opacity: 1, scale: 1, y: 0 }}
        transition={
          isClosing
            ? { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }
            : { duration: 0.18, ease: 'easeOut' }
        }
      >
        <button className="image-preview-close" type="button" aria-label="Close image preview" onClick={handleClose}>
          ×
        </button>
        <div className="image-preview-main">
          <AnimatePresence mode="wait" initial={false}>
            <motion.img
              key={selectedImage.src}
              ref={mainImageRef}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={isTransitioning
                ? { opacity: 0, scale: 0.985 }
                : { opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={instantReveal
                ? { duration: 0 }
                : { duration: 0.18, ease: 'easeOut' }}
              src={selectedImage.src}
              alt={selectedImage.alt || `Post image ${selectedIndex + 1}`}
            />
          </AnimatePresence>
          <p className="image-preview-count">{selectedIndex + 1} / {images.length}</p>
        </div>
        <div className="image-preview-rail" ref={thumbnailRailRef} aria-label="Post images">
          {images.map((image, index) => (
            <motion.button
              key={`${image.src}-${index}`}
              ref={(element) => {
                if (element) thumbnailRefs.current.set(index, element)
                else thumbnailRefs.current.delete(index)
              }}
              className={`image-preview-thumbnail${selectedIndex === index ? ' is-selected' : ''}`}
              type="button"
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={selectedIndex === index ? 'true' : undefined}
              whileHover={{ opacity: 0.9 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleThumbnailSelect(index)}
            >
              <img src={image.src} alt="" />
            </motion.button>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}

export default ImagePreviewModal

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import '../../styles/components/dashboard/imagepreviewmodal.css'

const FLY_IN_DURATION = 0.42
const FLY_IN_EASE = 'cubic-bezier(0.2, 0.75, 0.25, 1)'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Shared-element fly-in: clones the source image and animates it from the
// clicked thumbnail's rect into the modal's main image slot.
async function flyInFromRect(sourceElement, targetElement, originRect, signal) {
  if (!sourceElement || !targetElement || !originRect || prefersReducedMotion()) return true
  if (signal.aborted) return false

  if (targetElement instanceof HTMLImageElement && !targetElement.complete) {
    await new Promise((resolve) => {
      const finish = () => {
        targetElement.removeEventListener('load', finish)
        targetElement.removeEventListener('error', finish)
        signal.removeEventListener('abort', finish)
        resolve()
      }
      targetElement.addEventListener('load', finish, { once: true })
      targetElement.addEventListener('error', finish, { once: true })
      signal.addEventListener('abort', finish, { once: true })
    })
  }
  if (signal.aborted) return false

  const sourceImage = sourceElement instanceof HTMLImageElement ? sourceElement : null
  const targetRect = targetElement.getBoundingClientRect()
  if (!targetRect.width || !targetRect.height) return true

  const targetStyle = window.getComputedStyle(targetElement)
  let destinationRect = targetRect
  if (
    targetElement instanceof HTMLImageElement
    && targetStyle.objectFit === 'contain'
    && targetElement.naturalWidth
    && targetElement.naturalHeight
  ) {
    const scale = Math.min(
      targetRect.width / targetElement.naturalWidth,
      targetRect.height / targetElement.naturalHeight,
    )
    const width = targetElement.naturalWidth * scale
    const height = targetElement.naturalHeight * scale
    destinationRect = {
      top: targetRect.top + (targetRect.height - height) / 2,
      left: targetRect.left + (targetRect.width - width) / 2,
      width,
      height,
    }
  }

  const clone = sourceImage ? sourceImage.cloneNode(false) : sourceElement.cloneNode(true)
  const sourceStyle = window.getComputedStyle(sourceElement)
  const initialTransform = `translate3d(${originRect.left - destinationRect.left}px, ${originRect.top - destinationRect.top}px, 0) scale(${originRect.width / destinationRect.width}, ${originRect.height / destinationRect.height})`
  clone.setAttribute('aria-hidden', 'true')
  clone.removeAttribute('role')
  clone.removeAttribute('tabindex')
  Object.assign(clone.style, {
    position: 'fixed',
    top: `${destinationRect.top}px`,
    left: `${destinationRect.left}px`,
    width: `${destinationRect.width}px`,
    height: `${destinationRect.height}px`,
    boxSizing: 'border-box',
    margin: '0',
    zIndex: '1300',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    transform: initialTransform,
  })
  if (sourceImage) {
    clone.src = sourceImage.currentSrc || sourceImage.src
    clone.style.objectFit = sourceStyle.objectFit
    clone.style.objectPosition = sourceStyle.objectPosition
    clone.style.borderRadius = sourceStyle.borderRadius
  }
  document.body.appendChild(clone)

  const flight = clone.animate(
    [
      { transform: initialTransform },
      { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
    ],
    { duration: FLY_IN_DURATION * 1000, easing: FLY_IN_EASE, fill: 'forwards' },
  )
  const cancelFlight = () => flight.cancel()
  signal.addEventListener('abort', cancelFlight, { once: true })

  try {
    await flight.finished
    if (signal.aborted) return false
    clone.style.objectFit = targetStyle.objectFit
    clone.style.objectPosition = targetStyle.objectPosition
    return true
  } catch (error) {
    if (error.name === 'AbortError') return false
    throw error
  } finally {
    signal.removeEventListener('abort', cancelFlight)
    flight.cancel()
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
    const controller = new AbortController()
    flyInFromRect(originRect?.sourceElement, mainImageRef.current, originRect, controller.signal)
      .then((completed) => {
        if (completed && !controller.signal.aborted) {
          setIsTransitioning(false)
          setInstantReveal(true)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('Image preview fly-in failed:', error)
          setIsTransitioning(false)
          setInstantReveal(true)
        }
      })
    return () => controller.abort()
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
              initial={{ opacity: 0, scale: 1 }}
              animate={isTransitioning
                ? { opacity: 0, scale: 1 }
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

const FLY_IN_DURATION = 420
const CIRCLE_PHASE_END = 0.74

function getEasedProgress(progress) {
  const bezierCoordinate = (time, firstControl, secondControl) => (
    3 * (1 - time) ** 2 * time * firstControl
      + 3 * (1 - time) * time ** 2 * secondControl
      + time ** 3
  )

  let lower = 0
  let upper = 1
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const midpoint = (lower + upper) / 2
    if (bezierCoordinate(midpoint, 0.2, 0.25) < progress) lower = midpoint
    else upper = midpoint
  }

  return bezierCoordinate((lower + upper) / 2, 0.75, 1)
}

export async function animatePreviewElement(sourceElement, targetElement, originRect) {
  if (!sourceElement || !targetElement || !originRect) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  if (targetElement instanceof HTMLImageElement && !targetElement.complete) {
    await new Promise((resolve) => {
      targetElement.addEventListener('load', resolve, { once: true })
      targetElement.addEventListener('error', resolve, { once: true })
    })
  }

  const targetRect = targetElement.getBoundingClientRect()
  if (!targetRect.width || !targetRect.height) return

  const sourceImage = sourceElement instanceof HTMLImageElement ? sourceElement : null
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
  })
  if (sourceImage) {
    clone.src = sourceImage.currentSrc || sourceImage.src
    clone.style.objectFit = targetStyle.objectFit
    clone.style.objectPosition = targetStyle.objectPosition
  }
  document.body.appendChild(clone)

  const scaleX = originRect.width / destinationRect.width
  const scaleY = originRect.height / destinationRect.height
  const offsetX = originRect.left - destinationRect.left
  const offsetY = originRect.top - destinationRect.top
  const targetBorderRadius = targetStyle.borderRadius || '0px'
  const keyframes = Array.from({ length: 13 }, (_, index) => {
    const offset = CIRCLE_PHASE_END * index / 12
    const progress = getEasedProgress(offset)
    const currentScaleX = scaleX + (1 - scaleX) * progress
    const currentScaleY = scaleY + (1 - scaleY) * progress
    const circleRadius = Math.min(
      destinationRect.width * currentScaleX,
      destinationRect.height * currentScaleY,
    ) / 2

    return {
      offset,
      transform: `translate3d(${offsetX * (1 - progress)}px, ${offsetY * (1 - progress)}px, 0) scale(${currentScaleX}, ${currentScaleY})`,
      borderRadius: `${circleRadius / currentScaleX}px / ${circleRadius / currentScaleY}px`,
      easing: 'linear',
    }
  })
  keyframes.push({
    offset: 1,
    transform: 'translate3d(0, 0, 0) scale(1, 1)',
    borderRadius: targetBorderRadius,
    easing: 'linear',
  })

  const animation = clone.animate(
    keyframes,
    { duration: FLY_IN_DURATION, easing: 'linear' },
  )

  await new Promise((resolve) => {
    const cleanup = () => {
      clone.remove()
      resolve()
    }
    animation.onfinish = cleanup
    animation.oncancel = cleanup
  })
}

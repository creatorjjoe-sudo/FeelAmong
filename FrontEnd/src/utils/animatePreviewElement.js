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

  const clone = sourceElement.cloneNode(true)
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
    zIndex: '1000',
    pointerEvents: 'none',
    transformOrigin: 'top left',
  })
  document.body.appendChild(clone)

  const animation = clone.animate(
    [
      {
        transform: `translate3d(${originRect.left - targetRect.left}px, ${originRect.top - targetRect.top}px, 0) scale(${originRect.width / targetRect.width}, ${originRect.height / targetRect.height})`,
      },
      { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
    ],
    { duration: 420, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)' },
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

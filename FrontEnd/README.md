# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

Edit file · FrontEnd/src/styles/components/dashboard/imagepreviewmodal.css
- .image-preview-main > img.is-transitioning {
-  visibility: hidden;
- }
+ .image-preview-main > img.is-transitioning {
+  opacity: 0;
+ }
+ 
+ .image-preview-main > img {
+  transition: opacity 140ms ease-out;
+ }

Edit file · FrontEnd/src/utils/animatePreviewElement.js
-   await new Promise((resolve) => {
-     const cleanup = () => {
-       clone.remove()
-       resolve()
-     }
-     animation.onfinish = cleanup
-     animation.oncancel = cleanup
-   })
- }
+   await new Promise((resolve) => {
+     const cleanup = () => {
+       clone.remove()
+       resolve()
+     }
+     animation.onfinish = cleanup
+     animation.oncancel = cleanup
+   })
+ 
+   // The clone lands on top of the modal image, but the two may frame the
+   // picture differently (feed tiles crop with `cover`, the modal letterboxes
+   // with `contain`). Cross-fade between them instead of swapping instantly so
+   // it still reads as one image that animated into place.
+   const targetOpacityAnimation = targetElement.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' })
+   const cloneOpacityAnimation = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' })
+ 
+   await new Promise((resolve) => {
+     let settled = false
+     const done = () => {
+       if (settled) return
+       settled = true
+       cloneOpacityAnimation.cancel()
+       clone.remove()
+       resolve()
+     }
+     cloneOpacityAnimation.onfinish = done
+     cloneOpacityAnimation.oncancel = done
+     // Safety: if the clone animation never resolves (hidden tab, etc.),
+     // end the cross-fade anyway once the target has fully faded in.
+     targetOpacityAnimation.onfinish = () => setTimeout(done, 50)
+   })
+ }

Edit file · FrontEnd/src/utils/animatePreviewElement.js
-   // The clone lands on top of the modal image, but the two may frame the
-   // picture differently (feed tiles crop with `cover`, the modal letterboxes
-   // with `contain`). Cross-fade between them instead of swapping instantly so
-   // it still reads as one image that animated into place.
-   const targetOpacityAnimation = targetElement.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' })
-   const cloneOpacityAnimation = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' })
- 
-   await new Promise((resolve) => {
-     let settled = false
-     const done = () => {
-       if (settled) return
-       settled = true
-       cloneOpacityAnimation.cancel()
-       clone.remove()
-       resolve()
-     }
-     cloneOpacityAnimation.onfinish = done
-     cloneOpacityAnimation.oncancel = done
-     // Safety: if the clone animation never resolves (hidden tab, etc.),
-     // end the cross-fade anyway once the target has fully faded in.
-     targetOpacityAnimation.onfinish = () => setTimeout(done, 50)
-   })
- }
+   // The clone lands on top of the modal image, but the two may frame the
+   // picture differently (feed tiles crop with `cover`, the modal letterboxes
+   // with `contain`). Resolve now so the caller reveals the modal image while
+   // the clone fades out on top of it — it reads as one seamless image.
+   const cloneOpacityAnimation = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' })
+   const cleanup = () => clone.remove()
+   cloneOpacityAnimation.onfinish = cleanup
+   cloneOpacityAnimation.oncancel = cleanup
+   // Safety: never leave the clone behind if its animation gets interrupted.
+   setTimeout(cleanup, 400)
+ }

Edit file · FrontEnd/src/styles/components/dashboard/imagepreviewmodal.css
- .image-preview-main > img {
-  transition: opacity 140ms ease-out;
- }
- 
- .image-preview-main > img {
-  display: block;
-  width: 100%;
-  height: 100%;
-  max-width: 100%;
-  max-height: 100%;
-  object-fit: contain;
- }
- 
- .image-preview-main > img.is-transitioning {
-  opacity: 0;
- }
+ .image-preview-main > img {
+  display: block;
+  width: 100%;
+  height: 100%;
+  max-width: 100%;
+  max-height: 100%;
+  object-fit: contain;
+  transition: opacity 140ms ease-out;
+ }
+ 
+ .image-preview-main > img.is-transitioning {
+  opacity: 0;
+ }


Edit file · FrontEnd/src/styles/components/dashboard/imagepreviewmodal.css
- .image-preview-main > img {
-  transition: opacity 140ms ease-out;
- }
- 
- .image-preview-main > img {
-  display: block;
-  width: 100%;
-  height: 100%;
-  max-width: 100%;
-  max-height: 100%;
-  object-fit: contain;
- }
- 
- .image-preview-main > img.is-transitioning {
-  opacity: 0;
- }
+ .image-preview-main > img {
+  display: block;
+  width: 100%;
+  height: 100%;
+  max-width: 100%;
+  max-height: 100%;
+  object-fit: contain;
+  transition: opacity 140ms ease-out;
+ }
+ 
+ .image-preview-main > img.is-transitioning {
+  opacity: 0;
+ }

Edit file · FrontEnd/src/styles/components/dashboard/imagepreviewmodal.css
-  transition: opacity 140ms ease-out;
- }
- 
- .image-preview-main > img {
-  display: block;
-  width: 100%;
-  height: 100%;
-  max-width: 100%;
-  max-height: 100%;
-  object-fit: contain;
- }
- 
- .image-preview-count
+  transition: opacity 140ms ease-out;
+ }


Edit file · FrontEnd/src/styles/components/dashboard/imagepreviewmodal.css
- .image-preview-main > img {
-  transition: opacity 140ms ease-out;
- } {
-  position: absolute;
+ .image-preview-main > img {
+  display: block;
+  width: 100%;
+  height: 100%;
+  max-width: 100%;
+  max-height: 100%;
+  object-fit: contain;
+  transition: opacity 140ms ease-out;
+ }
+ 
+ .image-preview-count {
+  position: absolute;


Edit file · FrontEnd/src/utils/animatePreviewElement.js
-   if (sourceImage) {
-     const targetStyle = window.getComputedStyle(targetElement)
-     clone.src = sourceImage.currentSrc || sourceImage.src
-     clone.style.objectFit = targetStyle.objectFit
-     clone.style.objectPosition = targetStyle.objectPosition
-     clone.style.borderRadius = targetStyle.borderRadius
-   }
+   if (sourceImage) {
+     // Match the source tile's framing exactly at the start of the flight so
+     // it reads as the very image that was clicked. Any difference from the
+     // modal's `contain` framing is hidden by the clone fading out on landing.
+     const sourceStyle = window.getComputedStyle(sourceImage)
+     clone.src = sourceImage.currentSrc || sourceImage.src
+     clone.style.objectFit = sourceStyle.objectFit
+     clone.style.objectPosition = sourceStyle.objectPosition
+     clone.style.borderRadius = sourceStyle.borderRadius
+   }

Edit file · FrontEnd/src/utils/animatePreviewElement.js
-   const animation = clone.animate(
-     [
-       {
-         transform: `translate3d(${originRect.left - targetRect.left}px, ${originRect.top - targetRect.top}px, 0) scale(${originRect.width / targetRect.width}, ${originRect.height / targetRect.height})`,
-       },
-       { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
-     ],
-     { duration: 420, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)' },
-   )
- 
-   await new Promise((resolve) => {
-     const cleanup = () => {
-       clone.remove()
-       resolve()
-     }
-     animation.onfinish = cleanup
-     animation.oncancel = cleanup
-   })
- 
-   // The clone lands on top of the modal image, but the two may frame the
-   // picture differently (feed tiles crop with `cover`, the modal letterboxes
-   // with `contain`). Resolve now so the caller reveals the modal image while
-   // the clone fades out on top of it — it reads as one seamless image.
-   const cloneOpacityAnimation = clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' })
-   const cleanup = () => clone.remove()
-   cloneOpacityAnimation.onfinish = cleanup
-   cloneOpacityAnimation.oncancel = cleanup
-   // Safety: never leave the clone behind if its animation gets interrupted.
-   setTimeout(cleanup, 400)
- }
+   const animation = clone.animate(
+     [
+       {
+         transform: `translate3d(${originRect.left - targetRect.left}px, ${originRect.top - targetRect.top}px, 0) scale(${originRect.width / targetRect.width}, ${originRect.height / targetRect.height})`,
+       },
+       { transform: 'translate3d(0, 0, 0) scale(1, 1)', opacity: 1 },
+       { transform: 'translate3d(0, 0, 0) scale(1, 1)', opacity: 0, offset: 1, easing: 'ease-out' },
+     ],
+     { duration: 540, easing: 'cubic-bezier(0.2, 0.75, 0.25, 1)' },
+   )
+ 
+   // Resolve 150ms before the animation ends so the caller reveals the modal
+   // image underneath while the clone fades out on top of it — it reads as one
+   // seamless image settling into place rather than an instant swap.
+   await new Promise((resolve) => {
+     let resolved = false
+     const resolveOnce = () => {
+       if (resolved) return
+       resolved = true
+       resolve()
+     }
+     // Fire at the moment the clone reaches its final position and starts fading.
+     setTimeout(resolveOnce, 390)
+     animation.onfinish = () => {
+       clone.remove()
+       resolveOnce()
+     }
+     animation.oncancel = () => {
+       clone.remove()
+       resolveOnce()
+     }
+   })
+ }


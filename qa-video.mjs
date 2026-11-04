export default async function run(page, ui) {
  await page.waitForTimeout(6000)
  let snap = await ui.snapshot()
  const guest = snap.match(/@(e\d+) button "Continue without account"/)?.[1]
  const result = { guestFlowTimedOut: false, videoLoadTimedOut: false }
  if (guest) {
    await ui.click(guest)
    try { await page.waitForSelector('.videos-scroll, .video-slide', { timeout: 20000 }) }
    catch { result.guestFlowTimedOut = true }
  }
  await page.goto('http://localhost:5173/for-you/videos')
  try { await page.waitForSelector('.video-slide video', { timeout: 20000 }) }
  catch { result.videoLoadTimedOut = true }
  await page.waitForTimeout(3000)
  const state = () => page.evaluate(() => {
    const vids = [...document.querySelectorAll('.video-slide video')]
    const active = document.querySelector('.video-slide.is-active')?.dataset.slideIndex
    return {
      active,
      vids: vids.map((v, i) => ({ i, idx: v.dataset.slideIndex, paused: v.paused, t: v.currentTime.toFixed(1) })),
    }
  })
  const before = await state()
  // scroll to next slide
  await page.evaluate(() => {
    const slides = document.querySelectorAll('.video-slide')
    if (slides[1]) slides[1].scrollIntoView({ behavior: 'smooth' })
  })
  await page.waitForTimeout(2500)
  const after = await state()
  return { ...result, before, after }
}

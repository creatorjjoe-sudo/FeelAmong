function getCurrentUrl(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

export function pushRoutedModal(navigate, location, modal) {
  const currentUrl = getCurrentUrl(location)
  const baseState = { ...(location.state || {}) }
  delete baseState.routedModal
  delete baseState.routedModalReturn
  delete baseState.routedDropdown
  delete baseState.routedDropdownReturn
  const returnTo = location.state?.routedModal
    ? { url: currentUrl, state: location.state }
    : { url: currentUrl, state: baseState }

  if (!location.state?.routedModal) {
    navigate(currentUrl, { replace: true, state: baseState })
  }

  navigate(currentUrl, {
    state: { ...baseState, routedModal: modal, routedModalReturn: returnTo },
  })
}

export function closeRoutedModal(navigate, location, fallbackUrl = getCurrentUrl(location)) {
  if (location.state?.routedModal) {
    const returnTo = location.state.routedModalReturn
    if (returnTo?.state?.routedModal) {
      navigate(-1)
      return
    }

    const state = returnTo?.state || null
    const url = returnTo?.url || fallbackUrl
    navigate(url, { replace: true, state })
    return
  }

  navigate(fallbackUrl, { replace: true, state: location.state })
}

export function replaceWithRoutedModal(navigate, url, modal, location) {
  const returnTo = location?.state?.routedModal
    ? location.state.routedModalReturn || { url: getCurrentUrl(location), state: null }
    : null
  navigate(url, {
    replace: true,
    state: modal
      ? { routedModal: modal, routedModalReturn: returnTo }
      : null,
  })
}

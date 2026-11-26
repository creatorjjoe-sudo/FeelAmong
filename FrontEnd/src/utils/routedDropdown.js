function getCurrentUrl(location) {
  return `${location.pathname}${location.search}${location.hash}`
}

function stripRoutedDropdownState(state) {
  const cleanedState = { ...(state || {}) }
  delete cleanedState.routedDropdown
  delete cleanedState.routedDropdownReturn
  return Object.keys(cleanedState).length ? cleanedState : null
}

export function pushRoutedDropdown(navigate, location, dropdown) {
  const currentUrl = getCurrentUrl(location)
  const previousReturn = location.state?.routedDropdownReturn
  const returnTo = previousReturn || {
    url: currentUrl,
    state: stripRoutedDropdownState(location.state),
  }
  const baseState = stripRoutedDropdownState(previousReturn?.state ?? location.state)

  navigate(currentUrl, { replace: true, state: baseState, preventScrollReset: true })
  navigate(currentUrl, {
    state: {
      ...(baseState || {}),
      routedDropdown: dropdown,
      routedDropdownReturn: returnTo,
    },
    preventScrollReset: true,
  })
}

export function closeRoutedDropdown(navigate, location, dropdownType) {
  if (location.state?.routedDropdown?.type !== dropdownType) return
  navigate(-1)
}

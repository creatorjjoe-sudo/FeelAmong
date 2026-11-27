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

export function pushRoutedDropdownView(navigate, location, dropdownType, view) {
  const dropdown = location.state?.routedDropdown
  if (dropdown?.type !== dropdownType) return

  navigate(getCurrentUrl(location), {
    state: {
      ...location.state,
      routedDropdown: { ...dropdown, view },
    },
    preventScrollReset: true,
  })
}

export function closeRoutedDropdownView(navigate, location, dropdownType, view) {
  if (
    location.state?.routedDropdown?.type === dropdownType
    && location.state?.routedDropdown?.view === view
  ) {
    navigate(-1)
  }
}

export function closeRoutedDropdown(navigate, location, dropdownType) {
  if (location.state?.routedDropdown?.type !== dropdownType) return
  navigate(location.state.routedDropdown.view ? -2 : -1)
}

export function dismissRoutedDropdown(navigate, location, dropdownType) {
  if (location.state?.routedDropdown?.type !== dropdownType) return false

  const returnTo = location.state.routedDropdownReturn
  navigate(returnTo?.url || getCurrentUrl(location), {
    replace: true,
    state: returnTo?.state || null,
    preventScrollReset: true,
  })
  return true
}

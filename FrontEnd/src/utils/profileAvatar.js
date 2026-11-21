import { ICONS } from '../assets/icons'
import { API_ORIGIN } from '../api/config'

export function getProfileAvatar(user) {
  const avatar = user?.avatar
  if (typeof avatar === 'string' && avatar.trim()) {
    return avatar.startsWith('/') ? `${API_ORIGIN}${avatar}` : avatar
  }

  return String(user?.sex || '').toLowerCase() === 'female'
    ? ICONS.femaleUser
    : ICONS.maleUser
}

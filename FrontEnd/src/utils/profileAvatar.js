import { ICONS } from '../assets/icons'

const API_ORIGIN = 'http://localhost:5000'

export function getProfileAvatar(user) {
  const avatar = user?.avatar
  if (typeof avatar === 'string' && avatar.trim()) {
    return avatar.startsWith('/') ? `${API_ORIGIN}${avatar}` : avatar
  }

  return String(user?.sex || '').toLowerCase() === 'female'
    ? ICONS.femaleUser
    : ICONS.maleUser
}

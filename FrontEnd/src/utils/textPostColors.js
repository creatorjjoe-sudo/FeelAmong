export const TEXT_POST_BACKGROUNDS = [
  { color: '#ff0000', label: 'Red' },
  { color: '#0000ff', label: 'Blue' },
  { color: '#009933', label: 'Green' },
  { color: '#ff00ff', label: 'Magenta' },
  { color: '#ffff00', label: 'Yellow' },
  { color: '#808080', label: 'Gray' },
  { color: 'linear-gradient(135deg, #ff0000, #0000ff)', label: 'Red and blue gradient' },
  { color: '#006837', label: 'Forest green' },
  { color: 'linear-gradient(135deg, #0000ff, #000000)', label: 'Blue and black gradient' },
]

export const DEFAULT_TEXT_POST_BACKGROUND = '#f1f7f1'
export const NONE_TEXT_POST_BACKGROUND = 'none'

export function isValidTextPostBackground(backgroundColor) {
  return backgroundColor === NONE_TEXT_POST_BACKGROUND
    || TEXT_POST_BACKGROUNDS.some(({ color }) => color === backgroundColor)
    || /^#[0-9a-f]{6}$/i.test(backgroundColor || '')
}

export function isNoneTextPostBackground(backgroundColor) {
  return backgroundColor === NONE_TEXT_POST_BACKGROUND
}

export function getTextPostColor(backgroundColor) {
  if (isNoneTextPostBackground(backgroundColor)) return '#172117'
  if (backgroundColor?.startsWith('linear-gradient(')) return '#fff'
  const fallbackHex = DEFAULT_TEXT_POST_BACKGROUND.slice(1)
  const hex = /^#[0-9a-f]{6}$/i.test(backgroundColor || '') ? backgroundColor.slice(1) : fallbackHex
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  const darkTextChannels = [0x17, 0x21, 0x17].map((channel) => channel / 255).map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ))
  const darkTextLuminance = 0.2126 * darkTextChannels[0] + 0.7152 * darkTextChannels[1] + 0.0722 * darkTextChannels[2]
  const darkContrast = (luminance + 0.05) / (darkTextLuminance + 0.05)
  const lightContrast = 1.05 / (luminance + 0.05)

  return darkContrast >= lightContrast ? '#172117' : '#fff'
}

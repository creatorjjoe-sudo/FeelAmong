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
  { color: 'linear-gradient(135deg, #009933, #000000)', label: 'Green and black gradient' },
  { color: 'linear-gradient(135deg, #ff00ff, #009933 50%, #808080)', label: 'Magenta, green, and gray gradient' },
  { color: 'linear-gradient(135deg, #8a00ff, #ff00ff)', label: 'Purple and magenta gradient' },
  { color: 'linear-gradient(135deg, #ff00ff, #000000)', label: 'Magenta and black gradient' },
  { color: '#003399', label: 'Deep blue' },
  { color: '#dff4ef', label: 'Pale mint' },
  { color: '#d5efff', label: 'Pale blue' },
  { color: '#ffd2d8', label: 'Pale pink' },
]

export const MORE_TEXT_POST_BACKGROUNDS = [
  { color: '#ff8a00', label: 'Orange' },
  { color: '#00a6a6', label: 'Teal' },
  { color: '#7b2cbf', label: 'Purple' },
  { color: '#f4c430', label: 'Gold' },
  { color: '#e63946', label: 'Coral red' },
  { color: '#2a9d8f', label: 'Sea green' },
  { color: '#457b9d', label: 'Slate blue' },
  { color: '#f1c0e8', label: 'Pale lavender' },
]

export const DEFAULT_TEXT_POST_BACKGROUND = '#f1f7f1'
export const NONE_TEXT_POST_BACKGROUND = 'none'

const TEXT_POST_FOREGROUND_COLORS = new Map([
  ['#ff0000', '#fff'],
  ['#0000ff', '#fff'],
  ['#009933', '#fff'],
  ['#ff00ff', '#fff'],
  ['#006837', '#fff'],
  ['#003399', '#fff'],
  ['#ff8a00', '#fff'],
  ['#00a6a6', '#fff'],
  ['#7b2cbf', '#fff'],
  ['#e63946', '#fff'],
  ['#2a9d8f', '#fff'],
  ['#457b9d', '#fff'],
  ['#f1f7f1', '#006837'],
  ['#e5f3ff', '#003399'],
  ['#fff1e6', '#994c00'],
  ['#fff8cc', '#806000'],
  ['#f4eaff', '#572b4a'],
  ['#ffe8ef', '#9d174d'],
  ['#d8f3dc', '#006837'],
  ['#dbeafe', '#003399'],
  ['#dff4ef', '#006837'],
  ['#d5efff', '#003399'],
  ['#ffd2d8', '#9d174d'],
  ['#f1c0e8', '#7b2cbf'],
])

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
  const mappedTextColor = TEXT_POST_FOREGROUND_COLORS.get(backgroundColor?.toLowerCase())
  if (mappedTextColor) return mappedTextColor

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

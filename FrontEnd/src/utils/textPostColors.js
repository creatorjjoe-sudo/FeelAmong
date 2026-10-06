export const TEXT_POST_BACKGROUNDS = [
  { color: '#f1f7f1', label: 'Soft sage' },
  { color: '#e5f3ff', label: 'Sky blue' },
  { color: '#fff1e6', label: 'Peach' },
  { color: '#fff8cc', label: 'Butter yellow' },
  { color: '#f4eaff', label: 'Lavender' },
  { color: '#ffe8ef', label: 'Rose' },
  { color: '#d8f3dc', label: 'Mint' },
  { color: '#dbeafe', label: 'Blue' },
  { color: '#1f2937', label: 'Charcoal' },
  { color: '#173b35', label: 'Forest' },
  { color: '#23395d', label: 'Navy' },
  { color: '#572b4a', label: 'Plum' },
]

export const DEFAULT_TEXT_POST_BACKGROUND = '#f1f7f1'

export function getTextPostColor(backgroundColor) {
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

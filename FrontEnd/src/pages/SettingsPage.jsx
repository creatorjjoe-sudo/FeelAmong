import '../styles/components/dashboard/profile-menu.css'

function SettingsPage({ isDarkMode, setIsDarkMode }) {
  return (
    <main className="settings-placeholder">
      <h1>Settings</h1>
      <p>Choose how FeelAmong looks on this device.</p>
      <section className="theme-setting">
        <span className="theme-setting-copy">
          <strong>Dark mode</strong>
          <small>Use a darker appearance across FeelAmong.</small>
        </span>
        <button
          className="theme-setting-toggle"
          type="button"
          role="switch"
          aria-checked={isDarkMode}
          onClick={() => setIsDarkMode((enabled) => !enabled)}
        >
          <span className="theme-setting-toggle-thumb" />
          <span className="sr-only">{isDarkMode ? 'Turn off dark mode' : 'Turn on dark mode'}</span>
        </button>
      </section>
    </main>
  )
}

export default SettingsPage

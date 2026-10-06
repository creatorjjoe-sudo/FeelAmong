import { ICONS } from '../assets/icons'
import '../styles/components/initial-loading-screen.css'

function InitialLoadingScreen() {
  return (
    <main className="initial-loading-screen" role="status" aria-label="Loading FeelAmong">
      <div className="initial-loading-brand">
        <img src={ICONS.feelLogo} alt="FeelAmong" />
        <span className="initial-loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
      <footer className="initial-loading-footer" aria-label="FeelAmong beta">
        <span>feelamong</span>
        <small>beta</small>
      </footer>
    </main>
  )
}

export default InitialLoadingScreen

import { createPortal } from 'react-dom'
import '../../styles/components/dashboard/loginrequiredmodal.css'

function LoginRequiredModal({ message, onClose, onLogin }) {
  return createPortal(
    <div className="login-required-modal-backdrop" onClick={onClose}>
      <div
        className="login-required-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{message}</h3>
        <div className="login-required-actions">
          <button type="button" className="login-required-close" onClick={onClose}>
            Close
          </button>
          <button type="button" className="login-required-go" onClick={onLogin}>
            Login
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LoginRequiredModal

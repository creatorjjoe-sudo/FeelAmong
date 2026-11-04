import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ICONS } from '../assets/icons'
import '../styles/pages/login.css'
import '../styles/pages/resetpassword.css'

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Step 1: email entry, Step 2: code entry, Step 3: new password
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState(location.state?.resetEmail || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [emailError, setEmailError] = useState(false)
  const [passwordToggle, setPasswordToggle] = useState(false)

  const showPassword = () => setPasswordToggle(!passwordToggle)

  function clearError() {
    if (emailError && EMAIL_REGEX.test(email)) {
      setEmailError(false)
    }
  }

  useEffect(clearError, [email, emailError])

  const goBack = () => {
    if (step === 1) {
      navigate('/', { replace: true })
    } else {
      setStep(step - 1)
      setServerError('')
    }
  }

  // Step 1: request a reset code for the given email.
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setEmailError(true)
      setServerError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not send the reset code')

      setSuccessMessage('If an account with this email exists, a reset code has been sent to it.')
      setStep(2)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify the emailed code, receiving a reset token in exchange.
  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    if (code.trim() === '') return

    setLoading(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not verify the code')

      setResetToken(data.resetToken)
      setSuccessMessage('Code verified. Now choose a new password.')
      setStep(3)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step 3: set the new password.
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (password.trim() === '' || confirmPassword.trim() === '') return
    if (password.length < 6) {
      setServerError('Your new password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setServerError('The passwords do not match')
      return
    }

    setLoading(true)
    setServerError('')
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          resetToken,
          password,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not reset your password')

      setSuccessMessage('Your password has been reset. You can now log in.')
      setTimeout(() => navigate('/', { replace: true }), 2500)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const stepTitle = step === 1
    ? 'Reset your password'
    : step === 2
      ? 'Enter your code'
      : 'Choose a new password'

  const stepHint = step === 1
    ? 'Tell us the email linked to your account and we will send you a reset code.'
    : step === 2
      ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
      : 'Pick something at least 6 characters long.'

  const handleSubmit = step === 1 ? handleEmailSubmit : step === 2 ? handleCodeSubmit : handlePasswordSubmit

  return (
    <div className="reset-password-container">
      <title>Feelamong | Reset password</title>
      <div className="reset-card">
        <div className="reset-top-group">
          <p onClick={goBack} className="reset-go-back">Go back</p>
          <img src={ICONS.feelLogo} alt="" />
        </div>

        <div className="reset-body">
          <h1>{stepTitle}</h1>
          <p className="reset-hint">{stepHint}</p>
          {serverError && <div className="server-error-container" role="alert">{serverError}</div>}
          {successMessage && <div className="reset-success" role="status">{successMessage}</div>}

          <form onSubmit={handleSubmit} className="reset-form">
            {step === 1 && (
              <div className="input-group">
                <input
                  id="input-email"
                  type="text"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <label htmlFor="input-email">Enter email</label>
                <label htmlFor="input-email" className="input-icon">
                  <img src={ICONS.email} alt="" />
                </label>
                <span className={`error-msg-email ${emailError ? 'show' : ''}`}>
                  Please enter a valid email address.
                </span>
              </div>
            )}

            {step === 2 && (
              <div className="input-group">
                <input
                  id="input-password"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder=" "
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  required
                />
                <label htmlFor="input-password">6-digit code</label>
                <label htmlFor="input-password" className="input-icon">
                  <img src={ICONS.lock} alt="" />
                </label>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="input-group">
                  <input
                    id="input-password"
                    type={passwordToggle ? 'text' : 'password'}
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="input-password">New password</label>
                  <label htmlFor="input-password" className="input-icon">
                    <img src={ICONS.lock} alt="" />
                  </label>
                  {password.trim() !== '' && (
                    <img
                      className="pw-toggle"
                      onClick={showPassword}
                      src={passwordToggle ? ICONS.eyeOpen : ICONS.eyeClose}
                      alt=""
                    />
                  )}
                </div>

                <div className="input-group">
                  <input
                    id="input-confirm-password"
                    type={passwordToggle ? 'text' : 'password'}
                    placeholder=" "
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <label htmlFor="input-confirm-password">Confirm new password</label>
                  <label htmlFor="input-confirm-password" className="input-icon">
                    <img src={ICONS.lock} alt="" />
                  </label>
                </div>
              </>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? '...'
                : step === 1
                  ? 'Send code'
                  : step === 2
                    ? 'Verify code'
                    : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage

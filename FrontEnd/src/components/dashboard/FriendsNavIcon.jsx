function FriendsNavIcon({ active = false }) {
  if (active) {
    return (
      <svg viewBox="0 0 24 24" className="is-active" aria-hidden="true">
        <circle cx="8.5" cy="7.5" r="3.5" />
        <path d="M1.5 20.5a7 7 0 0 1 14 0v.5h-14z" />
        <path d="M16.3 4.5a3.1 3.1 0 0 1 0 6.1 3.7 3.7 0 0 0 0-6.1Z" />
        <path d="M16.2 13.2a6.8 6.8 0 0 1 5.8 6.7v1h-5.2a8.6 8.6 0 0 0-2.2-6.1 6.5 6.5 0 0 1 1.6-1.6Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.3 3.3 0 0 1 0 6.3M17 14a5.7 5.7 0 0 1 4.5 5.5" />
    </svg>
  )
}

export default FriendsNavIcon

import '../../styles/components/dashboard/feed-loading-modal.css'

function FeedLoadingModal() {
  return (
    <div className="feed-loading-backdrop" role="presentation">
      <section className="feed-loading-layout" role="dialog" aria-modal="true" aria-label="Loading your feed">
        <aside className="feed-loading-sidebar" aria-hidden="true">
          <div className="feed-loading-search">
            <span className="feed-loading-shimmer feed-loading-sidebar-search-icon" />
            <span className="feed-loading-shimmer feed-loading-sidebar-search-label" />
          </div>
          <div className="feed-loading-nav-option is-active">
            <span className="feed-loading-shimmer feed-loading-sidebar-nav-icon" />
            <span className="feed-loading-shimmer feed-loading-sidebar-label feed-loading-sidebar-label-wide" />
          </div>
          <div className="feed-loading-nav-option">
            <span className="feed-loading-shimmer feed-loading-sidebar-nav-icon" />
            <span className="feed-loading-shimmer feed-loading-sidebar-label feed-loading-sidebar-label-medium" />
          </div>
          <div className="feed-loading-nav-option">
            <span className="feed-loading-shimmer feed-loading-sidebar-nav-icon" />
            <span className="feed-loading-shimmer feed-loading-sidebar-label feed-loading-sidebar-label-short" />
          </div>
          <span className="feed-loading-shimmer feed-loading-sidebar-button" />
          <span className="feed-loading-shimmer feed-loading-sidebar-button feed-loading-sidebar-button-light" />
          <div className="feed-loading-profile">
            <span className="feed-loading-shimmer feed-loading-sidebar-avatar" />
            <span className="feed-loading-shimmer feed-loading-profile-name" />
          </div>
        </aside>

        <header className="feed-loading-mobile-header" aria-hidden="true">
          <span className="feed-loading-shimmer feed-loading-mobile-brand" />
          <div>
            <span className="feed-loading-shimmer feed-loading-mobile-icon" />
            <span className="feed-loading-shimmer feed-loading-mobile-icon" />
            <span className="feed-loading-shimmer feed-loading-mobile-avatar" />
          </div>
        </header>

        <main className="feed-loading-main">
          <article className="feed-loading-card">
            <header className="feed-loading-author">
              <span className="feed-loading-shimmer feed-loading-avatar" />
              <span className="feed-loading-author-copy">
                <span className="feed-loading-shimmer feed-loading-line feed-loading-name" />
                <span className="feed-loading-shimmer feed-loading-line feed-loading-meta" />
              </span>
              <span className="feed-loading-shimmer feed-loading-add-friend" />
            </header>
            <div className="feed-loading-shimmer feed-loading-media" />
            <div className="feed-loading-copy">
              <span className="feed-loading-shimmer feed-loading-line feed-loading-description" />
              <span className="feed-loading-shimmer feed-loading-line feed-loading-description-short" />
            </div>
            <footer className="feed-loading-actions" aria-hidden="true">
              {[0, 1, 2, 3].map((action) => (
                <div key={action}>
                  <span className="feed-loading-shimmer feed-loading-action" />
                  <span className="feed-loading-shimmer feed-loading-count" />
                </div>
              ))}
            </footer>
            <div className="feed-loading-status">
              <p role="status">Loading your feed</p>
              <span className="feed-loading-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </article>
        </main>

        <nav className="feed-loading-mobile-footer" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <span className="feed-loading-shimmer feed-loading-mobile-nav-item" key={item} />
          ))}
        </nav>
      </section>
    </div>
  )
}

export default FeedLoadingModal

import { useEffect, useState } from 'react';
import { FaArrowRight, FaBookmark, FaHeart, FaImage, FaMagnifyingGlass, FaMoon, FaPlus, FaSun, FaVideo, FaXmark } from 'react-icons/fa6';
import { CREATOR_NAME } from '../models/ceejayModel';
import CeejayAvatar from '../components/CeejayAvatar';
import CeejayDashboard from '../components/CeejayDashboard';
import CeejayPostCard from '../components/CeejayPostCard';
import { CeejayAuthModal, CeejayPostModal } from '../components/CeejayModals';

export default function CeejayPage({ controller }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('ceejay-theme') !== 'light');

  useEffect(() => {
    localStorage.setItem('ceejay-theme', darkMode ? 'dark' : 'light');
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const {
    authError,
    authForm,
    authMode,
    authOpen,
    authPrompt,
    authSubmitting,
    categories,
    categoryForm,
    closeAuth,
    closeNotice,
    closePost,
    commentDraft,
    commentStatus,
    commentSubmitting,
    commentManager,
    creatorStats,
    dashboardOpen,
    filteredPosts,
    posts,
    handleFavorite,
    handleAuthSubmit,
    handleComment,
    handleCreateCategory,
    handleCreatePost,
    handleDeleteComment,
    handleLike,
    handleReply,
    handleLogout,
    notice,
    openAuth,
    openFavorites,
    openPost,
    requestSignIn,
    postsError,
    postsLoading,
    postForm,
    refreshPosts,
    searchTerm,
    selectedCategory,
    selectedPost,
    toggleAuthMode,
    updateAuthForm,
    setCategoryForm,
    setCommentDraft,
    setDashboardOpen,
    setPostForm,
    setSearchTerm,
    setSelectedCategory,
    setShowFavorites,
    showFavorites,
    user,
  } = controller;

  return (
    <div className={darkMode ? 'app-shell theme-dark' : 'app-shell'}>
      <header className={dashboardOpen && user?.role === 'creator' ? 'topbar creator-topbar' : 'topbar'}>
        <button type="button" className="brand-block" onClick={() => { setSelectedCategory('All'); setShowFavorites(false); setDashboardOpen(false); }}>
          <CeejayAvatar className="brand-mark" />
          <span className="brand-name">Ceejay</span>
        </button>

        {!(dashboardOpen && user?.role === 'creator') && (
          <label className="search-box">
            <FaMagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              aria-label="Search posts"
              placeholder="Search Ceejay"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        )}

        <div className="user-actions">
          <button
            type="button"
            className="icon-button theme-toggle"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            onClick={() => setDarkMode((enabled) => !enabled)}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          {user ? (
            <>
              {user.role === 'creator' && !dashboardOpen && (
                <button type="button" className="primary-btn small creator-entry" onClick={() => setDashboardOpen(true)}>
                  Creator studio
                </button>
              )}
              <CeejayAvatar className="header-avatar" />
              <button type="button" className="text-button sign-out-button" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <button type="button" className="primary-btn small" onClick={() => openAuth('login')}>Sign in</button>
          )}
        </div>
      </header>

      {notice && (
        <div className="page-alert" role="alert">
          <span>{notice}</span>
          <button type="button" onClick={closeNotice} aria-label="Dismiss message"><FaXmark /></button>
        </div>
      )}

      <div className={dashboardOpen && user?.role === 'creator' ? 'page-layout creator-mode' : 'page-layout'}>
        {!(dashboardOpen && user?.role === 'creator') && (
          <aside className="left-rail">
          <section className="profile-card">
            <CeejayAvatar className="profile-avatar" />
            <div className="profile-card-copy">
              <strong>{CREATOR_NAME}</strong>
              <span>Official creator page</span>
            </div>
          </section>

          <nav className="rail-navigation" aria-label="Feed filters">
            <button type="button" className={selectedCategory === 'All' && !showFavorites && !dashboardOpen ? 'rail-link active' : 'rail-link'} onClick={() => { setSelectedCategory('All'); setShowFavorites(false); setDashboardOpen(false); }}>
              <FaImage /> <span>For you</span>
            </button>
            <button type="button" className={showFavorites ? 'rail-link active' : 'rail-link'} onClick={openFavorites}>
              <FaBookmark /> <span>Favorites</span>
            </button>
            {categories.filter((category) => category !== 'All').map((category) => (
              <button key={category} type="button" className={selectedCategory === category && !showFavorites && !dashboardOpen ? 'rail-link active' : 'rail-link'} onClick={() => { setSelectedCategory(category); setShowFavorites(false); setDashboardOpen(false); }}>
                {category === 'Music' ? <FaVideo /> : <FaImage />} <span>{category}</span>
              </button>
            ))}
          </nav>

          <section className="rail-note">
            <span className="rail-note-icon"><FaHeart /></span>
            <p>Music, moments, and updates from Ceejay.</p>
          </section>

          <footer className="rail-footer">
            <a href="https://www.facebook.com/profile.php?id=100084358185812" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://www.youtube.com/@ceejaydamafia99" target="_blank" rel="noreferrer">YouTube</a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
            <span>© {new Date().getFullYear()} Ceejay</span>
          </footer>
          </aside>
        )}

        <main className="feed-column">
          {dashboardOpen && user?.role === 'creator' ? (
            <CeejayDashboard
              categories={categories}
              categoryForm={categoryForm}
              comments={commentManager}
              onBack={() => setDashboardOpen(false)}
              onCategoryChange={setCategoryForm}
              onCreateCategory={handleCreateCategory}
              onCreatePost={handleCreatePost}
              onDeleteComment={handleDeleteComment}
              onReply={handleReply}
              onPostChange={setPostForm}
              posts={posts}
              postForm={postForm}
              stats={creatorStats}
            />
          ) : (
            <>
              <section className="stories-card" aria-label="Explore topics">
                <button type="button" className="story-item" onClick={() => { setSelectedCategory('All'); setShowFavorites(false); }}>
                  <span className="story-ring"><CeejayAvatar className="story-avatar" /></span>
                  <span>All posts</span>
                </button>
                {categories.filter((category) => category !== 'All').slice(0, 7).map((category, index) => (
                  <button key={category} type="button" className="story-item" onClick={() => { setSelectedCategory(category); setShowFavorites(false); }}>
                    <span className={`story-ring story-ring-${index % 4}`}><span className="story-initial">{category.slice(0, 1)}</span></span>
                    <span>{category}</span>
                  </button>
                ))}
              </section>

              <section className="feed-heading">
                <div>
                  <span className="eyebrow">CEEJAY'S COMMUNITY</span>
                  <h1>{showFavorites ? 'Your favorites' : 'Latest posts'}</h1>
                  <p>Music, moments, and updates from {CREATOR_NAME}.</p>
                </div>
                {user?.role === 'creator' && (
                  <button type="button" className="primary-btn create-post-button" onClick={() => setDashboardOpen(true)}><FaPlus /> Create post</button>
                )}
              </section>

              <div className="toolbar-row" role="group" aria-label="Filter posts by topic">
                {categories.map((category) => (
                  <button key={category} type="button" className={selectedCategory === category && !showFavorites ? 'filter-chip active' : 'filter-chip'} onClick={() => { setSelectedCategory(category); setShowFavorites(false); }}>
                    {category}
                  </button>
                ))}
              </div>

              <section className="feed-list" aria-label="Posts">
                {postsError ? (
                  <div className="feed-message error-box" role="alert">
                    <p>{postsError}</p>
                    <button type="button" className="text-button" onClick={refreshPosts}>Try again</button>
                  </div>
                ) : postsLoading ? (
                  <div className="feed-message" role="status">Loading posts…</div>
                ) : filteredPosts.length === 0 ? (
                  <div className="feed-message">
                    <h2>{showFavorites ? 'No favorites yet' : searchTerm ? 'No matching posts' : 'Nothing here yet'}</h2>
                    <p>{showFavorites ? 'Save a post with the bookmark icon and it will appear here.' : searchTerm ? 'Try another search.' : 'Check back soon for the latest from Ceejay.'}</p>
                  </div>
                ) : filteredPosts.map((post) => (
                  <CeejayPostCard
                    key={post._id || post.id}
                    post={post}
                    onComment={() => { if (requestSignIn('comment')) openPost(post._id || post.id); }}
                    onFavorite={handleFavorite}
                    onLike={handleLike}
                    onOpen={openPost}
                  />
                ))}
              </section>
            </>
          )}
        </main>

        {!(dashboardOpen && user?.role === 'creator') && (
          <aside className="right-rail">
          <section className="profile-card right-profile-card">
            <CeejayAvatar className="profile-avatar" />
            <div className="profile-card-copy">
              <strong>{CREATOR_NAME}</strong>
              <span>Official creator page</span>
            </div>
            <span className="verified-mark" aria-label="Official">✓</span>
          </section>

          <section className="suggestion-card">
            <div className="section-title"><h2>Stay connected</h2></div>
            <a href="https://www.facebook.com/profile.php?id=100084358185812" target="_blank" rel="noreferrer" className="social-link">
              <span className="social-icon facebook-icon">f</span>
              <span><strong>Facebook</strong><small>Follow Ceejay</small></span>
              <FaArrowRight />
            </a>
            <a href="https://www.youtube.com/@ceejaydamafia99" target="_blank" rel="noreferrer" className="social-link">
              <span className="social-icon youtube-icon"><FaVideo /></span>
              <span><strong>YouTube</strong><small>Watch the latest</small></span>
              <FaArrowRight />
            </a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" className="social-link">
              <span className="social-icon instagram-icon">◎</span>
              <span><strong>Instagram</strong><small>More from Ceejay</small></span>
              <FaArrowRight />
            </a>
          </section>

          <p className="right-rail-footer">A place for Ceejay’s latest music, videos, and community.</p>
          </aside>
        )}
      </div>

      {selectedPost && (
        <CeejayPostModal
          commentDraft={commentDraft}
          commentStatus={commentStatus}
          commentSubmitting={commentSubmitting}
          isAuthenticated={Boolean(user)}
          onChangeComment={setCommentDraft}
          onClose={closePost}
          onComment={handleComment}
          onFavorite={handleFavorite}
          onLike={handleLike}
          onReply={handleReply}
          onRequireSignIn={() => requestSignIn('comment')}
          onRequireReplySignIn={() => requestSignIn('reply')}
          post={selectedPost}
        />
      )}

      {authOpen && (
        <CeejayAuthModal
          authError={authError}
          authForm={authForm}
          authMode={authMode}
          authPrompt={authPrompt}
          authSubmitting={authSubmitting}
          onChange={updateAuthForm}
          onClose={closeAuth}
          onModeChange={toggleAuthMode}
          onSubmit={handleAuthSubmit}
        />
      )}
    </div>
  );
}

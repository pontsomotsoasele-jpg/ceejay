import { useState } from 'react';
import { FaChartLine, FaComments, FaEye, FaPlus, FaSliders } from 'react-icons/fa6';
import CeejayCommentThread from './CeejayCommentThread';
import { getPostDisplayTitle } from '../models/ceejayModel';

export default function CeejayDashboard({
  categories,
  categoryForm,
  comments,
  onBack,
  onCategoryChange,
  onCreateCategory,
  onCreatePost,
  onDeleteComment,
  onPostChange,
  onReply,
  posts,
  postForm,
  stats,
}) {
  const [activeSection, setActiveSection] = useState('overview');
  const commentThreads = comments
    .filter((comment) => !comment.parentId)
    .map((comment) => ({
      ...comment,
      replies: comments.filter((reply) => String(reply.parentId) === String(comment.id)),
    }));

  return (
    <section className="dashboard-layout">
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">CREATOR STUDIO</span>
          <h1>Creator dashboard</h1>
          <p>Manage publishing, organize topics, and stay close to your community.</p>
        </div>
        <button type="button" className="primary-btn viewer-preview-button" onClick={onBack}>
          <FaEye /> View viewer portal
        </button>
      </header>

      <div className="creator-workspace">
        <nav className="creator-menu" aria-label="Creator dashboard menu">
          <span className="creator-menu-label">WORKSPACE</span>
          <button type="button" className={activeSection === 'overview' ? 'creator-menu-item active' : 'creator-menu-item'} aria-current={activeSection === 'overview' ? 'page' : undefined} onClick={() => setActiveSection('overview')}>
            <FaChartLine /> <span>Overview</span>
          </button>
          <button type="button" className={activeSection === 'create' ? 'creator-menu-item active' : 'creator-menu-item'} aria-current={activeSection === 'create' ? 'page' : undefined} onClick={() => setActiveSection('create')}>
            <FaPlus /> <span>Create post</span>
          </button>
          <button type="button" className={activeSection === 'content' ? 'creator-menu-item active' : 'creator-menu-item'} aria-current={activeSection === 'content' ? 'page' : undefined} onClick={() => setActiveSection('content')}>
            <FaEye /> <span>Content views</span>
          </button>
          <button type="button" className={activeSection === 'comments' ? 'creator-menu-item active' : 'creator-menu-item'} aria-current={activeSection === 'comments' ? 'page' : undefined} onClick={() => setActiveSection('comments')}>
            <FaComments /> <span>Comments</span>
            <span className="creator-menu-count">{stats.comments}</span>
          </button>
          <button type="button" className={activeSection === 'customize' ? 'creator-menu-item active' : 'creator-menu-item'} aria-current={activeSection === 'customize' ? 'page' : undefined} onClick={() => setActiveSection('customize')}>
            <FaSliders /> <span>Customize</span>
          </button>
        </nav>

        <div className="creator-view">
          {activeSection === 'overview' && (
            <>
              <div className="stat-grid">
                <div className="stat-card"><span>Published posts</span><strong>{stats.posts}</strong></div>
                <div className="stat-card"><span>Total views</span><strong>{stats.views.toLocaleString()}</strong></div>
                <div className="stat-card"><span>Viewer comments</span><strong>{stats.comments}</strong></div>
                <div className="stat-card"><span>Topics</span><strong>{stats.categories}</strong></div>
              </div>
              <section className="dashboard-panel creator-welcome">
                <span className="eyebrow">YOUR CREATOR SPACE</span>
                <h2>What would you like to do?</h2>
                <p>Your studio is separate from the public feed. Create a post or review conversations here, then preview the viewer portal whenever you are ready.</p>
                <div className="creator-quick-actions">
                  <button type="button" className="primary-btn" onClick={() => setActiveSection('create')}><FaPlus /> Create a post</button>
                  <button type="button" className="ghost-btn" onClick={() => setActiveSection('comments')}><FaComments /> Review comments</button>
                </div>
              </section>
              <section className="dashboard-panel overview-comments">
                <div className="section-title"><h2>Recent comments</h2><button type="button" className="text-button" onClick={() => setActiveSection('comments')}>See all</button></div>
                <div className="comment-list">
                  {commentThreads.length === 0 ? (
                    <div className="empty-card">New viewer comments will appear here.</div>
                  ) : commentThreads.slice(0, 3).map((comment) => (
                    <article key={comment.id} className="comment-card">
                      <strong>{comment.author}</strong>
                      <span className="comment-post-title">{comment.postTitle}</span>
                      <p>{comment.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeSection === 'content' && (
            <section className="dashboard-panel">
              <div className="creator-section-heading">
                <div><span className="eyebrow">PERFORMANCE</span><h2>Content views</h2></div>
                <p>Views are recorded whenever someone opens a post.</p>
              </div>
              <div className="content-analytics-list">
                {posts.length === 0 ? (
                  <div className="empty-card">Published content views will appear here.</div>
                ) : [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).map((post) => (
                  <article key={post._id || post.id} className="content-analytics-card">
                    <div className="content-analytics-copy">
                      <strong>{getPostDisplayTitle(post) || post.description || 'Untitled post'}</strong>
                      <span>{post.category}</span>
                    </div>
                    <span className="content-analytics-views"><FaEye /> {(post.views || 0).toLocaleString()} views</span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'create' && (
            <section className="dashboard-panel">
              <div className="creator-section-heading">
                <div><span className="eyebrow">PUBLISH</span><h2>Create a post</h2></div>
                <p>Text-only posts work too. Add a link or image only when you want media.</p>
              </div>
              <form className="stack-form" onSubmit={onCreatePost}>
                <label htmlFor="post-title">Title</label>
                <input id="post-title" required value={postForm.title} onChange={(event) => onPostChange((current) => ({ ...current, title: event.target.value }))} placeholder="Give your post a title" />
                <label htmlFor="post-description">Caption</label>
                <textarea id="post-description" value={postForm.description} onChange={(event) => onPostChange((current) => ({ ...current, description: event.target.value }))} placeholder="Share an update with your viewers..." rows="5" />
                <label htmlFor="post-category">Topic</label>
                <select id="post-category" required value={postForm.category} onChange={(event) => onPostChange((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">Choose a topic</option>
                  {categories.filter((category) => category !== 'All').map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <label htmlFor="post-source">Platform</label>
                <select id="post-source" value={postForm.source} onChange={(event) => onPostChange((current) => ({ ...current, source: event.target.value }))}>
                  <option value="Original">Original</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Link">Link</option>
                </select>
                <label htmlFor="post-url">Video or post link <span>(optional)</span></label>
                <input id="post-url" type="url" value={postForm.url} onChange={(event) => onPostChange((current) => ({ ...current, url: event.target.value }))} placeholder="https://" />
                <label htmlFor="post-thumbnail">Image URL <span>(optional)</span></label>
                <input id="post-thumbnail" type="url" value={postForm.thumbnailUrl} onChange={(event) => onPostChange((current) => ({ ...current, thumbnailUrl: event.target.value }))} placeholder="https://" />
                <button type="submit" className="primary-btn full-width"><FaPlus /> Publish post</button>
              </form>
            </section>
          )}

          {activeSection === 'comments' && (
            <section className="dashboard-panel">
              <div className="creator-section-heading">
                <div><span className="eyebrow">COMMUNITY</span><h2>Manage comments</h2></div>
                <p>Keep up with what viewers are saying on your posts.</p>
              </div>
              <div className="comment-list">
                {commentThreads.length === 0 ? (
                  <div className="empty-card">No comments yet. Viewer conversations will show up here.</div>
                ) : commentThreads.map((comment) => (
                  <div key={comment.id} className="comment-card">
                    <span className="comment-post-title">{comment.postTitle}</span>
                    <CeejayCommentThread
                      comment={comment}
                      isAuthenticated
                      onDelete={onDeleteComment}
                      onReply={onReply}
                      postId={comment.postId}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === 'customize' && (
            <div className="dashboard-panels customize-panels">
              <section className="dashboard-panel">
                <div className="creator-section-heading">
                  <div><span className="eyebrow">ORGANIZE</span><h2>Customize topics</h2></div>
                  <p>Topics help viewers find the posts they care about.</p>
                </div>
                <form className="inline-form" onSubmit={onCreateCategory}>
                  <input aria-label="New topic" required value={categoryForm} onChange={(event) => onCategoryChange(event.target.value)} placeholder="New topic name" />
                  <button type="submit" className="primary-btn terser" aria-label="Add topic"><FaPlus /></button>
                </form>
                <div className="topic-list">
                  {categories.filter((category) => category !== 'All').map((category) => <span key={category} className="filter-chip">{category}</span>)}
                </div>
              </section>
              <section className="dashboard-panel">
                <div className="creator-section-heading">
                  <div><span className="eyebrow">VIEWER EXPERIENCE</span><h2>Page appearance</h2></div>
                  <p>Use the sun or moon control in the top bar to preview the light and dark themes. Your choice is saved on this browser.</p>
                </div>
                <button type="button" className="ghost-btn" onClick={onBack}><FaEye /> Preview viewer portal</button>
              </section>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

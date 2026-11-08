import { useEffect, useRef } from 'react';
import { FaArrowRight, FaBookmark, FaEye, FaHeart, FaPaperPlane, FaRightToBracket, FaXmark } from 'react-icons/fa6';
import { getPostDisplayTitle, getVideoEmbedUrl, getVideoThumbnail } from '../models/ceejayModel';
import CeejayAvatar from './CeejayAvatar';
import CeejayCommentThread from './CeejayCommentThread';
import CeejayTextPost from './CeejayTextPost';

export function CeejayAuthModal({
  authError,
  authForm,
  authMode,
  authPrompt,
  authSubmitting,
  onChange,
  onClose,
  onModeChange,
  onSubmit,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="close-modal" onClick={onClose} aria-label="Close sign in"><FaXmark /></button>
        <div className="auth-heading">
          <CeejayAvatar className="auth-avatar" />
          <span>{authMode === 'login' ? 'Welcome back' : 'Join the community'}</span>
          <h2 id="auth-title">{authMode === 'login' ? 'Sign in to Ceejay' : 'Create your account'}</h2>
          {authPrompt && authMode === 'login' && <p className="auth-prompt">{authPrompt}</p>}
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === 'register' && (
            <label>
              Display name
              <input type="text" autoComplete="name" required value={authForm.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" />
            </label>
          )}
          <label>
            Email address
            <input type="email" autoComplete="email" required value={authForm.email} onChange={(event) => onChange((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={authForm.password} onChange={(event) => onChange((current) => ({ ...current, password: event.target.value }))} placeholder="Enter your password" />
          </label>
          {authError && <div className="error-box" role="alert" aria-live="assertive">{authError}</div>}
          <button type="submit" className="primary-btn full-width" disabled={authSubmitting}>
            <FaRightToBracket />
            {authSubmitting
              ? authMode === 'login' ? 'Signing in...' : 'Creating account...'
              : authMode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          <span>{authMode === 'login' ? 'New to the community?' : 'Already have an account?'}</span>
          <button type="button" className="text-button" onClick={onModeChange}>
            {authMode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </section>
    </div>
  );
}

export function CeejayPostModal({
  commentDraft,
  commentStatus,
  commentSubmitting,
  isAuthenticated,
  onChangeComment,
  onClose,
  onComment,
  onFavorite,
  onLike,
  onReply,
  onRequireSignIn,
  onRequireReplySignIn,
  post,
}) {
  const latestCommentRef = useRef(null);
  const comments = post?.comments || [];
  const commentEntryCount = comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0);

  useEffect(() => {
    latestCommentRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [commentEntryCount]);

  if (!post) return null;

  const embedUrl = getVideoEmbedUrl(post);
  const thumbnailUrl = getVideoThumbnail(post);
  const displayTitle = getPostDisplayTitle(post);
  const commentCount = post.commentsCount ?? comments.length;
  const isTextPost = !embedUrl && !thumbnailUrl;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="modal-card" role="dialog" aria-modal="true" aria-label={displayTitle || 'Post details'}>
        <button type="button" className="close-modal" onClick={onClose} aria-label="Close post"><FaXmark /></button>
        <div className={isTextPost ? 'modal-hero text-only-hero' : 'modal-hero'}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${displayTitle || 'Post'} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : thumbnailUrl ? (
            <img src={thumbnailUrl} alt={`${displayTitle || 'Post'} video preview`} />
          ) : (
            <CeejayTextPost className="in-modal" post={post} titleId="post-modal-title" />
          )}
        </div>

        <div className="modal-content">
          <div className="modal-topline">
            <CeejayAvatar className="modal-avatar" />
            <div><strong>{post.author || 'Ceejay Da Mafia'}</strong><span>{post.category}{post.source ? ` · ${post.source}` : ''}</span></div>
          </div>
          {!isTextPost && (
            <>
              {displayTitle && <h2>{displayTitle}</h2>}
              {post.description && <p>{post.description}</p>}
            </>
          )}

          <div className="detail-actions">
            <button type="button" className={post.likedByMe ? 'mini-action active' : 'mini-action'} onClick={() => onLike(post._id)}>
              <FaHeart /> {post.likedByMe ? 'Liked' : 'Like'} · {post.likesCount || 0}
            </button>
            <span className="mini-action"><FaEye /> {post.views || 0} views</span>
            <button type="button" className={post.favoritedByMe ? 'mini-action favorite-action saved' : 'mini-action favorite-action'} onClick={() => onFavorite(post._id)}>
              <FaBookmark /> {post.favoritedByMe ? 'Saved' : 'Favorite'}
            </button>
            {post.url && <a href={post.url} target="_blank" rel="noreferrer" className="mini-action link-btn"><FaArrowRight /> Open link</a>}
          </div>

          <section className="comment-block">
            <h3>Comments <span className="comment-count">{commentCount}</span></h3>
            <div className="comment-list small-list">
              {comments.length ? (
                comments.map((comment, index) => (
                  <CeejayCommentThread
                    key={comment.id || comment._id}
                    comment={{ ...comment, postId: post._id }}
                    itemRef={index === comments.length - 1 ? latestCommentRef : null}
                    isAuthenticated={isAuthenticated}
                    onReply={onReply}
                    onRequireReplySignIn={onRequireReplySignIn}
                    postId={post._id}
                  />
                ))
              ) : (
                <p className="empty-comment">No comments yet. Be the first to share a thought.</p>
              )}
            </div>

            {commentStatus && (
              <p className={`comment-feedback ${commentStatus.type}`} role={commentStatus.type === 'error' ? 'alert' : 'status'}>
                {commentStatus.message}
              </p>
            )}

            {isAuthenticated ? (
              <form
                className="comment-form"
                aria-busy={commentSubmitting}
                onSubmit={(event) => { event.preventDefault(); onComment(post._id); }}
              >
                <textarea
                  value={commentDraft}
                  onChange={(event) => onChangeComment(event.target.value)}
                  placeholder="Share a thought..."
                  rows="2"
                  maxLength={1000}
                  required
                  disabled={commentSubmitting}
                  aria-label="Write a comment"
                />
                <div className="comment-compose-footer">
                  <span>{commentDraft.length}/1000</span>
                  <button type="submit" className="primary-btn" disabled={commentSubmitting || !commentDraft.trim()}>
                    <FaPaperPlane /> {commentSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="primary-btn sign-in-comment" onClick={onRequireSignIn}>
                <FaRightToBracket /> Sign in to comment
              </button>
            )}
          </section>
        </div>
      </article>
    </div>
  );
}

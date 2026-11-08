import { useState } from 'react';
import { FaReply, FaTrash } from 'react-icons/fa6';

function getInitials(name = '') {
  return name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatTime(createdAt) {
  if (!createdAt) return 'Just now';
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7
    ? `${days}d ago`
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}

function CommentLine({ comment, onDelete }) {
  return (
    <div className="comment-item">
      <span className="comment-avatar-mini" aria-hidden="true">{getInitials(comment.author)}</span>
      <div className="comment-item-content">
        <div className="comment-item-heading">
          <strong>{comment.author || 'Community member'}</strong>
          <time dateTime={comment.createdAt || undefined}>{formatTime(comment.createdAt)}</time>
        </div>
        <p>{comment.body}</p>
        {onDelete && (
          <button type="button" className="comment-delete-button" onClick={() => onDelete(comment.id)} aria-label={`Delete comment by ${comment.author}`}>
            <FaTrash />
          </button>
        )}
      </div>
    </div>
  );
}

function ReplyComposer({ onCancel, onSubmit }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submitReply(event) {
    event.preventDefault();
    const reply = body.trim();
    if (!reply || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      if (await onSubmit(reply)) {
        setBody('');
        onCancel();
      } else {
        setError('Your reply was not posted. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="reply-form" onSubmit={submitReply}>
      <textarea
        aria-label="Write a reply"
        value={body}
        onChange={(event) => { setBody(event.target.value); setError(''); }}
        placeholder="Write a reply..."
        maxLength={1000}
        rows="2"
        required
        disabled={submitting}
      />
      {error && <span className="reply-error" role="alert">{error}</span>}
      <div className="reply-form-actions">
        <button type="button" className="text-button" onClick={onCancel} disabled={submitting}>Cancel</button>
        <button type="submit" className="primary-btn" disabled={submitting || !body.trim()}>
          {submitting ? 'Replying...' : 'Reply'}
        </button>
      </div>
    </form>
  );
}

export default function CeejayCommentThread({
  comment,
  itemRef,
  isAuthenticated,
  onDelete,
  onReply,
  onRequireReplySignIn,
  postId,
}) {
  const [replying, setReplying] = useState(false);
  const replies = comment.replies || [];

  function startReply() {
    if (!isAuthenticated) {
      onRequireReplySignIn?.();
      return;
    }
    setReplying((current) => !current);
  }

  return (
    <article className="comment-thread">
      <div className="comment-thread-main" ref={itemRef}>
        <CommentLine comment={comment} onDelete={onDelete} />
        <div className="comment-thread-actions">
          <button type="button" className="reply-button" onClick={startReply}>
            <FaReply /> Reply
          </button>
        </div>
        {replying && (
          <ReplyComposer
            onCancel={() => setReplying(false)}
            onSubmit={(body) => onReply(postId || comment.postId, comment.id, body)}
          />
        )}
      </div>
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentLine key={reply.id} comment={reply} onDelete={onDelete} />
          ))}
        </div>
      )}
    </article>
  );
}

export { ReplyComposer };

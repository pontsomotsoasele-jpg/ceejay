import { useState } from 'react';
import { FaArrowRight, FaBookmark, FaCommentDots, FaHeart } from 'react-icons/fa6';
import { CREATOR_NAME, getPostDisplayTitle, getVideoEmbedUrl, getVideoThumbnail } from '../models/ceejayModel';
import CeejayAvatar from './CeejayAvatar';
import CeejayTextPost from './CeejayTextPost';

export default function CeejayPostCard({ post, onComment, onFavorite, onOpen, onLike }) {
  const postId = post._id || post.id;
  const displayTitle = getPostDisplayTitle(post);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const thumbnailUrl = getVideoThumbnail(post);
  const facebookEmbedUrl = !post.thumbnailUrl && post.source === 'Facebook' ? getVideoEmbedUrl(post) : '';
  const isTextPost = !facebookEmbedUrl && (!thumbnailUrl || thumbnailFailed);

  return (
    <article className="post-card">
      <header className="post-header">
        <CeejayAvatar className="post-avatar" />
        <div className="post-author">
          <strong>{CREATOR_NAME}</strong>
          <span>{post.category}{post.source ? ` · ${post.source}` : ''}</span>
        </div>
        {post.source && <span className="post-source">{post.source}</span>}
      </header>

      {facebookEmbedUrl ? (
        <div className="media-box has-video-embed">
          <iframe
            src={facebookEmbedUrl}
            title={`${displayTitle || 'Post'} video`}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <button type="button" className="post-visual-button" onClick={() => onOpen(postId)} aria-label={`Open ${displayTitle || 'post'}`}>
          {isTextPost ? (
            <CeejayTextPost post={post} />
          ) : (
            <div className="media-box has-thumb">
              <img src={thumbnailUrl} alt={`${post.title} video preview`} loading="lazy" onError={() => setThumbnailFailed(true)} />
              {(post.source === 'YouTube' || post.source === 'Facebook') && <span className="play-badge">Watch</span>}
            </div>
          )}
        </button>
      )}

      <div className="post-body">
        <div className="post-actions">
          <button
            type="button"
            className={post.likedByMe ? 'mini-action active' : 'mini-action'}
            onClick={() => onLike(postId)}
            aria-label={`${post.likedByMe ? 'Unlike' : 'Like'} post, ${post.likesCount || 0} likes`}
          >
            <FaHeart /> <span>{post.likedByMe ? 'Liked' : 'Like'}</span><strong className="like-count">{post.likesCount || 0}</strong>
          </button>
          <button type="button" className="mini-action" onClick={() => onComment(postId)}>
            <FaCommentDots /> <span>Comment</span>
          </button>
          <button
            type="button"
            className={post.favoritedByMe ? 'mini-action favorite-action saved' : 'mini-action favorite-action'}
            onClick={() => onFavorite(postId)}
            aria-label={post.favoritedByMe ? 'Remove from favorites' : 'Add to favorites'}
          >
            <FaBookmark /> <span>{post.favoritedByMe ? 'Saved' : 'Favorite'}</span>
          </button>
          {post.url && <a href={post.url} target="_blank" rel="noreferrer" className="mini-action link-btn"><FaArrowRight /> <span>Open</span></a>}
        </div>

        <div className="post-engagement">
          <span>{post.views || 0} views</span>
        </div>
        {!isTextPost && (
          <>
            {displayTitle && <h2>{displayTitle}</h2>}
            {post.description && <p className="post-caption">{post.description}</p>}
          </>
        )}
        <button type="button" className="comment-preview" onClick={() => onOpen(postId)}>
          View all {post.commentsCount || 0} comments
        </button>
      </div>
    </article>
  );
}

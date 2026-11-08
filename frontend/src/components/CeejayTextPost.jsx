export default function CeejayTextPost({ className = '', post, titleId }) {
  return (
    <div className={`text-post-visual ${className}`.trim()} aria-label="Text post">
      <div className="text-post-copy">
        <span className="text-post-kicker">A note from Ceejay</span>
        <h2 id={titleId}>{post.title}</h2>
        {post.description && <p>{post.description}</p>}
      </div>
    </div>
  );
}

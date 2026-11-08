import { useState } from 'react';
import { CREATOR_NAME, CREATOR_PROFILE_IMAGE } from '../models/ceejayModel';

export default function CeejayAvatar({ className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = CREATOR_NAME.split(' ').map((part) => part[0]).join('').slice(0, 2);

  return (
    <span className={`creator-avatar ${className}`} role="img" aria-label={CREATOR_NAME}>
      {CREATOR_PROFILE_IMAGE && !imageFailed ? (
        <img src={CREATOR_PROFILE_IMAGE} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

import { useState } from 'react';

export function ProfileAvatar({ name = 'Member', photoUrl, className = 'avatar avatar--mint', label }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const initials = name.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'M';
  return photoUrl && failedUrl !== photoUrl
    ? <img className={`${className} profile-avatar`} src={photoUrl} alt={label ?? `${name}'s profile photo`} referrerPolicy="no-referrer" onError={() => setFailedUrl(photoUrl)} />
    : <span className={className} aria-label={label}>{initials}</span>;
}

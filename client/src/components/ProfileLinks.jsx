import { Github, Linkedin } from 'lucide-react';

export function ProfileLinks({ githubUrl, linkedinUrl }) {
  if (!githubUrl && !linkedinUrl) return null;
  return <div className="profile-links">
    {githubUrl && <a href={githubUrl} target="_blank" rel="noreferrer"><Github />GitHub profile</a>}
    {linkedinUrl && <a href={linkedinUrl} target="_blank" rel="noreferrer"><Linkedin />LinkedIn profile</a>}
  </div>;
}

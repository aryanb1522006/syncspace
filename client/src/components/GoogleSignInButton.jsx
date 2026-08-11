import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const allowedDomain = (import.meta.env.VITE_AUTH_ALLOWED_EMAIL_DOMAIN ?? 'thapar.edu').replace(/^@/, '');

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector('script[data-syncspace-google]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.syncspaceGoogle = 'true';
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.append(script);
  });
}

export function GoogleSignInButton({ onAuthenticated, onError }) {
  const buttonRef = useRef(null);
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(Boolean(clientId));

  useEffect(() => {
    if (!clientId || !buttonRef.current) return undefined;
    let active = true;

    loadGoogleIdentity()
      .then(() => {
        if (!active) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          hd: allowedDomain,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            try {
              setLoading(true);
              const user = await googleLogin(credential);
              onAuthenticated?.(user);
            } catch (error) {
              onError?.(error.message);
            } finally {
              if (active) setLoading(false);
            }
          }
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: 'continue_with',
          width: Math.min(buttonRef.current.clientWidth || 360, 400)
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        onError?.('Google sign-in could not load. Check your connection and try again.');
      });

    return () => {
      active = false;
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [googleLogin, onAuthenticated, onError]);

  if (!clientId) return null;
  return <div className="google-auth">
    <div ref={buttonRef} className="google-auth__button" aria-label="Continue with Google" />
    {loading && <span className="google-auth__loading">Loading secure Google sign-in...</span>}
    <small>Only verified @{allowedDomain} Google Workspace accounts are accepted.</small>
  </div>;
}

export const googleSignInConfigured = Boolean(clientId);

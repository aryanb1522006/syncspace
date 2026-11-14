import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_EXPIRED_EVENT, clearStoredSession, getTokenExpiry, readStoredSession } from '../api/authSession.js';
import { api } from '../api/resources.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [initialSession] = useState(readStoredSession);
  const [user, setUser] = useState(initialSession.user);
  const [sessionExpired, setSessionExpired] = useState(initialSession.expired);
  const profileRevision = useRef(0);
  const userId = user?.id;

  // Refresh presentation fields only. College identity, permissions and token
  // always remain those of the existing SyncSpace session.
  const syncProfile = useCallback((profile) => {
    if (!profile?.id) return;
    profileRevision.current += 1;
    setUser((current) => {
      if (!current || (profile.user_id != null && Number(profile.user_id) !== Number(current.id))
        || (current.profile?.id != null && Number(current.profile.id) !== Number(profile.id))) return current;
      const avatarUrl = profile.avatar_url ?? null;
      if (current.profile?.name === profile.name && current.profile?.avatar_url === avatarUrl) return current;
      return { ...current, profile: { ...current.profile, id: profile.id, name: profile.name, avatar_url: avatarUrl } };
    });
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem('syncspace-user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const revision = profileRevision.current;
    api.getMe().then(({ student }) => {
      if (active && revision === profileRevision.current) syncProfile(student);
    }).catch(() => {});
    return () => { active = false; };
  }, [userId, syncProfile]);

  useEffect(() => {
    const expire = () => {
      clearStoredSession();
      setSessionExpired(true);
      setUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expire);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const expiresAt = getTokenExpiry(localStorage.getItem('syncspace-token'));
    if (!expiresAt) return undefined;
    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      return undefined;
    }
    const timer = window.setTimeout(() => window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)), Math.min(delay, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [user]);

  const commit = (payload) => {
    localStorage.setItem('syncspace-token', payload.token);
    localStorage.setItem('syncspace-user', JSON.stringify(payload.user));
    setSessionExpired(false);
    setUser(payload.user);
    return payload.user;
  };

  const value = useMemo(() => ({
    user,
    sessionExpired,
    syncProfile,
    login: async (input) => commit(await api.login(input)),
    register: async (input) => commit(await api.register(input)),
    googleLogin: async (credential) => commit(await api.googleLogin(credential)),
    logout: () => {
      clearStoredSession();
      setSessionExpired(false);
      setUser(null);
    }
  }), [sessionExpired, user, syncProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

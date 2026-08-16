import { Compass, FileText, FolderKanban, LogOut, PlusCircle, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from './Logo.jsx';
import { NotificationMenu } from './NotificationMenu.jsx';

export function AppShell({ children, rightRail, className = '' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    let active = true;
    const refresh = () => api.listTeams()
      .then(({ teams: rows }) => { if (active) setTeams(rows); })
      .catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const teamRoute = teams.length === 1 ? `/team/${teams[0].id}` : '/teams';
  const nav = [
    { to: '/dashboard', label: 'Discover', icon: Compass },
    { to: '/applications', label: 'Applications', icon: FileText },
    { to: '/projects/mine', label: 'My projects', icon: FolderKanban },
    { to: teamRoute, label: teams.length > 1 ? `Teams (${teams.length})` : 'My team', icon: UsersRound, team: true },
    ...(user?.isAdmin ? [{ to: '/admin/projects', label: 'Admin control', icon: ShieldCheck }] : [])
  ];
  const name = user?.profile?.name ?? user?.name ?? user?.email?.split('@')[0] ?? 'SyncSpace member';
  const email = user?.email ?? '';
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const navClass = (item) => ({ isActive }) => isActive || (item.team && (location.pathname === '/teams' || location.pathname.startsWith('/team/'))) ? 'active' : undefined;

  const renderNavItems = () => nav.map((item) => {
    const Icon = item.icon;
    return <NavLink key={item.label} to={item.to} className={navClass(item)}><Icon /><span>{item.label}</span></NavLink>;
  });

  return <div className={`app-shell ${className}`}>
    <aside className="sidebar">
      <Logo to="/dashboard" />
      <nav aria-label="Application navigation">{renderNavItems()}</nav>
      <NavLink className="sidebar__post" to="/projects/new"><PlusCircle /><span>Post a project</span></NavLink>
      <div className="sidebar__account">
        <NavLink className="person" to="/profile">
          <span className="avatar avatar--mint">{initials}</span>
          <span className="person__copy"><strong>{name}</strong>{email && <small>{email}</small>}</span>
        </NavLink>
        <button className="sidebar__utility" onClick={logout}><LogOut /><span>Sign out</span></button>
      </div>
    </aside>
    <div className="app-area">
      <div className="mobile-top"><Logo to="/dashboard" /><div className="mobile-top__actions"><NotificationMenu /></div></div>
      <div className="app-content">{children}</div>
    </div>
    {rightRail && <aside className="right-rail">{rightRail}</aside>}
    <NavLink className="mobile-post" to="/projects/new" aria-label="Post a project"><PlusCircle /></NavLink>
    <nav className="mobile-nav" aria-label="Mobile application navigation" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>{renderNavItems()}</nav>
  </div>;
}

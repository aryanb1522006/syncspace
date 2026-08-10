import { Compass, FileText, LogOut, UserRound, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { NotificationMenu } from './NotificationMenu.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const nav = [
  { to: '/dashboard', label: 'Discover', icon: Compass },
  { to: '/applications', label: 'Applications', icon: FileText },
  { to: '/team/1', label: 'My team', icon: UsersRound },
  { to: '/profile', label: 'Profile', icon: UserRound }
];

export function AppShell({ children, rightRail, className = '' }) {
  const { user, logout } = useAuth();
  const initials = (user?.name ?? 'Isha Mehta').split(' ').map((part) => part[0]).slice(0, 2).join('');
  return <div className={`app-shell ${className}`}>
    <aside className="sidebar">
      <Logo to="/dashboard" />
      <nav aria-label="Application navigation">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon /><span>{label}</span></NavLink>)}
      </nav>
      <div className="sidebar__account">
        <div className="person"><span className="avatar avatar--mint">{initials}</span><span>{user?.name ?? 'Isha Mehta'}</span></div>
        <button onClick={logout}><LogOut /><span>Sign out</span></button>
      </div>
    </aside>
    <div className="app-area">
      <div className="mobile-top"><Logo to="/dashboard" /><NotificationMenu /></div>
      <div className="app-content">{children}</div>
    </div>
    {rightRail && <aside className="right-rail">{rightRail}</aside>}
    <nav className="mobile-nav" aria-label="Mobile application navigation">
      {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to}><Icon /><span>{label}</span></NavLink>)}
    </nav>
  </div>;
}

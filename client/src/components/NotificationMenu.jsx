import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/resources.js';

export function NotificationMenu() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const refresh = () => api.notifications().then(({ notifications: rows }) => setNotifications(rows)).catch(() => {});
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const unread = notifications.filter((item) => !item.is_read).length;
  const openNotification = (item) => {
    if (item.team_id) {
      setOpen(false);
      navigate(`/team/${item.team_id}#team-contacts-title`);
    }
    if (!item.is_read) api.readNotification(item.id).then(refresh).catch(() => {});
  };

  return <div className="notification">
    <button className="icon-button" onClick={() => { if (!open) refresh(); setOpen((value) => !value); }} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
      <Bell size={21} />{unread > 0 && <span>{unread}</span>}
    </button>
    {open && <div className="notification__panel">
      <div className="notification__title">Notifications</div>
      {notifications.length === 0 ? <p>No new updates.</p> : notifications.map((item) =>
        <button key={item.id} className={item.is_read ? '' : 'unread'} onClick={() => openNotification(item)}>{item.message}</button>
      )}
    </div>}
  </div>;
}

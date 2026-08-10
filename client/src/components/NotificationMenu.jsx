import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/resources.js';

export function NotificationMenu() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = () => api.notifications().then(({ notifications: rows }) => setNotifications(rows)).catch(() => {});
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const unread = notifications.filter((item) => !item.is_read).length;
  const markRead = async (id) => { await api.readNotification(id); refresh(); };

  return <div className="notification">
    <button className="icon-button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
      <Bell size={21} />{unread > 0 && <span>{unread}</span>}
    </button>
    {open && <div className="notification__panel">
      <div className="notification__title">Notifications</div>
      {notifications.length === 0 ? <p>No new updates.</p> : notifications.map((item) =>
        <button key={item.id} className={item.is_read ? '' : 'unread'} onClick={() => markRead(item.id)}>{item.message}</button>
      )}
    </div>}
  </div>;
}

import { Bell } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/resources.js';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { notifications: rows } = await api.notifications();
      setNotifications(rows);
    } catch {
      // Keep the last successful result when a background refresh fails.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (!document.hidden) refresh();
    };
    refreshWhenVisible();
    const timer = window.setInterval(refreshWhenVisible, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { notifications, refresh };
}

export function NotificationMenu({ notifications, refresh }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

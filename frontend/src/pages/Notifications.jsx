// frontend/src/pages/Notifications.jsx
// Notificaciones del usuario: likes y comentarios en sus publicaciones.
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const BellIcon = ({ size = 48, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const Notifications = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    notificationsAPI
      .getNotifications()
      .then((res) => {
        setNotifs(Array.isArray(res.data) ? res.data : []);
        return notificationsAPI.markAllRead();
      })
      .then(() => window.dispatchEvent(new Event('notifications:read')))
      .catch((err) => console.error('Error cargando notificaciones:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return t('post.justNow');
    if (diff < 3600) return t('post.minAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('post.hoursAgo', { n: Math.floor(diff / 3600) });
    if (diff < 604800) return t('post.daysAgo', { n: Math.floor(diff / 86400) });
    return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const messageFor = (type) => (type === 'comment' ? t('notif.comment') : t('notif.like'));

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-edge rounded-2xl p-10 animate-fade-up">
            <BellIcon size={48} className="mx-auto mb-4 text-muted" />
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('notifications.title')}</h1>
            <p className="text-muted mb-6">{t('notifications.loginText')}</p>
            <Link
              to="/login"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-ink">{t('notifications.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('notifications.subtitle')}</p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : notifs.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-10 text-center">
            <BellIcon size={48} className="mx-auto mb-4 text-muted" />
            <p className="text-muted">{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="bg-surface border border-edge rounded-2xl overflow-hidden">
            {notifs.map((n) => {
              const actor = n.Actor;
              const name = actor?.name || actor?.username || '';
              const goActor = () => actor?.username && navigate(`/profile/${actor.username}`);
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-edge/60 last:border-0 ${
                    !n.is_read ? 'bg-accent/5' : ''
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full bg-raised flex items-center justify-center overflow-hidden border border-edge shrink-0 cursor-pointer"
                    onClick={goActor}
                  >
                    {actor?.profile_pic ? (
                      <img src={actor.profile_pic} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted font-bold">{(actor?.username || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-semibold cursor-pointer hover:underline" onClick={goActor}>
                        {name}
                      </span>{' '}
                      {messageFor(n.type)}
                    </p>
                    {n.Post?.text ? (
                      <p className="text-sm text-muted truncate mt-0.5">{n.Post.text}</p>
                    ) : null}
                    <p className="text-xs text-muted mt-0.5">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

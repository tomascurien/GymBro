// frontend/src/components/Sidebar.jsx
// Navegación de secciones: rail izquierdo en desktop, barra inferior en mobile.
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { notificationsAPI } from '../services/api';

const HomeIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
  </svg>
);

const DumbbellIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5v11M4 8v8M2 9.5v5M17.5 6.5v11M20 8v8M22 9.5v5M6.5 12h11" />
  </svg>
);

const BookmarkIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.178V21l-5.625-3.375L8.25 21V5.5c0-1.1.808-2.05 1.907-2.178a48.5 48.5 0 017.436 0z" />
  </svg>
);

const HeartIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const TrendIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const BellIcon = ({ active }) => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const Sidebar = () => {
  const { t } = useI18n();
  const [unread, setUnread] = useState(0);
  const isLoggedIn = !!localStorage.getItem('token');

  const fetchUnread = useCallback(() => {
    if (!localStorage.getItem('token')) {
      setUnread(0);
      return;
    }
    notificationsAPI
      .getUnreadCount()
      .then((res) => setUnread(res.data?.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUnread();
    const onRead = () => setUnread(0);
    const id = setInterval(fetchUnread, 45000);
    window.addEventListener('notifications:read', onRead);
    window.addEventListener('userLoggedIn', fetchUnread);
    window.addEventListener('focus', fetchUnread);
    return () => {
      clearInterval(id);
      window.removeEventListener('notifications:read', onRead);
      window.removeEventListener('userLoggedIn', fetchUnread);
      window.removeEventListener('focus', fetchUnread);
    };
  }, [fetchUnread]);

  const badgeText = unread > 10 ? '10+' : String(unread);

  const items = [
    { to: '/feed', label: t('nav.feed'), Icon: HomeIcon },
    { to: '/routines', label: t('nav.routines'), Icon: DumbbellIcon },
    { to: '/saved', label: t('nav.saved'), Icon: BookmarkIcon },
    { to: '/likes', label: t('nav.likes'), Icon: HeartIcon },
    { to: '/progress', label: t('nav.progress'), Icon: TrendIcon },
    { to: '/notifications', label: t('nav.notifications'), Icon: BellIcon, hasBadge: true },
  ];

  const desktopClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-full text-lg transition-colors ${
      isActive ? 'font-bold text-ink' : 'text-muted hover:text-ink hover:bg-raised'
    }`;

  const mobileClass = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[11px] font-medium transition-colors ${
      isActive ? 'text-accent' : 'text-muted'
    }`;

  const IconWithBadge = ({ Icon, active, hasBadge }) => (
    <span className="relative inline-flex">
      <Icon active={active} />
      {hasBadge && isLoggedIn && unread > 0 && (
        <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-accent text-on-accent text-[10px] font-bold leading-none">
          {badgeText}
        </span>
      )}
    </span>
  );

  return (
    <>
      {/* Rail de escritorio */}
      <aside className="hidden md:block w-56 shrink-0">
        <nav className="sticky top-20 flex flex-col gap-1 py-6 pr-4">
          {items.map(({ to, label, Icon, hasBadge }) => (
            <NavLink key={to} to={to} className={desktopClass}>
              {({ isActive }) => (
                <>
                  <IconWithBadge Icon={Icon} active={isActive} hasBadge={hasBadge} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Barra inferior mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-edge flex">
        {items.map(({ to, label, Icon, hasBadge }) => (
          <NavLink key={to} to={to} className={mobileClass}>
            {({ isActive }) => (
              <>
                <IconWithBadge Icon={Icon} active={isActive} hasBadge={hasBadge} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default Sidebar;

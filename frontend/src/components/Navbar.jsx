// frontend/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/I18nContext';

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m6.364.636l-1.06 1.06M21 12h-1.5m-.636 6.364l-1.06-1.06M12 19.5V21m-6.364-2.136l1.06-1.06M4.5 12H3m2.136-6.364l1.06 1.06M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75 9.75 9.75 0 018.25 6c0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25 9.75 9.75 0 0012.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, toggleLang } = useI18n();

  // Cargar usuario directamente desde localStorage (no en useEffect)
  const getUserFromStorage = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  };

  const [user, setUser] = useState(getUserFromStorage());
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getUserFromStorage());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      navigate(`/profile/${query}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setShowUserMenu(false);
    navigate('/feed');
  };

  return (
    <nav className="bg-surface/90 backdrop-blur border-b border-edge sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          {/* Logo */}
          <Link to="/feed" className="flex items-center shrink-0" aria-label="Forma">
            <Logo size={30} />
          </Link>

          {/* Buscador */}
          <div className="flex-1 max-w-md hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full px-4 py-2 pr-20 border border-edge rounded-full focus:outline-none focus:ring-2 focus:ring-accent bg-raised text-ink placeholder-muted text-sm"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-4 bg-accent hover:bg-accent-hi text-on-accent font-semibold rounded-full transition-colors text-sm"
              >
                {t('nav.search')}
              </button>
            </form>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Idioma */}
            <button
              onClick={toggleLang}
              title={t('nav.toggleLang')}
              className="px-2 py-1.5 rounded-lg text-sm font-semibold text-muted hover:text-ink hover:bg-raised transition-colors"
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>

            {/* Tema */}
            <button
              onClick={toggleTheme}
              title={t('nav.toggleTheme')}
              className="p-2 rounded-lg text-muted hover:text-ink hover:bg-raised transition-colors"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {user ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center focus:outline-none focus:ring-2 focus:ring-accent rounded-full"
                >
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold overflow-hidden">
                    {user?.profile_pic ? (
                      <img src={user.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                </button>

                {showUserMenu && user.username && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-edge py-2 animate-fade-up">
                    <Link
                      to={`/profile/${user?.username}`}
                      className="block px-4 py-2 text-sm text-ink hover:bg-raised"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {t('nav.myProfile')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-ink hover:bg-raised"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm text-muted hover:text-ink font-medium transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="bg-accent hover:bg-accent-hi text-on-accent font-semibold px-4 py-2 rounded-full text-sm transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

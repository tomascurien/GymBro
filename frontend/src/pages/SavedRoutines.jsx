// frontend/src/pages/SavedRoutines.jsx
// Sección "Guardadas": rutinas de otros que el usuario marcó con el bookmark.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProfileRoutines from '../components/ProfileRoutines';
import { routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { BookmarkIcon } from '../components/Icons';

const SavedRoutines = () => {
  const { t } = useI18n();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isLoggedIn = !!currentUser.username;

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    routinesAPI.getFavorites(currentUser.username)
      .then((res) => setRoutines(res.data || []))
      .catch((err) => console.error('Error cargando guardadas:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El bookmark acá siempre "des-guarda": sacamos la rutina de la lista
  const handleFavoriteToggle = async (routineId) => {
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    try {
      await routinesAPI.removeFavorite(routineId);
    } catch (err) {
      console.error('Error al quitar de guardadas:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-edge rounded-2xl p-10 animate-fade-up">
            <BookmarkIcon size={48} className="mx-auto mb-4 text-muted" />
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('saved.title')}</h1>
            <p className="text-muted mb-6">{t('routines.loginText')}</p>
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
          <h1 className="text-2xl font-display font-bold text-ink">{t('saved.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('saved.subtitle')}</p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : routines.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-10 text-center">
            <BookmarkIcon size={48} className="mx-auto mb-4 text-muted" />
            <h3 className="text-xl font-display font-semibold text-ink mb-2">{t('saved.emptyTitle')}</h3>
            <p className="text-muted">{t('saved.emptyText')}</p>
          </div>
        ) : (
          <ProfileRoutines
            routines={routines}
            isOwnProfile={false}
            onRoutineDelete={() => {}}
            myFavoriteIds={new Set(routines.map((r) => r.id))}
            onFavoriteToggle={handleFavoriteToggle}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>
    </div>
  );
};

export default SavedRoutines;

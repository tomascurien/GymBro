// frontend/src/pages/Routines.jsx
// Sección "Rutinas": la casa de las rutinas propias. Acá se crean (el perfil
// redirige a esta página); las guardadas de otros viven en /saved.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProfileRoutines from '../components/ProfileRoutines';
import CreateRoutineModal from '../components/CreateRoutineModal';
import { routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const Routines = () => {
  const { t } = useI18n();
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isLoggedIn = !!currentUser.username;

  const loadRoutines = async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await routinesAPI.getUserRoutines(currentUser.username);
      setRoutines(res.data || []);
    } catch (err) {
      console.error('Error cargando rutinas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoutineDelete = async (routineId) => {
    try {
      await routinesAPI.deleteRoutine(routineId);
      setRoutines(routines.filter((r) => r.id !== routineId));
    } catch (err) {
      console.error('Error al eliminar la rutina:', err);
    }
  };

  const handleRoutineCreated = () => {
    loadRoutines();
    setShowCreateModal(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-edge rounded-2xl p-10 animate-fade-up">
            <div className="text-6xl mb-4">🏋️</div>
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('routines.loginTitle')}</h1>
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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-ink">{t('routines.title')}</h1>
            <p className="text-muted text-sm mt-1">{t('routines.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="shrink-0 px-4 py-2 bg-accent text-on-accent rounded-full hover:bg-accent-hi transition-colors text-sm font-semibold"
          >
            {t('routines.new')}
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : routines.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-10 text-center">
            <div className="text-6xl mb-4">🏋️</div>
            <h3 className="text-xl font-display font-semibold text-ink mb-2">{t('routines.emptyTitle')}</h3>
            <p className="text-muted mb-6">{t('routines.emptyText')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2.5 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors"
            >
              {t('routines.new')}
            </button>
          </div>
        ) : (
          <ProfileRoutines
            routines={routines}
            isOwnProfile={true}
            onRoutineDelete={handleRoutineDelete}
            myFavoriteIds={new Set()}
            onFavoriteToggle={() => {}}
            isLoggedIn={isLoggedIn}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateRoutineModal
          onClose={() => setShowCreateModal(false)}
          onRoutineCreated={handleRoutineCreated}
        />
      )}
    </div>
  );
};

export default Routines;

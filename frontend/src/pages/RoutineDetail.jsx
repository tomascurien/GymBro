// frontend/src/pages/RoutineDetail.jsx
// Detalle de una rutina: navegación por días, ejercicios agrupados por grupo
// muscular, y cada ejercicio expandible con descripción y prescripción
// (sets × reps · kg). Acciones: guardar/copiar (ajenas) o eliminar (propias).
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { MUSCLE_EMOJI } from '../constants/muscles';

// Las descripciones de Wger vienen con HTML: las pasamos a texto plano
const stripHtml = (html) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const Chevron = ({ open }) => (
  <svg
    className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ExerciseRow = ({ item, t }) => {
  const [open, setOpen] = useState(false);
  const ex = item.Exercise || {};
  const image = ex.ExerciseImages?.[0]?.image_url;
  const sets = item.RoutineSets?.length || 0;
  const description = stripHtml(ex.description);

  return (
    <div className="bg-raised border border-edge rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-edge/40 transition-colors"
      >
        <img
          src={image || 'https://placehold.co/48x48/e2e8f0/64748b?text=?'}
          alt=""
          className="w-12 h-12 object-cover rounded-lg bg-surface shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink truncate">{ex.name}</p>
          <p className="text-sm text-muted">
            {sets}×{item.reps} · {item.weight_kg} kg
          </p>
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-edge/60">
          <div className="flex gap-2 my-3">
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-accent/10 text-accent">
              {t('routine.setsCount', { n: sets })}
            </span>
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-accent/10 text-accent">
              {t('routine.repsCount', { n: item.reps })}
            </span>
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-accent/10 text-accent">
              {item.weight_kg} kg
            </span>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {description || t('routineDetail.noDescription')}
          </p>
        </div>
      )}
    </div>
  );
};

const RoutineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isLoggedIn = !!currentUser.username;

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    routinesAPI.getRoutine(id)
      .then((res) => {
        setRoutine(res.data);
        const days = [...new Set((res.data.RoutineExercises || []).map((e) => e.day || 1))].sort((a, b) => a - b);
        setActiveDay(days[0] || 1);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    if (currentUser.username) {
      routinesAPI.getFavorites(currentUser.username)
        .then((res) => setIsFavorited((res.data || []).some((r) => r.id === parseInt(id))))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFavoriteToggle = async () => {
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      if (next) await routinesAPI.addFavorite(routine.id);
      else await routinesAPI.removeFavorite(routine.id);
    } catch (err) {
      setIsFavorited(!next);
    }
  };

  const handleCopy = async () => {
    if (copyState !== 'idle') return;
    setCopyState('busy');
    try {
      await routinesAPI.copyRoutine(routine.id);
      setCopyState('done');
    } catch (err) {
      console.error('Error al copiar rutina:', err);
      setCopyState('idle');
    }
  };

  const handleDelete = async () => {
    try {
      await routinesAPI.deleteRoutine(routine.id);
      navigate('/routines');
    } catch (err) {
      console.error('Error al eliminar la rutina:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (notFound || !routine) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-display font-bold text-ink mb-2">{t('routineDetail.notFoundTitle')}</h2>
          <p className="text-muted">{t('routineDetail.notFoundText')}</p>
        </div>
      </div>
    );
  }

  const isOwner = routine.user_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const author = routine.User;
  const sourceUser = routine.SourceRoutine?.User;
  const exercises = routine.RoutineExercises || [];

  const dayNumbers = [...new Set(exercises.map((e) => e.day || 1))].sort((a, b) => a - b);
  const multiDay = dayNumbers.length > 1;
  const dayExercises = exercises
    .filter((e) => (e.day || 1) === activeDay)
    .sort((a, b) => a.index - b.index);

  // Agrupar por grupo muscular manteniendo el orden de aparición
  const groups = [];
  const groupMap = new Map();
  for (const item of dayExercises) {
    const cat = item.Exercise?.category || 0;
    if (!groupMap.has(cat)) {
      const g = { cat, items: [] };
      groupMap.set(cat, g);
      groups.push(g);
    }
    groupMap.get(cat).items.push(item);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Volver */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-muted hover:text-ink text-sm mb-4 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {t('wizard.back')}
        </button>

        {/* Encabezado */}
        <div className="bg-surface border border-edge rounded-2xl p-6 mb-6 animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-ink">{routine.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              {isLoggedIn && !isOwner && (
                <>
                  <button
                    onClick={handleCopy}
                    disabled={copyState === 'busy'}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      copyState === 'done'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-accent text-on-accent hover:bg-accent-hi'
                    }`}
                  >
                    {copyState === 'done' ? t('routines.copied') : t('routines.copy')}
                  </button>
                  <button
                    onClick={handleFavoriteToggle}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      isFavorited
                        ? 'border-accent text-accent bg-accent/10'
                        : 'border-edge text-muted hover:text-ink'
                    }`}
                  >
                    {isFavorited ? t('routineDetail.saved') : t('routineDetail.save')}
                  </button>
                </>
              )}
              {(isOwner || isAdmin) && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-full text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>

          {/* Autor y atribución */}
          {author && (
            <Link to={`/profile/${author.username}`} className="inline-flex items-center gap-2 mt-3 group">
              <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-on-accent text-xs font-bold overflow-hidden">
                {author.profile_pic ? (
                  <img src={author.profile_pic} alt="" className="w-full h-full object-cover" />
                ) : (
                  author.username?.charAt(0).toUpperCase()
                )}
              </span>
              <span className="text-sm text-muted group-hover:text-ink transition-colors">
                {t('routineDetail.by')} <span className="font-medium">@{author.username}</span>
              </span>
            </Link>
          )}
          {sourceUser && (
            <p className="text-sm text-muted mt-1">
              {t('routines.basedOn')}{' '}
              <Link to={`/profile/${sourceUser.username}`} className="text-accent hover:underline">
                @{sourceUser.username}
              </Link>
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {routine.objective && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                {t(`objective.${routine.objective}`)}
              </span>
            )}
            {routine.days_per_week && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
                {t('wizard.daysChip', { n: routine.days_per_week })}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
              {exercises.length === 1
                ? t('routineDetail.exerciseOne')
                : t('routineDetail.exerciseCount', { n: exercises.length })}
            </span>
            {routine.copies_count > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
                {routine.copies_count === 1 ? t('routines.copyOne') : t('routines.copies', { n: routine.copies_count })}
              </span>
            )}
          </div>
        </div>

        {/* Tabs de días */}
        {multiDay && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5">
            {dayNumbers.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  activeDay === d
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface text-muted border border-edge hover:text-ink'
                }`}
              >
                {t('wizard.day', { n: d })}
              </button>
            ))}
          </div>
        )}

        {/* Ejercicios agrupados por grupo muscular */}
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.cat}>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted mb-2">
                <span className="text-lg">{MUSCLE_EMOJI[g.cat] || '🏋️'}</span>
                {t(`muscle.${g.cat}`)}
              </h2>
              <div className="space-y-2">
                {g.items.map((item) => (
                  <ExerciseRow key={item.id} item={item} t={t} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmación de borrado */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-edge rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up">
            <h3 className="text-lg font-display font-bold text-ink mb-2">{t('routineDetail.deleteConfirmTitle')}</h3>
            <p className="text-muted mb-6 text-sm">{t('routineDetail.deleteConfirmText')}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-edge text-ink rounded-full hover:bg-raised transition-colors font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-danger text-canvas rounded-full hover:bg-danger-hi transition-colors font-medium text-sm"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineDetail;

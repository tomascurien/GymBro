// frontend/src/pages/RoutineDetail.jsx
// Detalle de una rutina: navegación por días, ejercicios agrupados por grupo
// muscular, y cada ejercicio expandible con descripción y prescripción
// (sets × reps · kg). Acciones: guardar/copiar (ajenas) o eliminar (propias).
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { routinesAPI, logsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { AlertCircleIcon } from '../components/Icons';
import CreatePostModal from '../components/CreatePostModal';

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

// Formatea un delta de peso: +2.5 kg / −2.5 kg (sin decimales de más)
const fmtDelta = (delta) => {
  const rounded = Math.round(delta * 10) / 10;
  const abs = Math.abs(rounded) % 1 === 0 ? Math.abs(rounded).toFixed(0) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? '+' : '−'}${abs} kg`;
};

const fmtKg = (w) => {
  const n = parseFloat(w);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kg`;
};

// Bloque "Tu progreso": línea de progreso + registro rápido (el hábito de 2 segundos)
const ProgressBlock = ({ item, log, onLogged, onSharePr }) => {
  const { t, locale } = useI18n();
  const [newPr, setNewPr] = useState(null); // último log que rompió el récord
  const [weight, setWeight] = useState(log?.last?.weight_kg ?? item.weight_kg ?? '');
  const [reps, setReps] = useState(log?.last?.reps ?? item.reps ?? '');
  const [sets, setSets] = useState(log?.last?.sets ?? item.RoutineSets?.length ?? 3);
  const [state, setState] = useState('idle'); // idle | busy | done | error
  const touched = React.useRef(false);

  // Si el resumen llega después de expandir, prefillear con el último registro
  // (sin pisar valores que el usuario ya haya tocado)
  useEffect(() => {
    if (log?.last && !touched.current && state === 'idle') {
      setWeight(log.last.weight_kg);
      setReps(log.last.reps);
      setSets(log.last.sets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.last?.created_at]);

  const relTime = (dateString) => {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (diff < 3600) return t('post.justNow');
    if (diff < 86400) return t('post.hoursAgo', { n: Math.floor(diff / 3600) });
    if (diff < 604800) return t('post.daysAgo', { n: Math.floor(diff / 86400) });
    return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await logsAPI.createLog({
        exercise_id: item.exercise_id,
        routine_exercise_id: item.id,
        weight_kg: weight,
        reps,
        sets,
      });
      onLogged(item.exercise_id, res.data);
      if (res.data.isNewPr) setNewPr(res.data);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      console.error('Error al registrar:', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const last = log?.last;
  const deltaPrev = last && log?.prev ? parseFloat(last.weight_kg) - parseFloat(log.prev.weight_kg) : null;
  const deltaMonth = last && log?.monthAgo ? parseFloat(last.weight_kg) - parseFloat(log.monthAgo.weight_kg) : null;
  const deltaClass = (d) => (d > 0 ? 'text-accent font-semibold' : 'text-muted');

  const inputClass =
    'w-16 border border-edge rounded-lg p-1.5 bg-surface text-ink text-center text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="mt-4 bg-raised border border-edge rounded-xl p-3.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{t('log.title')}</p>

      {/* Línea de progreso */}
      {last ? (
        <p className="text-sm text-ink mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            <span className="text-muted">{t('log.last')}:</span>{' '}
            <span className="font-semibold">{fmtKg(last.weight_kg)} × {last.reps}</span>{' '}
            <span className="text-muted">· {relTime(last.created_at)}</span>
          </span>
          {deltaPrev !== null && (
            <span className={deltaClass(deltaPrev)}>
              {deltaPrev === 0 ? t('log.noChange') : fmtDelta(deltaPrev)} {t('log.vsPrev')}
            </span>
          )}
          {deltaMonth !== null && (
            <span className={deltaClass(deltaMonth)}>
              {deltaMonth === 0 ? t('log.noChange') : fmtDelta(deltaMonth)} {t('log.thisMonth')}
            </span>
          )}
          {log?.pr && (
            <span className="text-muted">
              {t('log.pr')}: <span className="text-ink font-semibold">{fmtKg(log.pr.weight_kg)}</span>
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted mb-3">{t('log.noneYet')}</p>
      )}

      {/* Registro rápido */}
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-[11px] text-muted mb-0.5">kg</label>
          <input type="number" step="0.5" min="0" required value={weight}
            onChange={(e) => { touched.current = true; setWeight(e.target.value); }} className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-muted mb-0.5">{t('routine.reps').toLowerCase()}</label>
          <input type="number" min="1" required value={reps}
            onChange={(e) => { touched.current = true; setReps(e.target.value); }} className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-muted mb-0.5">{t('routine.sets').toLowerCase()}</label>
          <input type="number" min="1" required value={sets}
            onChange={(e) => { touched.current = true; setSets(e.target.value); }} className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={state === 'busy'}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            state === 'done'
              ? 'bg-accent/10 text-accent'
              : 'bg-accent text-on-accent hover:bg-accent-hi disabled:opacity-50'
          }`}
        >
          {state === 'busy' ? t('log.registering') : state === 'done' ? t('log.registered') : t('log.register')}
        </button>
        {state === 'error' && <span className="text-danger text-sm">{t('log.error')}</span>}
      </form>

      {/* Celebración de récord: puerta de entrada al post con #PR */}
      {newPr && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-accent/10 border border-accent/40 rounded-xl px-3.5 py-2.5">
          <p className="text-sm font-semibold text-accent">
            {t('log.newPr')} {fmtKg(newPr.weight_kg)} × {newPr.reps}
          </p>
          <button
            type="button"
            onClick={() => onSharePr(item.Exercise?.name, newPr)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-accent text-on-accent hover:bg-accent-hi transition-colors"
          >
            {t('log.sharePr')}
          </button>
        </div>
      )}

      <Link
        to="/progress"
        className="inline-block mt-3 text-sm text-accent hover:underline"
      >
        {t('progress.viewAll')} →
      </Link>
    </div>
  );
};

const ExerciseRow = ({ item, t, canLog, log, onLogged, onSharePr }) => {
  const [open, setOpen] = useState(false);
  const ex = item.Exercise || {};
  const image = ex.ExerciseImages?.[0]?.image_url;
  const sets = item.RoutineSets?.length || 0;
  const description = stripHtml(ex.description);

  return (
    <div className="bg-surface border border-edge rounded-2xl overflow-hidden hover:border-muted/50 transition-colors">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <img
          src={image || 'https://placehold.co/96x96/e2e8f0/64748b?text=%20'}
          alt=""
          className="w-24 h-24 object-cover rounded-xl bg-raised shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-lg text-ink">{ex.name}</p>
          <p className="text-muted mt-1">
            {sets}×{item.reps} · {item.weight_kg} kg
          </p>
        </div>
        <Chevron open={open} />
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-edge/60">
          {/* Imagen grande: el punto de entrar al ejercicio es VER cómo se hace */}
          {image && (
            <div className="mt-4 rounded-xl overflow-hidden bg-raised">
              <img
                src={image}
                alt={ex.name}
                className="w-full max-h-[420px] object-contain"
              />
            </div>
          )}
          <div className="flex gap-2 my-4">
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

          {/* Track your progress: solo con sesión iniciada */}
          {canLog && <ProgressBlock item={item} log={log} onLogged={onLogged} onSharePr={onSharePr} />}

          <p className="text-sm text-muted leading-relaxed mt-4">
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Resumen de progreso por exercise_id: { last, prev, monthAgo, pr }
  const [logSummary, setLogSummary] = useState({});
  // Texto prefillado del post de PR (abre el composer al compartir un récord)
  const [prShareText, setPrShareText] = useState(null);

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
      logsAPI.getSummary(id)
        .then((res) => setLogSummary(res.data || {}))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Tras registrar: el último pasa a "anterior", recalculamos el PR localmente
  const handleLogged = (exerciseId, newLog) => {
    setLogSummary((prev) => {
      const cur = prev[exerciseId] || {};
      const entry = {
        weight_kg: parseFloat(newLog.weight_kg),
        reps: newLog.reps,
        sets: newLog.sets,
        created_at: newLog.created_at,
      };
      const pr = cur.pr && parseFloat(cur.pr.weight_kg) >= entry.weight_kg ? cur.pr : entry;
      return {
        ...prev,
        [exerciseId]: { last: entry, prev: cur.last || null, monthAgo: cur.monthAgo || null, pr },
      };
    });
  };

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
          <AlertCircleIcon size={48} className="mx-auto mb-4 text-muted" />
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
                <button
                  onClick={handleFavoriteToggle}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    isFavorited
                      ? 'bg-accent/10 text-accent border border-accent'
                      : 'bg-accent text-on-accent hover:bg-accent-hi'
                  }`}
                >
                  {isFavorited ? t('routineDetail.saved') : t('routineDetail.save')}
                </button>
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
              <h2 className="flex items-center gap-2.5 mb-3">
                <span className="w-1 h-5 rounded-full bg-accent"></span>
                <span className="font-display font-bold text-ink uppercase tracking-wide text-sm">
                  {t(`muscle.${g.cat}`)}
                </span>
                <span className="text-xs text-muted">
                  {g.items.length === 1
                    ? t('routineDetail.exerciseOne')
                    : t('routineDetail.exerciseCount', { n: g.items.length })}
                </span>
              </h2>
              <div className="space-y-3">
                {g.items.map((item) => (
                  <ExerciseRow
                    key={item.id}
                    item={item}
                    t={t}
                    canLog={isLoggedIn}
                    log={logSummary[item.exercise_id]}
                    onLogged={handleLogged}
                    onSharePr={(exerciseName, prLog) =>
                      setPrShareText(t('log.prPostText', {
                        exercise: exerciseName || '',
                        kg: fmtKg(prLog.weight_kg).replace(' kg', ''),
                        reps: prLog.reps,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer prefillado para compartir el PR */}
      {prShareText && (
        <CreatePostModal
          initialText={prShareText}
          onClose={() => setPrShareText(null)}
          onPostCreated={() => setPrShareText(null)}
        />
      )}

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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { MUSCLE_EMOJI } from '../constants/muscles';

const BookmarkIcon = ({ isFavorited, isLoggedIn, ...props }) => (
  <button
    disabled={!isLoggedIn}
    onClick={props.onClick}
    className={`p-1.5 rounded-lg transition-colors ${
      isLoggedIn
        ? 'text-muted hover:text-accent hover:bg-accent/10'
        : 'text-muted/40 cursor-not-allowed'
    } ${isFavorited ? 'text-accent' : ''}`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      fill={isFavorited ? 'currentColor' : 'none'}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.178V21l-5.625-3.375L8 21V5.5c0-1.1.808-2.05 1.907-2.178A4.502 4.502 0 0112 3c1.353 0 2.56.606 3.393.322z" />
    </svg>
  </button>
);

// Botón "copiar rutina" (para rutinas ajenas): la clona a mis rutinas con atribución
const CopyButton = ({ routineId }) => {
  const { t } = useI18n();
  const [state, setState] = useState('idle'); // idle | busy | done | error

  const handleCopy = async () => {
    if (state === 'busy' || state === 'done') return;
    setState('busy');
    try {
      await routinesAPI.copyRoutine(routineId);
      setState('done');
    } catch (err) {
      console.error('Error al copiar rutina:', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'busy'}
      title={t('routines.copy')}
      className={`p-1.5 rounded-lg transition-colors ${
        state === 'done'
          ? 'text-accent'
          : 'text-muted hover:text-accent hover:bg-accent/10'
      }`}
    >
      {state === 'done' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
        </svg>
      )}
    </button>
  );
};

// Tarjeta compacta de rutina: resumen + acciones; el contenido completo
// vive en la página de detalle (/routines/:id)
const RoutineCard = ({ routine, onRoutineDelete, onFavoriteToggle, myFavoriteIds, isLoggedIn }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isMyRoutine = routine.user_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  const copies = routine.copies_count || 0;
  const sourceUser = routine.SourceRoutine?.User;
  const author = routine.User;
  const exercises = routine.RoutineExercises || [];
  // Grupos musculares presentes, en orden de aparición
  const groupIds = [...new Set(exercises.map((ex) => ex.Exercise?.category).filter(Boolean))];

  return (
    <div
      onClick={() => navigate(`/routines/${routine.id}`)}
      className="bg-surface border border-edge rounded-2xl p-5 mb-4 cursor-pointer hover:border-accent/50 transition-colors group"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-display font-bold text-ink truncate group-hover:text-accent transition-colors">
            {routine.title}
          </h3>

          {/* Autor (en listas de guardadas) y atribución */}
          {author && !isMyRoutine && (
            <p className="text-sm text-muted mt-0.5">
              {t('routineDetail.by')}{' '}
              <Link
                to={`/profile/${author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-ink hover:underline"
              >
                @{author.username}
              </Link>
            </p>
          )}
          {sourceUser && (
            <p className="text-sm text-muted mt-0.5">
              {t('routines.basedOn')}{' '}
              <Link
                to={`/profile/${sourceUser.username}`}
                onClick={(e) => e.stopPropagation()}
                className="text-accent hover:underline"
              >
                @{sourceUser.username}
              </Link>
            </p>
          )}

          {/* Badges de resumen */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {routine.objective && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                {t(`objective.${routine.objective}`)}
              </span>
            )}
            {routine.days_per_week && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
                {t('wizard.daysChip', { n: routine.days_per_week })}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
              {exercises.length === 1
                ? t('routineDetail.exerciseOne')
                : t('routineDetail.exerciseCount', { n: exercises.length })}
            </span>
            {copies > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-raised text-muted border border-edge">
                {copies === 1 ? t('routines.copyOne') : t('routines.copies', { n: copies })}
              </span>
            )}
          </div>

          {/* Grupos musculares que toca */}
          {groupIds.length > 0 && (
            <div className="flex items-center gap-1 mt-2.5 text-lg">
              {groupIds.map((gid) => (
                <span key={gid} title={t(`muscle.${gid}`)}>{MUSCLE_EMOJI[gid] || '🏋️'}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {(isMyRoutine || isAdmin) ? (
            <button
              onClick={() => onRoutineDelete(routine.id)}
              className="text-sm text-danger hover:text-danger-hi font-medium px-3 py-1 rounded-lg hover:bg-danger/10 transition-colors"
            >
              {t('common.delete')}
            </button>
          ) : (
            <>
              {isLoggedIn && <CopyButton routineId={routine.id} />}
              <BookmarkIcon
                isLoggedIn={isLoggedIn}
                isFavorited={myFavoriteIds.has(routine.id)}
                onClick={() => onFavoriteToggle(routine.id)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// El componente principal
const ProfileRoutines = ({
  routines,
  onAddRoutine,
  isOwnProfile,
  onRoutineDelete,
  onFavoriteToggle,
  myFavoriteIds,
  isLoggedIn
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      {/* Si no hay rutinas, muestra el mensaje */}
      {routines.length === 0 && (
        <div className="bg-surface border border-edge rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-lg font-display font-semibold text-ink">
            {t('profile.noRoutinesTitle')}
          </h3>
          <p className="text-muted text-sm">
            {isOwnProfile && onAddRoutine
              ? t('profile.noRoutinesOwn')
              : t('profile.noRoutinesOther')}
          </p>
        </div>
      )}

      {/* Si hay rutinas */}
      {routines.length > 0 && routines.map((routine) => (
        <RoutineCard
          key={routine.id}
          routine={routine}
          onRoutineDelete={onRoutineDelete}
          onFavoriteToggle={onFavoriteToggle}
          myFavoriteIds={myFavoriteIds}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  );
};

export default ProfileRoutines;

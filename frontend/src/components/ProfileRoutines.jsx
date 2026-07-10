import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { DumbbellIcon } from './Icons';

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

// Tarjeta compacta de rutina: resumen + acciones; el contenido completo
// vive en la página de detalle (/routines/:id)
const RoutineCard = ({ routine, onRoutineDelete, onFavoriteToggle, myFavoriteIds, isLoggedIn }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isMyRoutine = routine.user_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';
  const sourceUser = routine.SourceRoutine?.User;
  const author = routine.User;
  const exercises = routine.RoutineExercises || [];
  // Grupos musculares presentes, en orden de aparición
  const groupIds = [...new Set(exercises.map((ex) => ex.Exercise?.category).filter(Boolean))];
  // Fotos de ejercicios para el hero de la card (hasta 4 distintas)
  const photos = [...new Set(
    exercises
      .map((ex) => ex.Exercise?.ExerciseImages?.[0]?.image_url)
      .filter(Boolean)
  )].slice(0, 4);

  return (
    <div
      onClick={() => navigate(`/routines/${routine.id}`)}
      className="bg-surface border border-edge rounded-2xl overflow-hidden mb-4 cursor-pointer hover:border-accent/50 transition-colors group"
    >
      {/* Hero: fotos reales de los ejercicios de la rutina */}
      {photos.length > 0 ? (
        <div className="flex h-28 gap-px bg-edge">
          {photos.map((src, i) => (
            <div key={i} className="flex-1 overflow-hidden bg-surface">
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="h-20 flex items-center justify-center bg-raised text-muted">
          <DumbbellIcon size={32} />
        </div>
      )}

      <div className="p-5 flex justify-between items-start gap-3">
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
          </div>

          {/* Grupos musculares que toca */}
          {groupIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {groupIds.map((gid) => (
                <span
                  key={gid}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide bg-raised text-muted border border-edge"
                >
                  {t(`muscle.${gid}`)}
                </span>
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
          <DumbbellIcon size={44} className="mx-auto mb-4 text-muted" />
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

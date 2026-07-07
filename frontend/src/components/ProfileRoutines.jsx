import React from 'react';
import { useI18n } from '../i18n/I18nContext';

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

// El item de ejercicio (dentro de la tarjeta)
const RoutineExerciseItem = ({ exercise }) => {
  const { t } = useI18n();
  return (
    <li className="py-3 sm:py-4">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-raised flex items-center justify-center overflow-hidden">
          <img
            src={exercise.Exercise.ExerciseImages?.[0]?.image_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=?'}
            alt={exercise.Exercise.name.charAt(0)}
            className="w-10 h-10 object-cover rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-md font-medium text-ink truncate">
            {exercise.Exercise.name}
          </p>
          <p className="text-sm text-muted truncate">
            {t('routine.setsCount', { n: exercise.RoutineSets.length })}
          </p>
        </div>
        <div className="inline-flex items-center text-base font-semibold text-ink">
          {t('routine.repsCount', { n: exercise.reps })}
        </div>
        <div className="inline-flex items-center text-base font-semibold text-ink">
          {exercise.weight_kg} kg
        </div>
      </div>
    </li>
  );
};

// La tarjeta de rutina
const RoutineCard = ({ routine, onRoutineDelete, onFavoriteToggle, myFavoriteIds, isLoggedIn }) => {
  const { t } = useI18n();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isMyRoutine = routine.user_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="bg-surface border border-edge rounded-2xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-display font-bold text-ink">{routine.title}</h3>

        <div className="flex items-center space-x-2">
          {(isMyRoutine || isAdmin) ? (
            <button
              onClick={() => onRoutineDelete(routine.id)}
              className="text-sm text-danger hover:text-danger-hi font-medium px-3 py-1 rounded-lg hover:bg-danger/10 transition-colors"
            >
              {t('common.delete')}
            </button>
          ) : (
            <BookmarkIcon
              isLoggedIn={isLoggedIn}
              isFavorited={myFavoriteIds.has(routine.id)}
              onClick={() => onFavoriteToggle(routine.id)}
            />
          )}
        </div>
      </div>

      <ul className="divide-y divide-edge">
        {routine.RoutineExercises.sort((a, b) => a.index - b.index).map((exercise) => (
          <RoutineExerciseItem key={exercise.id} exercise={exercise} />
        ))}
      </ul>
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

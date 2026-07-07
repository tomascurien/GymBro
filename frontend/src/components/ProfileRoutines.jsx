import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { routinesAPI } from '../services/api';
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

// La tarjeta de rutina
const RoutineCard = ({ routine, onRoutineDelete, onFavoriteToggle, myFavoriteIds, isLoggedIn }) => {
  const { t } = useI18n();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const isMyRoutine = routine.user_id === currentUser.id;
  const isAdmin = currentUser.role === 'admin';

  const copies = routine.copies_count || 0;
  const sourceUser = routine.SourceRoutine?.User;

  // Agrupar ejercicios por día (rutinas viejas: todo en día 1 → lista plana)
  const byDay = {};
  (routine.RoutineExercises || []).forEach((ex) => {
    const d = ex.day || 1;
    (byDay[d] = byDay[d] || []).push(ex);
  });
  const dayNumbers = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  const multiDay = dayNumbers.length > 1;

  return (
    <div className="bg-surface border border-edge rounded-2xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-display font-bold text-ink truncate">{routine.title}</h3>
          {/* Objetivo y frecuencia (rutinas creadas con el wizard) */}
          {(routine.objective || routine.days_per_week) && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
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
            </div>
          )}
          {/* Atribución: esta rutina nació como copia de otra */}
          {sourceUser && (
            <p className="text-sm text-muted mt-0.5">
              {t('routines.basedOn')}{' '}
              <Link to={`/profile/${sourceUser.username}`} className="text-accent hover:underline">
                @{sourceUser.username}
              </Link>
            </p>
          )}
          {/* Alcance: cuántas veces la copiaron */}
          {copies > 0 && (
            <p className="text-xs text-muted mt-0.5">
              {copies === 1 ? t('routines.copyOne') : t('routines.copies', { n: copies })}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
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

      {multiDay ? (
        dayNumbers.map((d) => (
          <div key={d} className="mt-3 first:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">
              {t('wizard.day', { n: d })}
            </p>
            <ul className="divide-y divide-edge">
              {byDay[d].sort((a, b) => a.index - b.index).map((exercise) => (
                <RoutineExerciseItem key={exercise.id} exercise={exercise} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <ul className="divide-y divide-edge">
          {(routine.RoutineExercises || []).sort((a, b) => a.index - b.index).map((exercise) => (
            <RoutineExerciseItem key={exercise.id} exercise={exercise} />
          ))}
        </ul>
      )}
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

import React from 'react';

// --- HIJO 1: El item de ejercicio (dentro de la tarjeta) ---
const RoutineExerciseItem = ({ exercise }) => {
  // exercise = { Exercise: { name: "..." }, reps: 8, weight_kg: 50, RoutineSets: [...] }
  return (
    <li className="py-3 sm:py-4">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
          <img 
            src={exercise.Exercise.ExerciseImages?.[0]?.image_url || 'https://placehold.co/40x40/e2e8f0/64748b?text=?'} 
            alt={exercise.Exercise.name.charAt(0)}
            className="w-10 h-10 object-cover rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-md font-medium text-gray-900 truncate">
            {exercise.Exercise.name}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {exercise.RoutineSets.length} sets
          </p>
        </div>
        <div className="inline-flex items-center text-base font-semibold text-gray-900">
          {exercise.reps} reps
        </div>
        <div className="inline-flex items-center text-base font-semibold text-gray-900">
          {exercise.weight_kg} kg
        </div>
      </div>
    </li>
  );
};

// --- HIJO 2: La tarjeta de rutina (la que tiene el botón) ---
const RoutineCard = ({ routine, isOwnProfile, onRoutineDelete }) => {
  return (
    <div className="bg-gray-200 rounded-xl shadow-md p-6 mb-6">
      
      <div className="flex items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">{routine.title}</h3>
        
        {isOwnProfile && (
          <button
            onClick={() => onRoutineDelete(routine.id)}
            className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>

      <ul className="divide-y divide-gray-200">
        {routine.RoutineExercises.sort((a, b) => a.index - b.index).map((exercise) => (
          <RoutineExerciseItem key={exercise.id} exercise={exercise} />
        ))}
      </ul>
    </div>
  );
};

// --- PADRE: El componente principal que exportás ---
const ProfileRoutines = ({ routines, onAddRoutine, isOwnProfile, onRoutineDelete }) => {
  return (
    <div className="space-y-6">

      {routines.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-lg font-semibold text-gray-700">
            Aún no hay rutinas
          </h3>
          <p className="text-gray-500 text-sm">
            {isOwnProfile 
              ? "¡Crea tu primera rutina para que aparezca aquí!"
              : "Este usuario aún no ha creado ninguna rutina."
            }
          </p>
        </div>
      )}

      {routines.length > 0 && routines.map((routine) => (
        <RoutineCard 
          key={routine.id}
          routine={routine}
          isOwnProfile={isOwnProfile}       
          onRoutineDelete={onRoutineDelete}  
        />
      ))}
    </div>
  );
};

export default ProfileRoutines;
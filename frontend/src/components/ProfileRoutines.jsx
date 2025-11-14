import React from 'react';

const BookmarkIcon = ({ isFavorited, isLoggedIn, ...props }) => (
  <button
    disabled={!isLoggedIn} // Deshabilitar si no está logueado
    onClick={props.onClick}
    className={`p-1 rounded-lg transition-colors ${
      isLoggedIn 
        ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-200' 
        : 'text-gray-300 cursor-not-allowed'
    }`}
  >
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      strokeWidth="2" 
      stroke="currentColor" 
      // Rellena el ícono si ya es favorito
      fill={isFavorited ? "currentColor" : "none"} 
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.178V21l-5.625-3.375L8 21V5.5c0-1.1.808-2.05 1.907-2.178A4.502 4.502 0 0112 3c1.353 0 2.56.606 3.393.322z" />
    </svg>
  </button>
);

// El item de ejercicio (dentro de la tarjeta) 
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

// La tarjeta de rutina
const RoutineCard = ({ routine, isOwnProfile, onRoutineDelete, onFavoriteToggle, myFavoriteIds, isLoggedIn }) => {
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : {};
      const isMyRoutine = routine.user_id === currentUser.id;
      const isAdmin = currentUser.role == "admin";

      return (
      <div className="bg-gray-100 rounded-xl shadow-md p-6 mb-6"> {/* Fondo gris que pediste */}
      

      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">{routine.title}</h3>


                  <div className="flex items-center space-x-2">
             {(isMyRoutine || isAdmin) ? (
             <button
             onClick={() => onRoutineDelete(routine.id)}
             className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-100 transition-colors"
             >
             Eliminar
             </button>
              ) : (
             // Si la rutina NO es mía
             <BookmarkIcon 
               isLoggedIn={isLoggedIn}
               isFavorited={myFavoriteIds.has(routine.id)} // <-- AQUÍ OCURRE EL ERROR
               onClick={() => onFavoriteToggle(routine.id)} 
             />
             )}
         </div>
       </div>

       <ul className="divide-y divide-gray-200">
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
  return (
    <div className="space-y-6">

      {/* Si no hay rutinas, muestra el mensaje */}
      {routines.length === 0 && (
        <div className="bg-gray-100 rounded-xl shadow-md p-8 text-center">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="text-lg font-semibold text-gray-700">
            Aún no hay rutinas
          </h3>
          <p className="text-gray-500 text-sm">
            {isOwnProfile && onAddRoutine // Si estoy en la pestaña "Rutinas"
              ? "¡Crea tu primera rutina para que aparezca aquí!"
              : "Este usuario aún no tiene rutinas en esta lista."
            }
          </p>
        </div>
      )}

      {/* Si hay rutinas */}
       {routines.length > 0 && routines.map((routine) => (
        <RoutineCard 
          key={routine.id}
          routine={routine}
          isOwnProfile={isOwnProfile} 
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
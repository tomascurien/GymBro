import React, { useState, useEffect } from 'react';
import { exercisesAPI, routinesAPI } from '../services/api';

// Mapeo de IDs de Wger a nombres de grupos musculares
const muscleGroupMap = {
  10: 'Abdominales',
  8: 'Brazos',
  12: 'Espalda',
  14: 'Pantorrillas',
  11: 'Pecho',
  9: 'Piernas',
  13: 'Hombros',
};

// Estado inicial para el formulario de un ejercicio
const initialExerciseForm = {
  db_id: null,
  name: '',
  image: null,
  category: null,
  reps: '',
  weight_kg: '',
  sets: 3, // Default 3 sets
};

const CreateRoutineModal = ({ onClose, onRoutineCreated }) => {
  // --- ESTADOS ---
  // Estado para la navegación interna del modal
  const [currentView, setCurrentView] = useState('MAIN'); // 'MAIN', 'LIST', 'DETAILS'
  
  // Datos del modal
  const [routineTitle, setRoutineTitle] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);
  
  // Datos de la API
  const [allExercises, setAllExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  
  // Estados de formularios
  const [exerciseForm, setExerciseForm] = useState(initialExerciseForm);
  const [filterCategory, setFilterCategory] = useState(null);
  const [error, setError] = useState('');

  // --- EFECTOS ---
  // Cargar todos los ejercicios de la BD al abrir el modal
  useEffect(() => {
    const loadAllExercises = async () => {
      try {
        setLoadingExercises(true);
        const res = await exercisesAPI.getAllExercises();
        setAllExercises(res.data);
      } catch (err) {
        console.error("Error cargando ejercicios", err);
        setError("No se pudieron cargar los ejercicios.");
      } finally {
        setLoadingExercises(false);
      }
    };
    loadAllExercises();
  }, []);

  // --- MANEJADORES DE EVENTOS ---

  // Cuando el usuario hace clic en un ejercicio de la lista
  const handleSelectExercise = (exercise) => {
    setExerciseForm({
      ...initialExerciseForm,
      db_id: exercise.id,
      name: exercise.name,
      image: exercise.ExerciseImages?.[0]?.image_url,
      category: exercise.category,
    });
    setCurrentView('DETAILS');
  };

  // Cuando el usuario guarda los detalles (reps/peso/sets) de un ejercicio
  const handleSaveExercise = (e) => {
    e.preventDefault();
    const newExercise = {
      ...exerciseForm,
      id: Date.now(), // ID único para la lista (no para la BD)
    };
    setAddedExercises([...addedExercises, newExercise]);
    setExerciseForm(initialExerciseForm);
    setCurrentView('LIST'); // Volver a la lista de ejercicios
  };

  // Cuando el usuario hace clic en "Crear Rutina"
  const handleSubmitRoutine = async () => {
    if (!routineTitle) {
      setError("Por favor, dale un nombre a tu rutina.");
      return;
    }
    if (addedExercises.length === 0) {
      setError("Por favor, añade al menos un ejercicio.");
      return;
    }

    // 1. Transformar el estado del modal al formato que la API espera
    const routineData = {
      title: routineTitle,
      exercises: addedExercises.map((ex, index) => ({
        exercise_id: ex.db_id,
        index: index,
        weight_kg: ex.weight_kg,
        reps: ex.reps,
        // Tu backend espera un array de "sets" para contarlos
        sets: Array.from({ length: ex.sets }, (_, i) => ({ 
          index: i, 
          type: 'normal' 
        })),
      })),
    };

    try {
      // 2. Enviar a la API
      const response = await routinesAPI.createRoutine(routineData);
      
      // 3. Informar al componente Profile
      onRoutineCreated(response.data);
      onClose();

    } catch (err) {
      console.error("Error al crear la rutina:", err);
      setError(err.response?.data?.message || "Error al guardar la rutina.");
    }
  };

  // --- RENDERIZADO DE VISTAS ---

  // Vista 3: Detalles del Ejercicio (Reps/Peso/Sets)
  const renderExerciseDetails = () => (
    <div>
      <button onClick={() => setCurrentView('LIST')} className="text-sm text-gray-600 mb-4">&larr; Volver a la lista</button>
      <div className="text-center mb-4">
        {exerciseForm.image && (
          <img 
          src={exerciseForm.image || 'https://placehold.co/128x128/e2e8f0/64748b?text=?'} 
          alt={exerciseForm.name} 
          className="w-32 h-32 object-cover mx-auto rounded-lg bg-gray-200"
        />
        )}
        <h3 className="text-xl font-semibold mt-2">{exerciseForm.name}</h3>
      </div>
      <form onSubmit={handleSaveExercise} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Peso (kg)</label>
            <input
              type="number"
              value={exerciseForm.weight_kg}
              onChange={(e) => setExerciseForm({...exerciseForm, weight_kg: e.target.value})}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reps</label>
            <input
              type="number"
              value={exerciseForm.reps}
              onChange={(e) => setExerciseForm({...exerciseForm, reps: e.target.value})}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sets</label>
            <input
              type="number"
              value={exerciseForm.sets}
              onChange={(e) => setExerciseForm({...exerciseForm, sets: e.target.value})}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="3"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
        >
          Añadir Ejercicio a la Rutina
        </button>
      </form>
    </div>
  );

  // Vista 2: Lista de Ejercicios (Filtrada)
  const renderExerciseList = () => (
    <div>
      <button onClick={() => setCurrentView('MAIN')} className="text-sm text-gray-600 mb-4">&larr; Volver a la rutina</button>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Filtrar por Grupo Muscular</label>
        <select
          value={filterCategory || ''}
          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">Todos los Grupos</option>
          {Object.entries(muscleGroupMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {loadingExercises ? <p>Cargando ejercicios...</p> : 
          allExercises
            .filter(ex => !filterCategory || ex.category === filterCategory)
            .map(ex => (
              <div 
                key={ex.id}
                onClick={() => handleSelectExercise(ex)}
                className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <img 
                  src={ex.ExerciseImages?.[0]?.image_url || 'https://placehold.co/48x48/e2e8f0/64748b?text=?'} 
                  alt={ex.name}
                  className="w-12 h-12 object-cover rounded-md bg-gray-200"
                />
                <span className="ml-4 font-medium">{ex.name}</span>
              </div>
            ))
        }
      </div>
    </div>
  );

  // Vista 1: Principal (Título y Ejercicios Añadidos)
  const renderMainView = () => (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Nombre de la Rutina</label>
        <input
          type="text"
          value={routineTitle}
          onChange={(e) => setRoutineTitle(e.target.value)}
          placeholder="Ej. Mi Rutina de Pecho"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-medium mb-2">Ejercicios Añadidos ({addedExercises.length})</h4>
        <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-md">
          {addedExercises.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Añade ejercicios a tu rutina</p>
          ) : (
            addedExercises.map((ex, index) => (
              <div key={ex.id} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                <div>
                  <p className="font-semibold">{index + 1}. {ex.name}</p>
                  <p className="text-sm text-gray-600">
                    {ex.sets} sets x {ex.reps} reps @ {ex.weight_kg} kg
                  </p>
                </div>
                {/* Opcional: Añadir botón para eliminar */}
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setCurrentView('LIST')}
        className="w-full px-4 py-2 mb-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
      >
        + Añadir Ejercicio
      </button>

      <button
        onClick={handleSubmitRoutine}
        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
      >
        Guardar Rutina
      </button>
    </div>
  );

  // --- RENDERIZADO PRINCIPAL DEL MODAL ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Crear Rutina</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        
        <div className="p-6">
          {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
          
          {currentView === 'MAIN' && renderMainView()}
          {currentView === 'LIST' && renderExerciseList()}
          {currentView === 'DETAILS' && renderExerciseDetails()}
        </div>
      </div>
    </div>
  );
};

export default CreateRoutineModal;
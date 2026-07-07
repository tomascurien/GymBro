import React, { useState, useEffect } from 'react';
import { exercisesAPI, routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

// IDs de grupos musculares de Wger; los nombres viven en los diccionarios i18n (muscle.*)
const MUSCLE_GROUP_IDS = [10, 8, 12, 14, 11, 9, 13];

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
  const { t } = useI18n();

  // Navegación interna del modal: 'MAIN', 'LIST', 'DETAILS'
  const [currentView, setCurrentView] = useState('MAIN');

  const [routineTitle, setRoutineTitle] = useState('');
  const [addedExercises, setAddedExercises] = useState([]);

  const [allExercises, setAllExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [exerciseForm, setExerciseForm] = useState(initialExerciseForm);
  const [filterCategory, setFilterCategory] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAllExercises = async () => {
      try {
        setLoadingExercises(true);
        const res = await exercisesAPI.getAllExercises();
        setAllExercises(res.data);
      } catch (err) {
        console.error('Error cargando ejercicios', err);
        setError(t('routine.loadError'));
      } finally {
        setLoadingExercises(false);
      }
    };
    loadAllExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSaveExercise = (e) => {
    e.preventDefault();
    const newExercise = {
      ...exerciseForm,
      id: Date.now(), // ID único para la lista (no para la BD)
    };
    setAddedExercises([...addedExercises, newExercise]);
    setExerciseForm(initialExerciseForm);
    setCurrentView('LIST');
  };

  const handleSubmitRoutine = async () => {
    if (!routineTitle) {
      setError(t('routine.needName'));
      return;
    }
    if (addedExercises.length === 0) {
      setError(t('routine.needExercise'));
      return;
    }

    const routineData = {
      title: routineTitle,
      exercises: addedExercises.map((ex, index) => ({
        exercise_id: ex.db_id,
        index: index,
        weight_kg: ex.weight_kg,
        reps: ex.reps,
        sets: Array.from({ length: ex.sets }, (_, i) => ({
          index: i,
          type: 'normal'
        })),
      })),
    };

    try {
      const response = await routinesAPI.createRoutine(routineData);
      onRoutineCreated(response.data);
      onClose();
    } catch (err) {
      console.error('Error al crear la rutina:', err);
      setError(err.response?.data?.message || t('routine.saveError'));
    }
  };

  const inputClass =
    'mt-1 block w-full border border-edge rounded-xl p-2.5 bg-raised text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent';

  // Vista 3: Detalles del Ejercicio (Reps/Peso/Sets)
  const renderExerciseDetails = () => (
    <div>
      <button onClick={() => setCurrentView('LIST')} className="text-sm text-muted hover:text-ink mb-4 transition-colors">
        {t('routine.backToList')}
      </button>
      <div className="text-center mb-4">
        {exerciseForm.image && (
          <img
            src={exerciseForm.image || 'https://placehold.co/128x128/e2e8f0/64748b?text=?'}
            alt={exerciseForm.name}
            className="w-32 h-32 object-cover mx-auto rounded-xl bg-raised"
          />
        )}
        <h3 className="text-xl font-display font-semibold mt-2 text-ink">{exerciseForm.name}</h3>
      </div>
      <form onSubmit={handleSaveExercise} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-muted">{t('routine.weight')}</label>
            <input
              type="number"
              value={exerciseForm.weight_kg}
              onChange={(e) => setExerciseForm({ ...exerciseForm, weight_kg: e.target.value })}
              required
              className={inputClass}
              placeholder="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">{t('routine.reps')}</label>
            <input
              type="number"
              value={exerciseForm.reps}
              onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
              required
              className={inputClass}
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted">{t('routine.sets')}</label>
            <input
              type="number"
              value={exerciseForm.sets}
              onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })}
              required
              className={inputClass}
              placeholder="3"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors"
        >
          {t('routine.addToRoutine')}
        </button>
      </form>
    </div>
  );

  // Vista 2: Lista de Ejercicios (Filtrada)
  const renderExerciseList = () => (
    <div>
      <button onClick={() => setCurrentView('MAIN')} className="text-sm text-muted hover:text-ink mb-4 transition-colors">
        {t('routine.backToRoutine')}
      </button>

      <div className="mb-4">
        <label className="block text-sm font-medium text-muted">{t('routine.filterLabel')}</label>
        <select
          value={filterCategory || ''}
          onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
          className={inputClass}
        >
          <option value="">{t('routine.allGroups')}</option>
          {MUSCLE_GROUP_IDS.map((id) => (
            <option key={id} value={id}>{t(`muscle.${id}`)}</option>
          ))}
        </select>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {loadingExercises ? <p className="text-muted">{t('routine.loadingExercises')}</p> :
          allExercises
            .filter(ex => !filterCategory || ex.category === filterCategory)
            .map(ex => (
              <div
                key={ex.id}
                onClick={() => handleSelectExercise(ex)}
                className="flex items-center p-3 bg-raised rounded-xl hover:bg-edge/60 cursor-pointer transition-colors"
              >
                <img
                  src={ex.ExerciseImages?.[0]?.image_url || 'https://placehold.co/48x48/e2e8f0/64748b?text=?'}
                  alt={ex.name}
                  className="w-12 h-12 object-cover rounded-lg bg-surface"
                />
                <span className="ml-4 font-medium text-ink">{ex.name}</span>
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
        <label className="block text-sm font-medium text-muted">{t('routine.name')}</label>
        <input
          type="text"
          value={routineTitle}
          onChange={(e) => setRoutineTitle(e.target.value)}
          placeholder={t('routine.namePlaceholder')}
          className={inputClass}
        />
      </div>

      <div className="mb-4">
        <h4 className="text-lg font-display font-medium mb-2 text-ink">
          {t('routine.added', { count: addedExercises.length })}
        </h4>
        <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-raised rounded-xl">
          {addedExercises.length === 0 ? (
            <p className="text-muted text-sm text-center py-4">{t('routine.addHint')}</p>
          ) : (
            addedExercises.map((ex, index) => (
              <div key={ex.id} className="flex justify-between items-center bg-surface border border-edge p-2.5 rounded-lg">
                <div>
                  <p className="font-semibold text-ink">{index + 1}. {ex.name}</p>
                  <p className="text-sm text-muted">
                    {t('routine.summary', { sets: ex.sets, reps: ex.reps, kg: ex.weight_kg })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => setCurrentView('LIST')}
        className="w-full px-4 py-2.5 mb-3 bg-raised text-ink border border-edge rounded-full hover:bg-edge/60 transition-colors font-medium"
      >
        {t('routine.addExercise')}
      </button>

      <button
        onClick={handleSubmitRoutine}
        className="w-full px-4 py-2.5 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors"
      >
        {t('routine.save')}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-lg animate-fade-up">
        <div className="flex justify-between items-center p-4 border-b border-edge">
          <h2 className="text-xl font-display font-bold text-ink">{t('routine.createTitle')}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="p-6">
          {error && <p className="text-danger text-sm mb-4 text-center">{error}</p>}

          {currentView === 'MAIN' && renderMainView()}
          {currentView === 'LIST' && renderExerciseList()}
          {currentView === 'DETAILS' && renderExerciseDetails()}
        </div>
      </div>
    </div>
  );
};

export default CreateRoutineModal;

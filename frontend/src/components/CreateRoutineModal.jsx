// frontend/src/components/CreateRoutineModal.jsx
// Wizard de creación de rutinas en 3 pasos:
//   1. Objetivo (cards)  2. Frecuencia semanal (cards + chips de días)
//   3. Armado por día (tabs de días → grupos musculares → ejercicios → kg/reps/sets)
import React, { useState, useEffect, useMemo } from 'react';
import { exercisesAPI, routinesAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const OBJECTIVES = [
  { slug: 'hypertrophy', emoji: '💪' },
  { slug: 'strength', emoji: '🏋️' },
  { slug: 'fatloss', emoji: '🔥' },
  { slug: 'endurance', emoji: '🏃' },
  { slug: 'active', emoji: '🌱' },
];

const SPLITS = [
  { slug: 'fullbody', emoji: '🧍', days: [2, 3], defaultDays: 3 },
  { slug: 'upperlower', emoji: '⚖️', days: [4], defaultDays: 4 },
  { slug: 'ppl', emoji: '🗓️', days: [5, 6], defaultDays: 5 },
];

// IDs de grupos musculares de Wger (labels en i18n: muscle.<id>)
const MUSCLE_GROUPS = [
  { id: 11, emoji: '🛡️' }, // Pecho
  { id: 12, emoji: '🦅' }, // Espalda
  { id: 9, emoji: '🦵' },  // Piernas
  { id: 13, emoji: '⛰️' }, // Hombros
  { id: 8, emoji: '💪' },  // Brazos
  { id: 10, emoji: '🧘' }, // Abdominales
  { id: 14, emoji: '🦶' }, // Pantorrillas
];

const OptionCard = ({ selected, onClick, emoji, title, desc, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left w-full p-4 rounded-2xl border-2 transition-colors ${
      selected
        ? 'border-accent bg-accent/10'
        : 'border-edge bg-raised hover:border-muted/50'
    }`}
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl leading-none mt-0.5">{emoji}</span>
      <div className="min-w-0">
        <p className={`font-display font-semibold ${selected ? 'text-ink' : 'text-ink'}`}>{title}</p>
        <p className="text-sm text-muted mt-0.5">{desc}</p>
        {children}
      </div>
    </div>
  </button>
);

const CreateRoutineModal = ({ onClose, onRoutineCreated }) => {
  const { t } = useI18n();

  // Paso del wizard y sub-vista del paso 3
  const [step, setStep] = useState(1);
  const [view, setView] = useState('DAYS'); // DAYS | GROUPS | LIST | DETAILS

  // Selecciones
  const [objective, setObjective] = useState(null);
  const [split, setSplit] = useState(null);
  const [daysPerWeek, setDaysPerWeek] = useState(null);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  // Ejercicios por día: { 1: [items], 2: [items], ... }
  const [days, setDays] = useState({});
  const [activeDay, setActiveDay] = useState(1);

  // Picker de ejercicios
  const [allExercises, setAllExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [groupFilter, setGroupFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [exerciseForm, setExerciseForm] = useState(null); // { db_id, name, image, reps, weight_kg, sets }

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    exercisesAPI.getAllExercises()
      .then((res) => setAllExercises(res.data || []))
      .catch((err) => {
        console.error('Error cargando ejercicios', err);
        setError(t('routine.loadError'));
      })
      .finally(() => setLoadingExercises(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Título sugerido según split (editable; no pisa lo que escribió el usuario)
  const suggestTitle = (splitSlug) => {
    if (!titleTouched) setTitle(t(`split.${splitSlug}`));
  };

  const pickSplit = (s) => {
    setSplit(s.slug);
    setDaysPerWeek(s.defaultDays);
    suggestTitle(s.slug);
  };

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allExercises
      .filter((ex) => !groupFilter || ex.category === groupFilter)
      .filter((ex) => !q || ex.name.toLowerCase().includes(q));
  }, [allExercises, groupFilter, search]);

  const dayItems = days[activeDay] || [];
  const totalExercises = Object.values(days).flat().length;

  const addExerciseToDay = (e) => {
    e.preventDefault();
    const item = { ...exerciseForm, uid: Date.now() };
    setDays((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), item],
    }));
    setExerciseForm(null);
    setSearch('');
    setView('DAYS');
  };

  const removeExercise = (day, uid) => {
    setDays((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((it) => it.uid !== uid),
    }));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(t('routine.needName'));
      return;
    }
    if (totalExercises === 0) {
      setError(t('routine.needExercise'));
      return;
    }
    setSaving(true);
    setError('');

    // Aplanar días → payload; solo días dentro de la frecuencia elegida
    let index = 0;
    const exercises = [];
    for (let d = 1; d <= daysPerWeek; d++) {
      for (const it of days[d] || []) {
        exercises.push({
          exercise_id: it.db_id,
          index: index++,
          day: d,
          weight_kg: it.weight_kg,
          reps: it.reps,
          sets: Array.from({ length: it.sets }, (_, i) => ({ index: i, type: 'normal' })),
        });
      }
    }

    try {
      const response = await routinesAPI.createRoutine({
        title: title.trim(),
        objective,
        days_per_week: daysPerWeek,
        exercises,
      });
      onRoutineCreated(response.data);
      onClose();
    } catch (err) {
      console.error('Error al crear la rutina:', err);
      setError(err.response?.data?.message || t('routine.saveError'));
      setSaving(false);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 3) {
      if (view === 'DETAILS') return setView('LIST');
      if (view === 'LIST') return setView('GROUPS');
      if (view === 'GROUPS') return setView('DAYS');
      return setStep(2);
    }
    if (step === 2) return setStep(1);
    onClose();
  };

  const inputClass =
    'block w-full border border-edge rounded-xl p-2.5 bg-raised text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent';

  const STEPS = [t('wizard.stepObjective'), t('wizard.stepFrequency'), t('wizard.stepExercises')];

  // ---------- Paso 1: Objetivo ----------
  const renderObjective = () => (
    <div>
      <h3 className="text-xl font-display font-bold text-ink">{t('wizard.objectiveTitle')}</h3>
      <p className="text-sm text-muted mb-4">{t('wizard.objectiveSub')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OBJECTIVES.map((o) => (
          <OptionCard
            key={o.slug}
            selected={objective === o.slug}
            onClick={() => setObjective(o.slug)}
            emoji={o.emoji}
            title={t(`objective.${o.slug}`)}
            desc={t(`objective.${o.slug}.desc`)}
          />
        ))}
      </div>
    </div>
  );

  // ---------- Paso 2: Frecuencia ----------
  const renderFrequency = () => (
    <div>
      <h3 className="text-xl font-display font-bold text-ink">{t('wizard.frequencyTitle')}</h3>
      <p className="text-sm text-muted mb-4">{t('wizard.frequencySub')}</p>
      <div className="space-y-3">
        {SPLITS.map((s) => (
          <OptionCard
            key={s.slug}
            selected={split === s.slug}
            onClick={() => pickSplit(s)}
            emoji={s.emoji}
            title={t(`split.${s.slug}`)}
            desc={t(`split.${s.slug}.desc`)}
          >
            {split === s.slug && s.days.length > 1 && (
              <div className="flex gap-2 mt-3">
                {s.days.map((d) => (
                  <span
                    key={d}
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setDaysPerWeek(d); }}
                    className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                      daysPerWeek === d
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface text-muted border border-edge hover:text-ink'
                    }`}
                  >
                    {t('wizard.daysChip', { n: d })}
                  </span>
                ))}
              </div>
            )}
          </OptionCard>
        ))}
      </div>
    </div>
  );

  // ---------- Paso 3: Días y ejercicios ----------
  const renderDays = () => (
    <div>
      <h3 className="text-xl font-display font-bold text-ink">{t('wizard.exercisesTitle')}</h3>
      <p className="text-sm text-muted mb-4">{t('wizard.exercisesSub')}</p>

      <input
        type="text"
        value={title}
        onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
        placeholder={t('routine.namePlaceholder')}
        className={`${inputClass} mb-4 font-display font-semibold`}
      />

      {/* Tabs de días */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {Array.from({ length: daysPerWeek }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setActiveDay(d)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeDay === d
                ? 'bg-accent text-on-accent'
                : 'bg-raised text-muted border border-edge hover:text-ink'
            }`}
          >
            {t('wizard.day', { n: d })}
            {(days[d] || []).length > 0 && (
              <span className={activeDay === d ? 'opacity-70' : 'text-accent'}> · {(days[d] || []).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Ejercicios del día activo */}
      {dayItems.length === 0 ? (
        <div className="bg-raised border border-edge rounded-2xl p-6 text-center mb-4">
          <p className="text-muted text-sm">{t('wizard.dayEmpty')}</p>
        </div>
      ) : (
        <ul className="space-y-2 mb-4">
          {dayItems.map((it) => (
            <li key={it.uid} className="flex items-center gap-3 bg-raised border border-edge rounded-xl p-3">
              <img
                src={it.image || 'https://placehold.co/40x40/e2e8f0/64748b?text=?'}
                alt=""
                className="w-10 h-10 object-cover rounded-lg bg-surface shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{it.name}</p>
                <p className="text-xs text-muted">
                  {t('routine.summary', { sets: it.sets, reps: it.reps, kg: it.weight_kg })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(activeDay, it.uid)}
                title={t('wizard.remove')}
                className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-danger/10 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setView('GROUPS')}
        className="w-full px-4 py-3 bg-raised text-ink border-2 border-dashed border-edge rounded-2xl hover:border-accent/60 hover:text-accent transition-colors font-medium"
      >
        + {t('wizard.pickGroup')}
      </button>
    </div>
  );

  const renderGroups = () => (
    <div>
      <h3 className="text-xl font-display font-bold text-ink mb-4">
        {t('wizard.day', { n: activeDay })} · {t('wizard.pickGroup')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MUSCLE_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setGroupFilter(g.id); setView('LIST'); }}
            className="p-4 rounded-2xl border-2 border-edge bg-raised hover:border-accent/60 transition-colors text-center"
          >
            <div className="text-3xl mb-1.5">{g.emoji}</div>
            <p className="font-display font-semibold text-ink text-sm">{t(`muscle.${g.id}`)}</p>
            <p className="text-xs text-muted mt-0.5">
              {t('wizard.exerciseCount', { n: allExercises.filter((ex) => ex.category === g.id).length })}
            </p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderList = () => (
    <div>
      <h3 className="text-xl font-display font-bold text-ink mb-3">
        {t(`muscle.${groupFilter}`)}
      </h3>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('wizard.searchExercise')}
        className={`${inputClass} mb-3`}
        autoFocus
      />
      {loadingExercises ? (
        <p className="text-muted text-sm">{t('routine.loadingExercises')}</p>
      ) : filteredExercises.length === 0 ? (
        <p className="text-muted text-sm text-center py-6">{t('wizard.noResults')}</p>
      ) : (
        <div className="space-y-2">
          {filteredExercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                setExerciseForm({
                  db_id: ex.id,
                  name: ex.name,
                  image: ex.ExerciseImages?.[0]?.image_url || null,
                  reps: '',
                  weight_kg: '',
                  sets: 3,
                });
                setView('DETAILS');
              }}
              className="w-full flex items-center p-3 bg-raised border border-edge rounded-xl hover:border-accent/60 transition-colors text-left"
            >
              <img
                src={ex.ExerciseImages?.[0]?.image_url || 'https://placehold.co/48x48/e2e8f0/64748b?text=?'}
                alt=""
                className="w-12 h-12 object-cover rounded-lg bg-surface"
              />
              <span className="ml-3 font-medium text-ink">{ex.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderDetails = () => (
    <div>
      <div className="text-center mb-5">
        {exerciseForm.image && (
          <img
            src={exerciseForm.image}
            alt={exerciseForm.name}
            className="w-28 h-28 object-cover mx-auto rounded-2xl bg-raised border border-edge"
          />
        )}
        <h3 className="text-xl font-display font-semibold mt-3 text-ink">{exerciseForm.name}</h3>
      </div>
      <form onSubmit={addExerciseToDay} className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">{t('routine.weight')}</label>
            <input
              type="number"
              value={exerciseForm.weight_kg}
              onChange={(e) => setExerciseForm({ ...exerciseForm, weight_kg: e.target.value })}
              required
              min="0"
              className={inputClass}
              placeholder="50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">{t('routine.reps')}</label>
            <input
              type="number"
              value={exerciseForm.reps}
              onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
              required
              min="1"
              className={inputClass}
              placeholder="10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">{t('routine.sets')}</label>
            <input
              type="number"
              value={exerciseForm.sets}
              onChange={(e) => setExerciseForm({ ...exerciseForm, sets: e.target.value })}
              required
              min="1"
              className={inputClass}
              placeholder="3"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-3 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors"
        >
          {t('wizard.addToDay', { n: activeDay })}
        </button>
      </form>
    </div>
  );

  const canContinue = (step === 1 && objective) || (step === 2 && split && daysPerWeek);
  const showFooter = step < 3 || view === 'DAYS';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-2xl h-[min(720px,90vh)] flex flex-col animate-fade-up">

        {/* Header: atrás + progreso + cerrar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-edge shrink-0">
          <button
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-raised transition-colors text-muted hover:text-ink"
            title={t('wizard.back')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="flex-1 flex items-center gap-2">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const state = n < step ? 'done' : n === step ? 'current' : 'todo';
              return (
                <div key={label} className="flex-1">
                  <div className={`h-1 rounded-full mb-1 ${state === 'todo' ? 'bg-edge' : 'bg-accent'}`}></div>
                  <p className={`text-[11px] font-medium ${state === 'current' ? 'text-ink' : 'text-muted'}`}>{label}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-raised transition-colors text-muted hover:text-ink"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-xl text-sm">
              {error}
            </div>
          )}
          {step === 1 && renderObjective()}
          {step === 2 && renderFrequency()}
          {step === 3 && view === 'DAYS' && renderDays()}
          {step === 3 && view === 'GROUPS' && renderGroups()}
          {step === 3 && view === 'LIST' && renderList()}
          {step === 3 && view === 'DETAILS' && exerciseForm && renderDetails()}
        </div>

        {/* Footer */}
        {showFooter && (
          <div className="px-5 py-4 border-t border-edge shrink-0">
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canContinue}
                className="w-full px-4 py-3 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('wizard.next')}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || totalExercises === 0}
                className="w-full px-4 py-3 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? t('common.saving') : t('routine.save')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoutineModal;

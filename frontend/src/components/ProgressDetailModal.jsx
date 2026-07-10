// frontend/src/components/ProgressDetailModal.jsx
// Detalle de progreso de un ejercicio: gráfico grande explorable (hover/touch
// selecciona puntos), rangos 1 mes / 1 año / todo, stats e historial.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { logsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const fmtKg = (w) => {
  const n = parseFloat(w);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kg`;
};

const fmtDelta = (delta) => {
  const rounded = Math.round(delta * 10) / 10;
  const abs = Math.abs(rounded) % 1 === 0 ? Math.abs(rounded).toFixed(0) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${abs} kg`;
};

const RANGES = [
  { key: '1m', days: 30 },
  { key: '1y', days: 365 },
  { key: 'all', days: null },
];

// Gráfico grande: línea + puntos, ejes min/max y fechas, punto seleccionado
// con hover/touch (readout arriba del gráfico).
const BigChart = ({ logs, selected, onSelect, locale }) => {
  const svgRef = useRef(null);
  const W = 560, H = 220, padX = 42, padY = 18;

  const values = logs.map((l) => parseFloat(l.weight_kg));
  const times = logs.map((l) => new Date(l.created_at).getTime());
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const tRange = t1 - t0 || 1;

  const x = (t) => padX + ((t - t0) * (W - padX - 14)) / tRange;
  const y = (v) => H - padY - ((v - min) * (H - 2 * padY)) / range;

  const points = logs.map((l, i) => ({ px: x(times[i]), py: y(values[i]), i }));
  const poly = points.map((p) => `${p.px},${p.py}`).join(' ');

  // Selección por cercanía en X (mouse o touch)
  const pick = (clientX) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W;
    let best = 0, bestDist = Infinity;
    points.forEach((p) => {
      const d = Math.abs(p.px - relX);
      if (d < bestDist) { bestDist = d; best = p.i; }
    });
    onSelect(best);
  };

  const midY = (min + max) / 2;
  const dateLabel = (t) => new Date(t).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-none select-none"
      onMouseMove={(e) => pick(e.clientX)}
      onTouchStart={(e) => pick(e.touches[0].clientX)}
      onTouchMove={(e) => pick(e.touches[0].clientX)}
    >
      {/* Guías horizontales */}
      {[min, midY, max].map((v, i) => (
        <g key={i}>
          <line x1={padX} y1={y(v)} x2={W - 14} y2={y(v)} className="stroke-edge" strokeWidth="1" strokeDasharray="3 4" />
          <text x={padX - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted" fontSize="10">
            {Math.round(v * 10) / 10}
          </text>
        </g>
      ))}

      {/* Fechas extremos */}
      <text x={padX} y={H - 2} className="fill-muted" fontSize="10">{dateLabel(t0)}</text>
      <text x={W - 14} y={H - 2} textAnchor="end" className="fill-muted" fontSize="10">{dateLabel(t1)}</text>

      {/* Línea y puntos */}
      <polyline points={poly} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-accent" />
      {points.map((p) => (
        <circle
          key={p.i}
          cx={p.px}
          cy={p.py}
          r={p.i === selected ? 5.5 : 3}
          className={p.i === selected ? 'fill-accent' : 'fill-accent/60'}
        />
      ))}
      {/* Guía vertical del punto seleccionado */}
      {points[selected] && (
        <line
          x1={points[selected].px} y1={padY - 6}
          x2={points[selected].px} y2={H - padY}
          className="stroke-accent/40" strokeWidth="1"
        />
      )}
    </svg>
  );
};

const ProgressDetailModal = ({ exercise, onClose }) => {
  const { t, locale } = useI18n();
  const [logs, setLogs] = useState(null); // desc por fecha
  const [rangeKey, setRangeKey] = useState('1m');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    logsAPI.getExerciseHistory(exercise.id)
      .then((res) => setLogs(Array.isArray(res.data) ? res.data : []))
      .catch(() => setLogs([]));
  }, [exercise.id]);

  // Logs del rango, en orden cronológico para el gráfico
  const rangeLogs = useMemo(() => {
    if (!logs) return [];
    const days = RANGES.find((r) => r.key === rangeKey)?.days;
    const cutoff = days ? Date.now() - days * 24 * 3600 * 1000 : 0;
    return logs
      .filter((l) => new Date(l.created_at).getTime() >= cutoff)
      .slice()
      .reverse();
  }, [logs, rangeKey]);

  // Al cambiar el rango, seleccionar el último punto
  useEffect(() => {
    setSelected(Math.max(0, rangeLogs.length - 1));
  }, [rangeLogs.length, rangeKey]);

  const sel = rangeLogs[selected];
  const pr = logs && logs.length
    ? logs.reduce((b, l) => (parseFloat(l.weight_kg) > parseFloat(b.weight_kg) ? l : b), logs[0])
    : null;
  const rangeDelta = rangeLogs.length >= 2
    ? parseFloat(rangeLogs[rangeLogs.length - 1].weight_kg) - parseFloat(rangeLogs[0].weight_kg)
    : null;

  const dateFull = (d) =>
    new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-up">

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-edge sticky top-0 bg-surface z-10">
          <img
            src={exercise.image || 'https://placehold.co/48x48/e2e8f0/64748b?text=%20'}
            alt=""
            className="w-11 h-11 object-cover rounded-lg bg-raised shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-ink truncate">{exercise.name}</h2>
            {exercise.category && (
              <p className="text-xs text-muted">{t(`muscle.${exercise.category}`)}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-raised transition-colors text-muted hover:text-ink">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {/* Rangos */}
          <div className="flex gap-2 mb-4">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  rangeKey === r.key
                    ? 'bg-accent text-on-accent'
                    : 'bg-raised text-muted border border-edge hover:text-ink'
                }`}
              >
                {t(`progress.range${r.key === 'all' ? 'All' : r.key}`)}
              </button>
            ))}
          </div>

          {logs === null ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
          ) : rangeLogs.length === 0 ? (
            <p className="text-muted text-sm py-10 text-center">{t('progress.noLogsRange')}</p>
          ) : (
            <>
              {/* Readout del punto seleccionado */}
              {sel && (
                <p className="text-sm mb-1.5">
                  <span className="font-display font-bold text-accent text-lg">{fmtKg(sel.weight_kg)}</span>
                  <span className="text-ink font-medium"> × {sel.reps}</span>
                  <span className="text-muted"> · {sel.sets} sets · {dateFull(sel.created_at)}</span>
                </p>
              )}

              {rangeLogs.length >= 2 ? (
                <BigChart logs={rangeLogs} selected={selected} onSelect={setSelected} locale={locale} />
              ) : (
                <p className="text-muted text-xs mb-2">{t('progress.logOne')}</p>
              )}

              {/* Stats del rango */}
              <div className="flex flex-wrap gap-2 mt-4">
                {pr && (
                  <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-accent/10 text-accent">
                    {t('log.pr')}: {fmtKg(pr.weight_kg)} × {pr.reps}
                  </span>
                )}
                {rangeDelta !== null && (
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    rangeDelta > 0 ? 'bg-accent/10 text-accent' : 'bg-raised text-muted border border-edge'
                  }`}>
                    {fmtDelta(rangeDelta)} {t('progress.rangeDelta')}
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-raised text-muted border border-edge">
                  {rangeLogs.length === 1 ? t('progress.logOne') : t('progress.logCount', { n: rangeLogs.length })}
                </span>
              </div>

              {/* Historial del rango (más nuevo primero) */}
              <h3 className="flex items-center gap-2.5 mt-6 mb-2">
                <span className="w-1 h-4 rounded-full bg-accent"></span>
                <span className="font-display font-bold text-ink uppercase tracking-wide text-xs">
                  {t('progress.history')}
                </span>
              </h3>
              <ul className="divide-y divide-edge">
                {rangeLogs.slice().reverse().map((l, idx) => {
                  const i = rangeLogs.length - 1 - idx;
                  return (
                    <li
                      key={l.id}
                      onClick={() => setSelected(i)}
                      className={`flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-colors ${
                        i === selected ? 'bg-accent/10' : 'hover:bg-raised'
                      }`}
                    >
                      <span className="text-sm text-muted">{dateFull(l.created_at)}</span>
                      <span className="text-sm font-semibold text-ink">
                        {fmtKg(l.weight_kg)} × {l.reps} <span className="text-muted font-normal">· {l.sets} sets</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressDetailModal;

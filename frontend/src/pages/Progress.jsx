// frontend/src/pages/Progress.jsx
// Página privada de progreso: todos los ejercicios registrados con su
// tendencia, comparación mensual, récords personales y sparkline SVG.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { logsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { DumbbellIcon } from '../components/Icons';
import ProgressDetailModal from '../components/ProgressDetailModal';

const fmtKg = (w) => {
  const n = parseFloat(w);
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} kg`;
};

const fmtDelta = (delta) => {
  const rounded = Math.round(delta * 10) / 10;
  const abs = Math.abs(rounded) % 1 === 0 ? Math.abs(rounded).toFixed(0) : Math.abs(rounded).toFixed(1);
  return `${rounded > 0 ? '+' : '−'}${abs} kg`;
};

// Sparkline SVG minimalista: línea de pesos + punto en el último registro
const Sparkline = ({ series }) => {
  if (!series || series.length < 2) return null;
  const w = 120, h = 36, pad = 4;
  const values = series.map((p) => p.w);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (i) => pad + (i * (w - 2 * pad)) / (values.length - 1);
  const y = (v) => h - pad - ((v - min) * (h - 2 * pad)) / range;
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const lastUp = values[values.length - 1] >= values[0];

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lastUp ? 'stroke-accent' : 'stroke-muted'}
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(values[values.length - 1])}
        r="3"
        className={lastUp ? 'fill-accent' : 'fill-muted'}
      />
    </svg>
  );
};

// Flecha de tendencia según el delta relevante (mes si existe, si no vs. anterior)
const TrendArrow = ({ delta }) => {
  if (delta === null) return null;
  if (delta === 0) {
    return (
      <svg className="w-5 h-5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
      </svg>
    );
  }
  return delta > 0 ? (
    <svg className="w-5 h-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ) : (
    <svg className="w-5 h-5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
    </svg>
  );
};

const Progress = () => {
  const { t, locale } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // ejercicio abierto en el modal

  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    logsAPI.getOverview()
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error cargando progreso:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const relTime = (dateString) => {
    const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (diff < 3600) return t('post.justNow');
    if (diff < 86400) return t('post.hoursAgo', { n: Math.floor(diff / 3600) });
    if (diff < 604800) return t('post.daysAgo', { n: Math.floor(diff / 86400) });
    return new Date(dateString).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-edge rounded-2xl p-10 animate-fade-up">
            <DumbbellIcon size={48} className="mx-auto mb-4 text-muted" />
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('progress.title')}</h1>
            <p className="text-muted mb-6">{t('progress.loginText')}</p>
            <Link
              to="/login"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Top récords por peso (para la franja de PRs)
  const records = [...items]
    .filter((it) => it.pr)
    .sort((a, b) => b.pr.weight_kg - a.pr.weight_kg)
    .slice(0, 6);

  // Secciones por grupo muscular, ordenadas por actividad más reciente.
  // (items ya viene ordenado por último registro desc, así que el orden
  // interno de cada grupo se conserva.)
  const groups = [];
  const groupMap = new Map();
  for (const it of items) {
    const cat = it.exercise.category || 0;
    if (!groupMap.has(cat)) {
      const g = { cat, items: [] };
      groupMap.set(cat, g);
      groups.push(g);
    }
    groupMap.get(cat).items.push(it);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-ink">{t('progress.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('progress.subtitle')}</p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-10 text-center">
            <DumbbellIcon size={48} className="mx-auto mb-4 text-muted" />
            <h3 className="text-xl font-display font-semibold text-ink mb-2">{t('progress.emptyTitle')}</h3>
            <p className="text-muted mb-6">{t('progress.emptyText')}</p>
            <Link
              to="/routines"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              {t('progress.goRoutines')}
            </Link>
          </div>
        ) : (
          <>
            {/* Récords personales */}
            {records.length > 0 && (
              <div className="mb-8">
                <h2 className="flex items-center gap-2.5 mb-3">
                  <span className="w-1 h-5 rounded-full bg-accent"></span>
                  <span className="font-display font-bold text-ink uppercase tracking-wide text-sm">
                    {t('progress.records')}
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {records.map((it) => (
                    <div key={it.exercise.id} className="bg-surface border border-edge rounded-2xl p-4">
                      <p className="text-2xl font-display font-bold text-accent">{fmtKg(it.pr.weight_kg)}</p>
                      <p className="text-sm text-ink font-medium truncate mt-0.5" title={it.exercise.name}>
                        {it.exercise.name}
                      </p>
                      <p className="text-xs text-muted mt-0.5">× {it.pr.reps}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ejercicios por grupo muscular (grupo más activo primero) */}
            <div className="space-y-8">
              {groups.map((g) => (
                <div key={g.cat}>
                  <h2 className="flex items-center gap-2.5 mb-3">
                    <span className="w-1 h-5 rounded-full bg-accent"></span>
                    <span className="font-display font-bold text-ink uppercase tracking-wide text-sm">
                      {g.cat ? t(`muscle.${g.cat}`) : '—'}
                    </span>
                    <span className="text-xs text-muted">
                      {g.items.length === 1 ? '1' : g.items.length}
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {g.items.map((it) => {
                      const trendDelta = it.monthAgo
                        ? it.last.weight_kg - it.monthAgo.weight_kg
                        : it.prev
                          ? it.last.weight_kg - it.prev.weight_kg
                          : null;
                      return (
                        <div
                          key={it.exercise.id}
                          onClick={() => setDetail(it.exercise)}
                          className="bg-surface border border-edge rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-accent/50 transition-colors"
                        >
                          <img
                            src={it.exercise.image || 'https://placehold.co/64x64/e2e8f0/64748b?text=%20'}
                            alt=""
                            className="w-14 h-14 object-cover rounded-xl bg-raised shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-semibold text-ink truncate">{it.exercise.name}</p>
                              <TrendArrow delta={trendDelta} />
                            </div>
                            <p className="text-sm text-muted mt-0.5 flex flex-wrap gap-x-2">
                              <span>
                                <span className="font-semibold text-ink">{fmtKg(it.last.weight_kg)} × {it.last.reps}</span>{' '}
                                · {relTime(it.last.created_at)}
                              </span>
                              {it.monthAgo && (
                                <span className={trendDelta > 0 ? 'text-accent font-semibold' : ''}>
                                  {trendDelta === 0 ? t('log.noChange') : fmtDelta(trendDelta)} {t('log.thisMonth')}
                                </span>
                              )}
                              <span>
                                {t('log.pr')}: <span className="text-ink font-semibold">{fmtKg(it.pr.weight_kg)}</span>
                              </span>
                            </p>
                            <p className="text-xs text-muted mt-0.5">
                              {it.total_logs === 1 ? t('progress.logOne') : t('progress.logCount', { n: it.total_logs })}
                            </p>
                          </div>
                          <Sparkline series={it.series} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de detalle de progreso */}
      {detail && (
        <ProgressDetailModal exercise={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  );
};

export default Progress;

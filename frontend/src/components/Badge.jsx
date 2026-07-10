// frontend/src/components/Badge.jsx
// Medallón hexagonal de insignia. El color señala la dificultad del nivel,
// asignado desde el nivel más difícil hacia atrás:
// verde (fácil) → amarillo (medio) → rojo (difícil) → violeta (extremo).
import React from 'react';

const TIER_COLORS = ['#22c55e', '#eab308', '#ef4444', '#a855f7'];

// Para insignias con N niveles, el nivel t (1..N) toma el color contando
// desde el final: el último siempre es violeta, el anterior rojo, etc.
export const tierColor = (tier, totalTiers) => {
  const idx = Math.max(0, TIER_COLORS.length - 1 - (totalTiers - tier));
  return TIER_COLORS[idx];
};

const ICON_PATHS = {
  // Calendario (regularidad)
  regularity: 'M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75zM9 12h.01M12.75 12h.01M16.5 12h.01M9 15.75h.01M12.75 15.75h.01',
  // Estrella (récords)
  prs: 'M11.48 3.5a.562.562 0 011.04 0l2.125 5.11a.563.563 0 00.475.345l5.518.442c.5.04.7.663.32.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557L3.04 10.385a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
  // Tendencia (progreso)
  progress: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
  // Marcador (creador: te guardaron rutinas)
  creator: 'M17.593 3.322c1.1.128 1.907 1.077 1.907 2.178V21l-5.625-3.375L8.25 21V5.5c0-1.1.808-2.05 1.907-2.178a48.5 48.5 0 017.436 0z',
};

// Hexágono pointy-top con esquinas redondeadas (strokeLinejoin round sobre
// fill+stroke del mismo color hace el redondeo).
const HEX_POINTS = '24,3 42.5,13.5 42.5,34.5 24,45 5.5,34.5 5.5,13.5';

const Badge = ({ slug, tier, totalTiers, locked = false, size = 48 }) => {
  const color = locked ? 'rgb(var(--c-muted))' : tierColor(tier, totalTiers);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ minWidth: size }}>
      {/* Cuerpo del hexágono */}
      <polygon
        points={HEX_POINTS}
        fill={locked ? 'transparent' : color}
        fillOpacity={locked ? 0 : 0.14}
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeDasharray={locked ? '4 4' : 'none'}
        opacity={locked ? 0.6 : 1}
      />
      {/* Icono */}
      <g transform="translate(12,12) scale(1)">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path
            d={ICON_PATHS[slug]}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={locked ? 0.6 : 1}
          />
        </svg>
      </g>
    </svg>
  );
};

export default Badge;

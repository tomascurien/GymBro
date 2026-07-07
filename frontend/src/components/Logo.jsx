import React from 'react';

// Isotipo de Forma: tres barras ascendentes (progreso) dentro de un cuadrado redondeado.
// Usa currentColor/accent vía tokens, así funciona en ambos temas.
export const LogoMark = ({ size = 32, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="48" height="48" rx="12" className="fill-ink dark:fill-accent" />
    <rect x="10" y="26" width="7" height="12" rx="2.5" className="fill-canvas dark:fill-on-accent" opacity="0.55" />
    <rect x="20.5" y="19" width="7" height="19" rx="2.5" className="fill-canvas dark:fill-on-accent" opacity="0.8" />
    <rect x="31" y="10" width="7" height="28" rx="2.5" className="fill-canvas dark:fill-on-accent" />
  </svg>
);

// Logo completo: isotipo + wordmark.
const Logo = ({ size = 32, className = '', wordmarkClass = 'text-ink' }) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark size={size} />
    <span
      className={`font-display font-bold tracking-tight ${wordmarkClass}`}
      style={{ fontSize: size * 0.7 }}
    >
      forma
    </span>
  </span>
);

export default Logo;

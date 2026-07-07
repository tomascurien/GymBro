// frontend/src/components/Icons.jsx
// Iconos de línea SVG para estados vacíos y páginas (sin emojis en la UI).
import React from 'react';

const base = (size, className) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  className,
});

export const DumbbellIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5v11M4 8v8M2 9.5v5M17.5 6.5v11M20 8v8M22 9.5v5M6.5 12h11" />
  </svg>
);

export const BookmarkIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.178V21l-5.625-3.375L8.25 21V5.5c0-1.1.808-2.05 1.907-2.178a48.5 48.5 0 017.436 0z" />
  </svg>
);

export const HeartIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

export const MailIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

export const CheckCircleIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const AlertCircleIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const NoteIcon = ({ size = 48, className = '' }) => (
  <svg {...base(size, className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

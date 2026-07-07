---
name: verify
description: Build, launch and drive Forma (frontend CRA + backend Express/Supabase) to verify changes at the real UI/API surface.
---

# Verificar Forma end-to-end

## Backend (Express + Sequelize/Supabase)
```bash
cd backend && node index.js        # usa backend/.env (real, gitignored); puerto 3001
```
- Al bootear corre `sequelize.sync({ alter: true })` contra la DB de Supabase (la misma que usa prod en Railway) — los cambios de modelos se aplican solos.
- Smoke: `curl http://localhost:3001/` → "Forma API funcionando".
- Endpoints públicos útiles: `/api/posts/feed`, `/api/posts/for-you` (aceptan `?limit=&offset=` y token opcional).

## Frontend (CRA)
```bash
cd frontend && REACT_APP_API_URL=http://localhost:3001/api npx react-scripts build
```
- La URL de API se hornea en el build; `frontend/.env` apunta a Railway (prod). Para probar contra el backend local hay que rebuiltear con el override, y al terminar **rebuildear sin override** para no dejar `localhost` en `build/`.
- Servir el build con un static server con fallback SPA (no hay `serve` instalado; un `http.createServer` de 15 líneas alcanza, puerto 5000).
- `npm start` (dev server) también funciona pero tarda más en levantar.

## Driving del UI (headless)
- **No hay Playwright.** Funciona `puppeteer-core` (instalar en el scratchpad, sin descarga de browser) apuntando a Chrome local:
  - `executablePath: process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe'` (Chrome NO está en Program Files).
  - `headless: true`, `userDataDir` temporal, args `--no-sandbox --disable-gpu`.
  - Edge (`Program Files (x86)/Microsoft/Edge`) NO lanza vía puppeteer; con `--headless=new --screenshot=` directo funciona pero se detacha async (el PNG aparece después de que el comando retorna).
- Gotcha de selectores: el botón de búsqueda también vive dentro de `<nav>`; para los toggles de tema/idioma seleccionar por `title` (regex `/tema|theme/i`), no por índice de `nav button`.
- Tema/idioma persisten en localStorage: `forma-theme` ('dark'|'light', default dark), `forma-lang` ('es'|'en').
- El hero del feed usa `animate-fade-up` (arranca en opacity 0): esperar ~1s antes del screenshot o parece que falta.

## Flujos que valen la pena
- `/feed` deslogueado (hero campaña + tabs Para vos/Reciente), toggle de idioma y tema + reload (persistencia), `/login`, `/register` (probar validación con username corto), `/profile/gymbro` (usuario real con posts y rutinas).
- Onboarding completo: registrar `forma_test` → redirige a `/profile/forma_test?welcome=1` con el modal abierto → bio + intereses + avatar (input[type=file] index 0=cover, 1=avatar) → guardar → post con tema.
- **Limpieza obligatoria** si registrás `forma_test` (la DB es la de prod): script node en backend/ que borra Likes/Posts/User y los archivos subidos a Storage (`supabase.storage.from('gymbro-posts').remove([...])`, el filename sale de la URL después de `/gymbro-posts/`).
- Gotcha de selectores (2): `button[type="submit"]` matchea primero el botón Buscar del navbar; para submitear un form específico usar `document.querySelector('input[name=...]').closest('form').querySelector('button[type=submit]')`.

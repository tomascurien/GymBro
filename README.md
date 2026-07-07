# Forma

**Aprende. Comparte. Crece.** / *Learn. Share. Grow.*

> ¿Cuántas veces desinstalaste X, TikTok o Instagram? Probá algo distinto.

**Forma** (antes GymBro) es la anti-red social del entrenamiento: no está hecha para retenerte scrolleando, sino para que crezcas. Compartí tu progreso, armá y guardá rutinas, aprendé de otros y seguí a gente que te empuja hacia adelante.

---

## 📋 Tabla de Contenidos
- [Características](#-características)
- [Marca y diseño](#-marca-y-diseño)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Ejecución](#-ejecución)

---

## 🚀 Características
✔️ Registro e inicio de sesión con JWT
✔️ Perfiles de usuario con nombre, apellido y biografía
✔️ Sistema de seguidores / siguiendo
✔️ **Feed "Para vos"** con ranking propio (engagement × frescura × afinidad), además de Reciente y Siguiendo
✔️ **Likes** en publicaciones
✔️ Creación de posteos con texto, imagen o video (Supabase Storage)
✔️ Creación y guardado de rutinas (ejercicios de la base Wger)
✔️ **Tema oscuro / claro** con persistencia
✔️ **Español / English** con selector en la barra
✔️ Eliminación de posts (dueño o admin)
✔️ Búsqueda de usuarios
✔️ Frontend responsivo en React

## 🎨 Marca y diseño
- **Nombre**: Forma — funciona en ambos idiomas ("estar en forma" / "good form").
- **Identidad**: dark-first, tinta casi negra con acento lima *volt*; tipografía display Space Grotesk + Inter.
- **Sistema de tokens**: variables CSS semánticas (`canvas`, `surface`, `raised`, `edge`, `ink`, `muted`, `accent`) mapeadas a Tailwind — un solo lugar para cambiar toda la paleta ([frontend/src/index.css](frontend/src/index.css)).
- **i18n**: diccionarios ES/EN en [frontend/src/i18n/translations.js](frontend/src/i18n/translations.js).
- **Algoritmo del feed**: `score = (likes×3 + 1) / (horas + 2)^1.5`, con boost a autores seguidos y a posts con media ([backend/routes/postRoutes.js](backend/routes/postRoutes.js)).

---

## 🛠️ Tecnologías Utilizadas

### **Frontend**
- React 19 (CRA)
- React Router 7
- TailwindCSS (dark mode por clase + tokens CSS)
- Formik + Yup
- Axios

### **Backend**
- Node.js + Express 5
- JSON Web Tokens (JWT)
- Sequelize + PostgreSQL (Supabase)
- Supabase Storage (media)
- Multer

---

## Ejecución

Backend:
```bash
cd backend
npm install
node index.js        # requiere .env (ver backend/.env.example)
```

Frontend:
```bash
cd frontend
npm install
npm start            # REACT_APP_API_URL opcional en frontend/.env
```

---------------------------------------------
Proyecto desarrollado por Tomás Curien
---------------------------------------------

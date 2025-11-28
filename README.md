# GymBro es una red social enfocada en el fitness en la que los usuarios comparten posteos, rutinas y más. 

--------------------------------------------- 
BACKEND:
Post register: permite a los usuarios crear su cuenta.
Post login: permite a los usuarios iniciar sesión
Get profile: devuelve el perfil de un usuario (según su username)
Put profile: actualiza el perfil de un usuario (name, surname, bio)
Post follow: permite seguir a usuarios (sólo si está logeado)
Delete follow: elimina el follow
Post content: permite postear (sólo texto)
Get feed: devuelve el feed global de posts de GymBro (en orden descendiente según el momento que fue posteado)
Get user post: devuelve el feed de un usuario (Es decir, una lista de sus posteos)
Delete post: permite eliminar un posteo (sólo si es el dueño de la cuenta o un administrador)
Get ejercicios: devuelve los ejercicios dentro de una rutina
Post rutina: permite crear rutinas (se muestran en el perfil del usuario)
Post rutinas favoritas: permite añadir rutinas de otro usuario a "guardado" dentro del perfil
Delete rutinas favoritas: permite eliminar rutinas guardadas
Get rutinas favoritas: devuelve las rutinas guardadas por el usuario
Get following feed: devuelve un feed de los usuarios a los cuales el usuario sigue (sólo disponible si está logeado)

--------------------------------------------- 
FRONTEND:
Autenticación: Login y registro con validación.
Navbar: Acceso al feed de posts, perfil, menú desplegable y búsqueda de usuarios
Pefil: Listado de posteos, rutinas, rutinas favoritas, función de seguir.
Posts: Crear posts de texto, eliminar posts, feed global y feed de usuarios seguidos.
Rutinas: crear rutinas con ejercicios, guardar rutinas de otros usuarios y detalles de rutinas.

--------------------------------------------- 
Cómo ejecutar el proyecto:
Backend:
-cd backend
-node index.js

Frontend:
-cd frontend
-npm install
-npm start

--------------------------------------------- 
Proyecto desarrollado por Tomás Curien
--------------------------------------------- 


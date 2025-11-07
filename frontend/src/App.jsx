// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import { authAPI } from './services/api';

// Componente para rutas protegidas
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Componente para rutas públicas (redirige al feed si ya está autenticado)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/feed" />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authKey, setAuthKey] = useState(0); // Para forzar re-render del Navbar

  useEffect(() => {
    checkAuth();
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      checkAuth();
      setAuthKey(prev => prev + 1); // Forzar re-render
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar un evento custom para cambios dentro de la misma pestaña
    window.addEventListener('userLoggedIn', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
    };
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  };

  // Función para actualizar autenticación (llamar después del login)
  const updateAuth = () => {
    setIsAuthenticated(true);
    setAuthKey(prev => prev + 1); // Forzar re-render del Navbar
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Navbar siempre visible */}
      <Navbar key={authKey} />
      
      <Routes>
        {/* Rutas públicas */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Ruta Feed - PÚBLICA (accesible sin login) */}
        <Route path="/feed" element={<Feed />} />
        
        {/* Perfil - Puede ser público o privado dependiendo de tu preferencia */}
        <Route path="/profile/:username" element={<Profile />} />

        {/* Ruta por defecto */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/feed" /> : <Navigate to="/login" />
          }
        />

        {/* Ruta 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-green-600 mb-4">404</h1>
                <p className="text-xl text-gray-600">Página no encontrada</p>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
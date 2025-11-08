// frontend/src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';

const Navbar = () => {
  const navigate = useNavigate();
  // Cargar usuario directamente desde localStorage (no en useEffect)
  const getUserFromStorage = () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  };
  
  const [user, setUser] = useState(getUserFromStorage());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Actualizar cuando cambie el localStorage
    const handleStorageChange = () => {
      setUser(getUserFromStorage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
    };
  }, []);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 0) {
      try {
        const response = await usersAPI.searchUsers(query);
        setSearchResults(response.data.users);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Error buscando usuarios:', error);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/feed');
  };

  const goToProfile = (userId) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/profile/${userId}`);
  };

  return (
    <nav className="bg-red-700 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/feed" className="flex items-center space-x-2">
            <img
              src="/GymBrofavicon.png"
              alt="GymBro logo"
              className="h-8 w-8 rounded-md"
            />
            <span className="text-2xl font-bold text-white">GymBro</span>
          </Link>

          {/* Buscador - Deshabilitado temporalmente */}
          <div className="flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Buscar usuarios (próximamente)..."
              className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-800 bg-gray-50"
              disabled
            />
            
            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => goToProfile(result.id)}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold">
                      {result.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <p className="font-semibold text-white">{result.username}</p>
                      <p className="text-sm text-white">{result.full_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Menu de usuario o botones de login */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/feed"
                  className="text-white hover:text-gray-400 font-medium transition"
                >
                  Feed
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </button>

                  {showUserMenu && user.username && (
                    <div className="absolute right-0 mt-2 w-48 bg-red-700 rounded-lg shadow-lg border border-gray-200 py-2">
                      <Link
                        to={`/profile/${user?.username}`}
                        className="block px-4 py-2 text-white hover:bg-red-400"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Mi Perfil
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-red-1000 hover:bg-red-400"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/feed"
                  className="text-white hover:text-gray-400 font-medium transition"
                >
                  Feed
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-white hover:text-gray-400 font-medium transition"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="border border-white text-white font-semibold px-4 py-2 rounded-lg hover:bg-white hover:text-[#E50914] transition"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
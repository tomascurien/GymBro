// frontend/src/pages/Feed.jsx
import React, { useState, useEffect } from 'react';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { postsAPI } from '../services/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('global');

  useEffect(() => {
    // Cargar el feed solo una vez al montar
    loadFeed();
  }, [activeTab]);
  
  useEffect(() => {
    // Escuchar cambios de autenticación en un efecto separado
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      const loggedIn = !!token;
      setIsLoggedIn(loggedIn);
      
      if (!loggedIn && activeTab === 'following') {
        setActiveTab('global');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleStorageChange);
    
    // También verificar inmediatamente al montar el componente
    handleStorageChange();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
    };
  }, [activeTab]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError('');
      
      let response;
      
      if (activeTab === 'following') {
        // Cargar posts de usuarios que sigo
        console.log('Cargando posts de usuarios seguidos...');
        response = await postsAPI.getFollowingFeed();
      } else {
        // Cargar todos los posts (global)
        console.log('Cargando feed global...');
        response = await postsAPI.getFeed();
      }
      
      console.log('✅ Respuesta recibida:', response.data);
      
      // Extraer posts de diferentes estructuras posibles
      let feedPosts = [];
      
      if (Array.isArray(response.data)) {
        feedPosts = response.data;
      } else if (response.data.posts) {
        feedPosts = response.data.posts;
      } else if (response.data.data) {
        feedPosts = response.data.data;
      }
      
      console.log('✅ Posts procesados:', feedPosts.length);
      setPosts(feedPosts);
      
    } catch (err) {
      console.error('❌ Error cargando feed:', err);
      console.error('❌ Status:', err.response?.status);
      console.error('❌ Data:', err.response?.data);
      
      // Si falla, intentar cargar sin autenticación
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('⚠️ Error de autenticación, limpiando token...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        setError('Error al cargar el feed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId) => {
    setPosts(posts.filter((post) => post.id !== postId));
  };

  const handleLikeUpdate = (postId, likeData) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: likeData.isLiked, likes_count: likeData.likes_count }
          : post
      )
    );
  };

  // Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-from-gray-900 to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Botón para crear post - Solo si está logeado */}
        {isLoggedIn && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-full text-left hover:bg-gray-200 transition"
            >
              ¿Qué estás entrenando hoy?
            </button>
          </div>
        )}

        {/* Mensaje para usuarios no logeados */}
        {!isLoggedIn && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">👋 ¡Bienvenido a GymBro!</p>
            <p className="text-sm mt-1">Inicia sesión para crear posts y seguir a otros usuarios.</p>
          </div>
        )}
        {/* tabs */}
        {isLoggedIn && (
          <div className="mb-6 border-b border-gray-200 bg-white rounded-t-xl shadow-md">
            <nav className="-mb-px flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('global')}
                className={`
                  ${activeTab === 'global' 
                    ? 'border-gray-900 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                `}
              >
                 Global
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`
                  ${activeTab === 'following' 
                    ? 'border-gray-900 text-gray-900' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                `}
              >
                 Siguiendo
              </button>
            </nav>
          </div>
        )}

        {/* Mensajes de error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button 
              onClick={loadFeed}
              className="ml-4 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de posts */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay posts todavía
            </h3>
            <p className="text-gray-500 mb-4">
              {isLoggedIn 
                ? '¡Sé el primero en compartir tu progreso!' 
                : 'Inicia sesión para ver posts de la comunidad'}
            </p>
            {isLoggedIn && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Crear Post
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDeleted}
                onLikeUpdate={handleLikeUpdate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal para crear post - Solo si está logeado */}
      {isLoggedIn && showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
};

export default Feed;
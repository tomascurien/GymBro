import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';

const PostCard = ({ post, onDelete }) => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Manejo seguro del usuario en localStorage
  let currentUser = {};
  try {
    const userStr = localStorage.getItem('user');
    currentUser = userStr ? JSON.parse(userStr) : {};
  } catch (e) {
    console.error("Error parsing user", e);
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Justo ahora';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleDelete = async () => {
    try {
      await postsAPI.deletePost(post.id);
      if (onDelete) onDelete(post.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error al eliminar post:', error);
    }
  };

  const goToProfile = () => {
    if (post.User?.username) {
        navigate(`/profile/${post.User.username}`);
    }
  };

  const isOwner = currentUser.id === post.user_id;
  const isAdmin = currentUser.role === "admin";

  // Determinar si hay media para mostrar
  // Priorizamos 'media_url' (nuevo sistema), pero mantenemos 'image' por compatibilidad
  const mediaSource = post.media_url || post.image;
  const isVideo = post.media_type === 'video';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 hover:shadow-lg transition border border-gray-100">
      
      {/* Header del post */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center cursor-pointer group" onClick={goToProfile}>
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-100">
            {post.User?.profile_pic ? (
                 <img src={post.User.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
                 <span className="text-gray-500 font-bold text-lg">{post.User?.username?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="ml-3">
            <p className="font-semibold text-gray-900 group-hover:underline">
              {post.User?.name} {post.User?.surname}
            </p>
            <div className="flex items-center text-sm text-gray-500">
                <span>@{post.User?.username}</span>
                <span className="mx-1">·</span>
                <span>{formatDate(post.created_at)}</span>
            </div>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-gray-400 hover:text-red-500 transition p-1 rounded-full hover:bg-red-50"
            title="Eliminar publicación"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Contenido del post (Texto) */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap text-base leading-relaxed">{post.text}</p>
        </div>
      )}

      {/* Contenido Multimedia (Imagen o Video) */}
      {mediaSource && (
        <div className="w-full bg-black flex justify-center">
            {isVideo ? (
                <video 
                    src={mediaSource} 
                    controls 
                    className="w-full h-auto max-h-[500px] object-contain"
                />
            ) : (
                <img
                    src={mediaSource}
                    alt="Contenido del post"
                    className="w-full h-auto max-h-[500px] object-contain"
                   // onError={(e) => {
                   //     e.target.onerror = null; 
                    //    e.target.style.display = 'none'; // Ocultar si falla la carga
                    //}}
                />
            )}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar publicación?</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Esta acción no se puede deshacer y se perderá permanentemente.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
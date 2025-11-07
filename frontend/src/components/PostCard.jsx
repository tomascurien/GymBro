// frontend/src/components/PostCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';

const PostCard = ({ post, onDelete, onLikeUpdate }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const formatDate = (dateString) => {
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

  const handleLike = async () => {
    try {
      const response = await postsAPI.toggleLike(post.id);
      setIsLiked(response.data.isLiked);
      setLikesCount(response.data.likes_count);
      if (onLikeUpdate) onLikeUpdate(post.id, response.data);
    } catch (error) {
      console.error('Error al dar like:', error);
    }
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
    navigate(`/profile/${post.User?.username}`);
  };

  const isOwner = currentUser.id === post.user_id;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 hover:shadow-lg transition">
      {/* Header del post */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center cursor-pointer" onClick={goToProfile}>
          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-lg">
            {post.User?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <p className="font-semibold text-gray-800 hover:underline">
              {post.User?.name} {post.User?.surname}
            </p>
            <p className="text-sm text-gray-500">@{post.User?.username}</p>
            <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-gray-400 hover:text-red-500 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Contenido del post */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 whitespace-pre-wrap">{post.text}</p>
      </div>

      {/* Imagen del post */}
      {post.image_url && (
        <div className="w-full">
          <img
            src={post.image_url}
            alt="Post"
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

      {/* Acciones del post */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLike}
            className={`flex items-center space-x-2 transition ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <svg
              className="w-6 h-6"
              fill={isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className="font-semibold">{likesCount}</span>
          </button>

          <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold">Comentar</span>
          </button>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-xl font-bold mb-4">¿Eliminar post?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
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
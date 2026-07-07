// frontend/src/pages/LikedPosts.jsx
// Sección "Me gusta": posts likeados por el usuario. Lista privada.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { postsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const LikedPosts = () => {
  const { t } = useI18n();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!localStorage.getItem('token');

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    postsAPI.getLikedPosts()
      .then((res) => setPosts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error cargando me gusta:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el usuario quita el like acá, el post sale de la lista
  const handleLikeUpdate = (postId, likeData) => {
    if (!likeData.isLiked) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...likeData } : p))
      );
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-surface border border-edge rounded-2xl p-10 animate-fade-up">
            <div className="text-6xl mb-4">🤍</div>
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('likes.title')}</h1>
            <p className="text-muted mb-6">{t('routines.loginText')}</p>
            <Link
              to="/login"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-ink">{t('likes.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('likes.subtitle')}</p>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-10 text-center">
            <div className="text-6xl mb-4">🤍</div>
            <h3 className="text-xl font-display font-semibold text-ink mb-2">{t('likes.emptyTitle')}</h3>
            <p className="text-muted">{t('likes.emptyText')}</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handlePostDeleted}
              onLikeUpdate={handleLikeUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LikedPosts;

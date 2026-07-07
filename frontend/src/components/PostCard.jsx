import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const HeartIcon = ({ filled }) => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const PostCard = ({ post, onDelete, onLikeUpdate }) => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  // Manejo seguro del usuario en localStorage
  let currentUser = {};
  try {
    const userStr = localStorage.getItem('user');
    currentUser = userStr ? JSON.parse(userStr) : {};
  } catch (e) {
    console.error('Error parsing user', e);
  }
  const isLoggedIn = !!currentUser.id;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return t('post.justNow');
    if (diffInSeconds < 3600) return t('post.minAgo', { n: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('post.hoursAgo', { n: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 604800) return t('post.daysAgo', { n: Math.floor(diffInSeconds / 86400) });

    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  const handleLikeToggle = async () => {
    if (!isLoggedIn || likeBusy) return;
    setLikeBusy(true);

    // Optimista: actualizamos ya y revertimos si falla
    const wasLiked = !!post.isLiked;
    const optimistic = {
      isLiked: !wasLiked,
      likes_count: Math.max((post.likes_count || 0) + (wasLiked ? -1 : 1), 0),
    };
    if (onLikeUpdate) onLikeUpdate(post.id, optimistic);

    try {
      const res = wasLiked
        ? await postsAPI.unlikePost(post.id)
        : await postsAPI.likePost(post.id);
      if (onLikeUpdate && res?.data) onLikeUpdate(post.id, res.data);
    } catch (error) {
      console.error('Error al dar like:', error);
      if (onLikeUpdate) {
        onLikeUpdate(post.id, { isLiked: wasLiked, likes_count: post.likes_count || 0 });
      }
    } finally {
      setLikeBusy(false);
    }
  };

  const goToProfile = () => {
    if (post.User?.username) {
      navigate(`/profile/${post.User.username}`);
    }
  };

  const isOwner = currentUser.id === post.user_id;
  const isAdmin = currentUser.role === 'admin';

  // Priorizamos 'media_url' (nuevo sistema), 'image' queda por compatibilidad
  const mediaSource = post.media_url || post.image;
  const isVideo = post.media_type === 'video';

  return (
    <div className="bg-surface rounded-2xl overflow-hidden mb-4 border border-edge hover:border-muted/40 transition-colors">

      {/* Header del post */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center cursor-pointer group" onClick={goToProfile}>
          <div className="w-11 h-11 rounded-full bg-raised flex items-center justify-center overflow-hidden border border-edge">
            {post.User?.profile_pic ? (
              <img src={post.User.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted font-bold text-lg">
                {post.User?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="ml-3">
            <p className="font-semibold text-ink group-hover:underline">
              {post.User?.name} {post.User?.surname}
            </p>
            <div className="flex items-center text-sm text-muted">
              <span>@{post.User?.username}</span>
              <span className="mx-1">·</span>
              <span>{formatDate(post.created_at)}</span>
            </div>
          </div>
        </div>

        {(isOwner || isAdmin) && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-muted hover:text-danger transition-colors p-1.5 rounded-full hover:bg-danger/10"
            title={t('post.deleteAria')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Texto */}
      {post.text && (
        <div className="px-4 pb-3">
          <p className="text-ink whitespace-pre-wrap text-base leading-relaxed">{post.text}</p>
        </div>
      )}

      {/* Tema */}
      {post.topic && (
        <div className="px-4 pb-3">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
            {t(`topic.${post.topic}`)}
          </span>
        </div>
      )}

      {/* Media */}
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
              alt=""
              className="w-full h-auto max-h-[500px] object-contain"
            />
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="px-4 py-2.5 flex items-center border-t border-edge/70">
        <button
          onClick={handleLikeToggle}
          disabled={!isLoggedIn}
          title={isLoggedIn ? t('post.likeAria') : t('post.loginToLike')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
            post.isLiked
              ? 'text-accent bg-accent/10'
              : isLoggedIn
                ? 'text-muted hover:text-accent hover:bg-accent/10'
                : 'text-muted/50 cursor-not-allowed'
          }`}
        >
          <HeartIcon filled={!!post.isLiked} />
          <span>{post.likes_count || 0}</span>
        </button>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-edge rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up">
            <h3 className="text-lg font-display font-bold text-ink mb-2">{t('post.deleteTitle')}</h3>
            <p className="text-muted mb-6 text-sm">{t('post.deleteText')}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-edge text-ink rounded-full hover:bg-raised transition-colors font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-danger text-canvas rounded-full hover:bg-danger-hi transition-colors font-medium text-sm"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;

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

const CommentIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.6 7.6 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const PostCard = ({ post, onDelete, onLikeUpdate }) => {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments_count || 0);
  const [repliesByComment, setRepliesByComment] = useState({});
  const [openReplies, setOpenReplies] = useState(() => new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

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

  const toggleComments = async () => {
    const willOpen = !commentsOpen;
    setCommentsOpen(willOpen);
    if (willOpen && !commentsLoaded) {
      setCommentsLoading(true);
      try {
        const res = await postsAPI.getComments(post.id);
        setComments(res.data || []);
        setCommentsLoaded(true);
      } catch (error) {
        console.error('Error al cargar comentarios:', error);
      } finally {
        setCommentsLoading(false);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || commentBusy) return;
    setCommentBusy(true);
    try {
      const res = await postsAPI.addComment(post.id, text);
      setComments((prev) => [...prev, res.data]);
      setCommentCount((c) => c + 1);
      setNewComment('');
    } catch (error) {
      console.error('Error al comentar:', error);
    } finally {
      setCommentBusy(false);
    }
  };

  // Aplica un patch a un comentario, esté en la lista raíz o dentro de las respuestas
  const patchComment = (commentId, patch) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, ...patch } : c)));
    setRepliesByComment((prev) => {
      let changed = false;
      const next = {};
      for (const [k, arr] of Object.entries(prev)) {
        next[k] = arr.map((c) => {
          if (c.id === commentId) { changed = true; return { ...c, ...patch }; }
          return c;
        });
      }
      return changed ? next : prev;
    });
  };

  const handleCommentLike = async (c) => {
    if (!isLoggedIn) return;
    const wasLiked = !!c.isLiked;
    patchComment(c.id, {
      isLiked: !wasLiked,
      likes_count: Math.max((c.likes_count || 0) + (wasLiked ? -1 : 1), 0),
    });
    try {
      const res = wasLiked
        ? await postsAPI.unlikeComment(post.id, c.id)
        : await postsAPI.likeComment(post.id, c.id);
      if (res?.data) patchComment(c.id, { isLiked: res.data.isLiked, likes_count: res.data.likes_count });
    } catch (error) {
      console.error('Error al dar like al comentario:', error);
      patchComment(c.id, { isLiked: wasLiked, likes_count: c.likes_count || 0 });
    }
  };

  const toggleReplies = async (commentId) => {
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    if (!repliesByComment[commentId]) {
      try {
        const res = await postsAPI.getReplies(post.id, commentId);
        setRepliesByComment((prev) => ({ ...prev, [commentId]: res.data || [] }));
      } catch (error) {
        console.error('Error al cargar respuestas:', error);
      }
    }
  };

  const handleAddReply = async (e, parentId) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || replyBusy) return;
    setReplyBusy(true);
    try {
      const res = await postsAPI.addComment(post.id, text, parentId);
      setRepliesByComment((prev) => ({ ...prev, [parentId]: [...(prev[parentId] || []), res.data] }));
      const current = comments.find((c) => c.id === parentId)?.replies_count || 0;
      patchComment(parentId, { replies_count: current + 1 });
      setOpenReplies((prev) => new Set(prev).add(parentId));
      setCommentCount((n) => n + 1);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error al responder:', error);
    } finally {
      setReplyBusy(false);
    }
  };

  const handleDeleteComment = async (c, parentId = null) => {
    try {
      await postsAPI.deleteComment(post.id, c.id);
      if (parentId) {
        setRepliesByComment((prev) => ({
          ...prev,
          [parentId]: (prev[parentId] || []).filter((r) => r.id !== c.id),
        }));
        const current = comments.find((x) => x.id === parentId)?.replies_count || 1;
        patchComment(parentId, { replies_count: Math.max(current - 1, 0) });
        setCommentCount((n) => Math.max(n - 1, 0));
      } else {
        const removed = 1 + (c.replies_count || 0);
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        setCommentCount((n) => Math.max(n - removed, 0));
      }
    } catch (error) {
      console.error('Error al eliminar comentario:', error);
    }
  };

  // Render de un comentario (parentId = null para nivel superior, o el id del raíz si es respuesta)
  const renderComment = (c, parentId = null) => {
    const isReply = parentId !== null;
    const canDeleteComment = currentUser.id === c.user_id || isAdmin;
    return (
      <div key={c.id} className="flex items-start gap-2.5">
        <div
          className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} rounded-full bg-raised flex items-center justify-center overflow-hidden border border-edge flex-shrink-0 cursor-pointer`}
          onClick={() => c.User?.username && navigate(`/profile/${c.User.username}`)}
        >
          {c.User?.profile_pic ? (
            <img src={c.User.profile_pic} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-muted font-bold text-xs">{c.User?.username?.charAt(0).toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-raised rounded-2xl px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
              <span
                className="font-semibold text-ink cursor-pointer hover:underline"
                onClick={() => c.User?.username && navigate(`/profile/${c.User.username}`)}
              >
                {c.User?.name || c.User?.username}
              </span>
              <span>·</span>
              <span>{formatDate(c.created_at)}</span>
            </div>
            <p className="text-sm text-ink whitespace-pre-wrap break-words">{c.text}</p>
          </div>

          {/* Acciones del comentario */}
          <div className="flex items-center gap-4 mt-1 pl-1 text-xs">
            <button
              onClick={() => handleCommentLike(c)}
              disabled={!isLoggedIn}
              className={`flex items-center gap-1 font-medium transition-colors ${
                c.isLiked ? 'text-accent' : 'text-muted hover:text-accent'
              } ${!isLoggedIn ? 'cursor-not-allowed' : ''}`}
            >
              <HeartIcon filled={!!c.isLiked} />
              {c.likes_count > 0 && <span>{c.likes_count}</span>}
            </button>

            {isLoggedIn && (
              <button
                onClick={() => {
                  setReplyingTo(parentId ?? c.id);
                  setReplyText(isReply ? `@${c.User?.username || ''} ` : '');
                }}
                className="text-muted hover:text-ink font-medium"
              >
                {t('post.reply')}
              </button>
            )}

            {canDeleteComment && (
              <button
                onClick={() => handleDeleteComment(c, parentId)}
                className="text-muted hover:text-danger font-medium"
              >
                {t('common.delete')}
              </button>
            )}
          </div>

          {/* Toggle de respuestas (solo nivel superior) */}
          {!isReply && c.replies_count > 0 && (
            <button
              onClick={() => toggleReplies(c.id)}
              className="mt-1 pl-1 text-xs font-semibold text-accent hover:underline"
            >
              {openReplies.has(c.id) ? t('post.hideReplies') : t('post.viewReplies', { n: c.replies_count })}
            </button>
          )}

          {/* Form de respuesta (se ancla al comentario raíz) */}
          {!isReply && replyingTo === c.id && isLoggedIn && (
            <form onSubmit={(e) => handleAddReply(e, c.id)} className="flex items-center gap-2 mt-2">
              <input
                autoFocus
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('post.replyPlaceholder')}
                className="flex-1 bg-raised border border-edge rounded-full px-3 py-1.5 text-sm text-ink placeholder-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || replyBusy}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-opacity ${
                  !replyText.trim() || replyBusy
                    ? 'bg-accent/40 text-canvas cursor-not-allowed'
                    : 'bg-accent text-canvas hover:opacity-90'
                }`}
              >
                {t('post.commentSend')}
              </button>
            </form>
          )}

          {/* Lista de respuestas */}
          {!isReply && openReplies.has(c.id) && (
            <div className="mt-2 pl-3 border-l-2 border-edge/50 space-y-3">
              {(repliesByComment[c.id] || []).map((r) => renderComment(r, c.id))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const goToProfile = () => {
    if (post.User?.username) {
      navigate(`/profile/${post.User.username}`);
    }
  };

  const isOwner = currentUser.id === post.user_id;
  const isAdmin = currentUser.role === 'admin';

  // Hashtags del texto como links: clic -> feed filtrado por ese tag
  const renderText = (text) =>
    text.split(/(#[\p{L}\p{N}_]+)/gu).map((part, i) =>
      part.startsWith('#') ? (
        <span
          key={i}
          className="text-accent hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/feed?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`);
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );

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
          <p className="text-ink whitespace-pre-wrap text-base leading-relaxed">{renderText(post.text)}</p>
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

        <button
          onClick={toggleComments}
          title={t('post.commentAria')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-full text-sm font-medium transition-colors ${
            commentsOpen
              ? 'text-accent bg-accent/10'
              : 'text-muted hover:text-accent hover:bg-accent/10'
          }`}
        >
          <CommentIcon />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comentarios */}
      {commentsOpen && (
        <div className="px-4 pb-4 border-t border-edge/70">
          {isLoggedIn ? (
            <form onSubmit={handleAddComment} className="flex items-center gap-2 py-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t('post.commentPlaceholder')}
                className="flex-1 bg-raised border border-edge rounded-full px-4 py-2 text-sm text-ink placeholder-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || commentBusy}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-opacity ${
                  !newComment.trim() || commentBusy
                    ? 'bg-accent/40 text-canvas cursor-not-allowed'
                    : 'bg-accent text-canvas hover:opacity-90'
                }`}
              >
                {t('post.commentSend')}
              </button>
            </form>
          ) : (
            <p className="py-3 text-sm text-muted">{t('post.loginToComment')}</p>
          )}

          {commentsLoading ? (
            <p className="text-sm text-muted py-2">{t('post.commentsLoading')}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted py-2">{t('post.commentsEmpty')}</p>
          ) : (
            <div className="space-y-4 pt-1">
              {comments.map((c) => renderComment(c, null))}
            </div>
          )}
        </div>
      )}

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

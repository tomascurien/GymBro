// frontend/src/pages/Feed.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { postsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const Feed = () => {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTag = searchParams.get('tag');
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('forYou');

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeTag]);

  useEffect(() => {
    postsAPI.getTrending()
      .then((res) => setTrending(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Escuchar cambios de autenticación
    const handleStorageChange = () => {
      const loggedIn = !!localStorage.getItem('token');
      setIsLoggedIn(loggedIn);

      if (!loggedIn && activeTab === 'following') {
        setActiveTab('forYou');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleStorageChange);
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
      if (activeTag) {
        // Filtro por hashtag: cronológico con ese tag
        response = await postsAPI.getFeed(activeTag);
      } else if (activeTab === 'following') {
        response = await postsAPI.getFollowingFeed();
      } else if (activeTab === 'recent') {
        response = await postsAPI.getFeed();
      } else {
        response = await postsAPI.getForYouFeed();
      }

      // Extraer posts de diferentes estructuras posibles
      let feedPosts = [];
      if (Array.isArray(response.data)) {
        feedPosts = response.data;
      } else if (response.data.posts) {
        feedPosts = response.data.posts;
      } else if (response.data.data) {
        feedPosts = response.data.data;
      }

      setPosts(feedPosts);
    } catch (err) {
      console.error('Error cargando feed:', err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      } else {
        setError(t('feed.loadError'));
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

  const tabs = [
    { key: 'forYou', label: t('feed.forYou') },
    { key: 'recent', label: t('feed.recent') },
    ...(isLoggedIn ? [{ key: 'following', label: t('feed.following') }] : []),
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Hero para visitantes: la campaña */}
        {!isLoggedIn && (
          <div className="bg-surface border border-edge rounded-2xl p-6 mb-6 animate-fade-up">
            <p className="text-sm text-muted mb-2">{t('brand.pitch')}</p>
            <h2 className="text-2xl font-display font-bold text-ink mb-2">
              {t('feed.welcomeTitle')}
            </h2>
            <p className="text-muted text-sm mb-4">{t('feed.welcomeText')}</p>
            <Link
              to="/register"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-5 py-2.5 rounded-full text-sm transition-colors"
            >
              {t('nav.register')}
            </Link>
          </div>
        )}

        {/* Composer */}
        {isLoggedIn && (
          <div className="bg-surface border border-edge rounded-2xl p-4 mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-4 py-3 bg-raised text-muted rounded-full text-left hover:bg-edge/60 transition-colors"
            >
              {t('feed.composePrompt')}
            </button>
          </div>
        )}

        {/* Tendencias */}
        {trending.length > 0 && !activeTag && (
          <div className="mb-6 bg-surface border border-edge rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2.5">
              {t('feed.trending')}
            </p>
            <div className="flex flex-wrap gap-2">
              {trending.map(({ tag }) => (
                <button
                  key={tag}
                  onClick={() => setSearchParams({ tag })}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-raised text-accent border border-edge hover:border-accent/50 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filtro activo por hashtag */}
        {activeTag && (
          <div className="mb-6 bg-surface border border-edge rounded-2xl p-4 flex items-center justify-between">
            <p className="font-display font-semibold text-ink">
              {t('feed.showingTag', { tag: activeTag })}
            </p>
            <button
              onClick={() => setSearchParams({})}
              className="text-sm text-muted hover:text-ink px-3 py-1.5 rounded-full hover:bg-raised transition-colors"
            >
              {t('feed.clearFilter')} ✕
            </button>
          </div>
        )}

        {/* Tabs (ocultas mientras hay filtro por tag) */}
        {!activeTag && (
          <div className="mb-6 bg-surface border border-edge rounded-2xl overflow-hidden">
            <nav className="flex" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    ${activeTab === tab.key
                      ? 'border-accent text-ink font-semibold'
                      : 'border-transparent text-muted hover:text-ink'}
                    flex-1 whitespace-nowrap py-3.5 px-1 border-b-2 text-sm transition-colors
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-xl mb-4">
            {error}
            <button onClick={loadFeed} className="ml-4 underline hover:no-underline">
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Lista de posts */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-surface border border-edge rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h3 className="text-xl font-display font-semibold text-ink mb-2">
              {t('feed.emptyTitle')}
            </h3>
            <p className="text-muted mb-4">
              {activeTag
                ? t('feed.emptyTag', { tag: activeTag })
                : isLoggedIn ? t('feed.emptyLoggedIn') : t('feed.emptyLoggedOut')}
            </p>
            {isLoggedIn && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-accent text-on-accent font-semibold rounded-full hover:bg-accent-hi transition-colors"
              >
                {t('feed.createPost')}
              </button>
            )}
          </div>
        ) : (
          <div>
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

      {/* Modal para crear post */}
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

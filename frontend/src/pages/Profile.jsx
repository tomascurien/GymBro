import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ProfileHeader from '../components/ProfileHeader';
import ProfilePosts from '../components/ProfilePosts';
import ProfileRoutines from '../components/ProfileRoutines';
import { usersAPI, postsAPI, routinesAPI } from '../services/api';
import EditProfileModal from '../components/EditProfileModal';
import CreateRoutineModal from '../components/CreateRoutineModal';
import { useI18n } from '../i18n/I18nContext';

const Profile = () => {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [favoriteRoutines, setFavoriteRoutines] = useState([]);
  const [myFavoriteIds, setMyFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [isWelcome, setIsWelcome] = useState(false);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const currentUsername = currentUser.username;
  const isOwnProfile = currentUsername === username;

  useEffect(() => {
    loadProfileData();
    loadMyFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // Onboarding: /profile/:username?welcome=1 abre el modal de edición
  useEffect(() => {
    if (searchParams.get('welcome') === '1' && isOwnProfile) {
      setIsWelcome(true);
      setShowEditModal(true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isOwnProfile]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar perfil
      let profileData = null;
      try {
        const profileRes = await usersAPI.getProfile(username);
        profileData = profileRes.data.user || profileRes.data;
      } catch (profileErr) {
        console.error('Error cargando perfil:', profileErr);
        throw new Error(t('profile.loadErrorTitle'));
      }

      // Carga en paralelo de posts, rutinas y favoritos
      const [postsPromise, routinesPromise, favoritesPromise] = [
        postsAPI.getUserPosts(username),
        routinesAPI.getUserRoutines(username),
        routinesAPI.getFavorites(username)
      ];

      let postsData = [];
      try {
        const postsRes = await postsPromise;
        postsData = postsRes.data.posts || postsRes.data || [];
      } catch (postsErr) {
        console.warn('No se pudieron cargar los posts');
      }

      let routinesData = [];
      try {
        const routinesRes = await routinesPromise;
        routinesData = routinesRes.data || [];
      } catch (routinesErr) {
        console.warn('No se pudieron cargar las rutinas');
      }

      let favoritesData = [];
      try {
        const favRes = await favoritesPromise;
        favoritesData = favRes.data || [];
      } catch (favErr) {
        console.warn('No se pudieron cargar los favoritos');
      }

      setProfile(profileData);
      setPosts(postsData);
      setRoutines(routinesData);
      setFavoriteRoutines(favoritesData);

    } catch (err) {
      console.error('Error fatal:', err);
      setError(err.message || t('profile.loadErrorTitle'));
    } finally {
      setLoading(false);
    }
  };

  const loadMyFavorites = async () => {
    if (!currentUsername) return;
    try {
      const res = await routinesAPI.getFavorites(currentUsername);
      const idSet = new Set(res.data.map(r => r.id));
      setMyFavoriteIds(idSet);
    } catch (err) {
      console.warn('No se pudieron cargar mis favoritos');
    }
  };

  const handleFavoriteToggle = async (routineId) => {
    const isCurrentlyFavorited = myFavoriteIds.has(routineId);
    const newFavoriteSet = new Set(myFavoriteIds);

    if (isCurrentlyFavorited) {
      newFavoriteSet.delete(routineId);
    } else {
      newFavoriteSet.add(routineId);
    }
    setMyFavoriteIds(newFavoriteSet);

    try {
      if (isCurrentlyFavorited) {
        await routinesAPI.removeFavorite(routineId);
      } else {
        await routinesAPI.addFavorite(routineId);
      }
      loadMyFavorites();
    } catch (err) {
      console.error('Error al (des)guardar favorito:', err);
      setMyFavoriteIds(myFavoriteIds); // Revertir si hay error
    }
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

  const handleRoutineDelete = async (routineId) => {
    try {
      await routinesAPI.deleteRoutine(routineId);
      setRoutines(routines.filter((r) => r.id !== routineId));
    } catch (err) {
      console.error('Error al eliminar la rutina:', err);
      setError(t('profile.deleteRoutineError'));
    }
  };

  const handleProfileUpdate = (updatedUser) => {
    // El update devuelve el user "pelado"; conservamos stats/isFollowing del perfil cargado
    setProfile((prev) => ({ ...prev, ...updatedUser }));
    localStorage.setItem('user', JSON.stringify(updatedUser));
    // Notificar al Navbar para que refresque el avatar sin recargar
    window.dispatchEvent(new Event('userLoggedIn'));
    setShowEditModal(false);
    setIsWelcome(false);
  };

  const handleRoutineCreated = async () => {
    try {
      const routinesRes = await routinesAPI.getUserRoutines(username);
      setRoutines(routinesRes.data || []);
    } catch (error) {
      console.error('Error actualizando rutinas:', error);
    }
    setShowRoutineModal(false);
  };

  const tabClass = (tab) =>
    `whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
      activeTab === tab
        ? 'border-accent text-ink font-semibold'
        : 'border-transparent text-muted hover:text-ink'
    }`;

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-display font-bold text-ink mb-2">
            {t('profile.loadErrorTitle')}
          </h2>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwnProfile && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-raised text-ink border border-edge rounded-full hover:bg-edge/60 transition-colors text-sm font-medium"
            >
              {t('profile.edit')}
            </button>
          </div>
        )}

        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          onFollowUpdate={(updatedProfile) => setProfile(updatedProfile)}
        />

        {/* Tabs */}
        <div className="mb-6 border-b border-edge">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('posts')} className={tabClass('posts')}>
              {t('profile.posts')} ({posts.length})
            </button>
            <button onClick={() => setActiveTab('rutinas')} className={tabClass('rutinas')}>
              {t('profile.routines')} ({routines.length})
            </button>
            <button onClick={() => setActiveTab('favorites')} className={tabClass('favorites')}>
              {t('profile.favorites')} ({favoriteRoutines.length})
            </button>
          </nav>
        </div>

        {/* Contenido condicional */}
        {activeTab === 'posts' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-ink">{t('profile.posts')}</h2>
            </div>
            <ProfilePosts
              posts={posts}
              loading={false}
              onPostDeleted={handlePostDeleted}
              onLikeUpdate={handleLikeUpdate}
            />
          </div>
        )}

        {activeTab === 'rutinas' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-ink">{t('profile.routines')}</h2>
              {isOwnProfile && (
                <button
                  onClick={() => setShowRoutineModal(true)}
                  className="px-4 py-2 bg-accent text-on-accent rounded-full hover:bg-accent-hi transition-colors text-sm font-semibold"
                >
                  {t('profile.addRoutine')}
                </button>
              )}
            </div>
            <ProfileRoutines
              routines={routines}
              onAddRoutine={() => setShowRoutineModal(true)}
              onRoutineDelete={handleRoutineDelete}
              isOwnProfile={isOwnProfile}
              myFavoriteIds={myFavoriteIds}
              onFavoriteToggle={handleFavoriteToggle}
              isLoggedIn={!!currentUsername}
            />
          </div>
        )}

        {activeTab === 'favorites' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-display font-bold text-ink">{t('profile.favoriteRoutines')}</h2>
            </div>
            <ProfileRoutines
              routines={favoriteRoutines}
              onRoutineDelete={handleRoutineDelete}
              isOwnProfile={isOwnProfile}
              myFavoriteIds={myFavoriteIds}
              onFavoriteToggle={handleFavoriteToggle}
              isLoggedIn={!!currentUsername}
            />
          </div>
        )}
      </div>

      {/* Modales */}
      {showEditModal && (
        <EditProfileModal
          currentUser={profile}
          isWelcome={isWelcome}
          onClose={() => { setShowEditModal(false); setIsWelcome(false); }}
          onProfileUpdated={handleProfileUpdate}
        />
      )}

      {showRoutineModal && (
        <CreateRoutineModal
          onClose={() => setShowRoutineModal(false)}
          onRoutineCreated={handleRoutineCreated}
        />
      )}
    </div>
  );
};

export default Profile;

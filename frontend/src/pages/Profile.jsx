import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProfileHeader from '../components/ProfileHeader';
import ProfilePosts from '../components/ProfilePosts';
import ProfileRoutines from '../components/ProfileRoutines';
import { usersAPI, postsAPI, routinesAPI } from '../services/api';
import EditProfileModal from '../components/EditProfileModal';
import CreateRoutineModal from '../components/CreateRoutineModal'; 

const Profile = () => {
  const { username } = useParams();
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

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
   const currentUsername = currentUser.username;
   const isOwnProfile = currentUsername === username;

  useEffect(() => {
    loadProfileData();
    loadMyFavorites();
  }, [username]);

  const loadProfileData = async () => {
    try {
      
      setLoading(true);
      setError('');

       console.log('=== CARGANDO PERFIL ===');

      // Cargar perfil
      let profileData = null;
       try {
        const profileRes = await usersAPI.getProfile(username);
        profileData = profileRes.data.user || profileRes.data;
        console.log(' Perfil cargado:', profileData);
        } catch (profileErr) {
        console.error(' Error cargando perfil:', profileErr);
        throw new Error('No se pudo cargar el perfil del usuario');
        }

      // --- CARGA EN PARALELO ---
      // Intentar cargar posts y rutinas al mismo tiempo
      const [postsPromise, routinesPromise, favoritesPromise] = [
        postsAPI.getUserPosts(username),
        routinesAPI.getUserRoutines(username), 
        routinesAPI.getFavorites(username)
      ];

      // Manejar posts
      let postsData = [];
      try {
       const postsRes = await postsPromise;
       postsData = postsRes.data.posts || postsRes.data || [];
       console.log(' Posts cargados:', postsData.length);
      } catch (postsErr) {
       console.warn(' No se pudieron cargar los posts');
      }

      // Manejar rutinas
      let routinesData = [];
      try {
        const routinesRes = await routinesPromise;
        routinesData = routinesRes.data || []; // La API devuelve el array directamente
        console.log(' Rutinas cargadas:', routinesData.length);
      } catch (routinesErr) {
        console.warn(' No se pudieron cargar las rutinas');
      }

      // Manejar favoritos
      let favoritesData = [];
      try {
        const favRes = await favoritesPromise;
        favoritesData = favRes.data || [];
        console.log(' Favoritos cargados:', favoritesData.length);
      } catch (favErr) { console.warn(' No se pudieron cargar los favoritos'); }

      // --- FIN DE CARGA EN PARALELO ---

       setProfile(profileData);
       setPosts(postsData);
       setRoutines(routinesData); 
       setFavoriteRoutines(favoritesData);

     } catch (err) {
       console.error(' Error fatal:', err);
        setError(err.message || 'Error al cargar el perfil');
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
      console.error("Error al (des)guardar favorito:", err);
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
      console.error("Error al eliminar la rutina:", err);
      setError("No se pudo eliminar la rutina.");
    }
  };


  const handleProfileUpdate = (updatedUser) => {
    setProfile(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setShowEditModal(false);
  };

  const handleRoutineCreated = async () => {
    try {
      const routinesRes = await routinesAPI.getUserRoutines(username);
      setRoutines(routinesRes.data || []);
    } catch (error) {
      console.error("Error actualizando rutinas:", error);
    }
    setShowRoutineModal(false);
  };

  if (loading) {
    return (
     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="text-center">
         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando perfil...</p>
       </div>
    </div>
   );
  }
  
  if (error || !profile) {
    return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            No se pudo cargar el perfil
           </h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwnProfile && (
        <div className="flex justify-end mb-4">
           <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition" button>
              Editar Perfil
            </button>
        </div>
        )}

        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          onFollowUpdate={(updatedProfile) => setProfile(updatedProfile)}
        />

        {/* --- PESTAÑAS (TABS) --- */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('posts')}
              className={`
                ${activeTab === 'posts' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              `}
            >
              Posts ({posts.length})
            </button>
            <button
              onClick={() => setActiveTab('rutinas')}
              className={`
                ${activeTab === 'rutinas' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              `}
            >
              Rutinas ({routines.length})
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'favorites' 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Favoritos ({favoriteRoutines.length})
          </button>
          </nav>
        </div>


        {/* --- CONTENIDO CONDICIONAL --- */}
        {activeTab === 'posts' && (
          <div>
            { <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Posts</h2>
            </div> }
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
              <h2 className="text-2xl font-bold text-gray-800">Rutinas</h2>
              {isOwnProfile && (
                <button 
                  onClick={() => setShowRoutineModal(true)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
                >
                  + Añadir Rutina
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
              <h2 className="text-2xl font-bold text-gray-800">Rutinas Favoritas</h2>
            </div>
            <ProfileRoutines 
              routines={favoriteRoutines} 
              // No pasamos 'onAddRoutine'
              onRoutineDelete={handleRoutineDelete} 
              isOwnProfile={isOwnProfile}
              myFavoriteIds={myFavoriteIds}
              onFavoriteToggle={handleFavoriteToggle}
              isLoggedIn={!!currentUsername}
            />
          </div>
        )}
        {/* --- FIN DE CONTENIDO CONDICIONAL --- */}

      </div>

      {/* --- MODALES --- */}
      {showEditModal && (
        <EditProfileModal
          currentUser={profile}
          onClose={() => setShowEditModal(false)}
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
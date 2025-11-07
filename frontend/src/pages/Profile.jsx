// frontend/src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ProfileHeader from '../components/ProfileHeader';
import ProfilePosts from '../components/ProfilePosts';
import { usersAPI, postsAPI } from '../services/api';
import EditProfileModal from '../components/EditProfileModal';

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const currentUsername = currentUser.username;
  const isOwnProfile = currentUsername === username;

  useEffect(() => {
    loadProfileData();
  }, [username]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('=== CARGANDO PERFIL ===');
      console.log('Username:', username);
      
      // Cargar perfil y posts por separado para manejar errores individualmente
      let profileData = null;
      let postsData = [];
      
      // Intentar cargar perfil
      try {
        const profileRes = await usersAPI.getProfile(username);
        profileData = profileRes.data.user || profileRes.data;
        console.log('✅ Perfil cargado:', profileData);
      } catch (profileErr) {
        console.error('❌ Error cargando perfil:', profileErr);
        throw new Error('No se pudo cargar el perfil del usuario');
      }
      
      // Intentar cargar posts (si falla, continuar sin posts)
      try {
        const postsRes = await postsAPI.getUserPosts(username);
        postsData = postsRes.data.posts || postsRes.data || [];
        console.log('✅ Posts cargados:', postsData.length);
      } catch (postsErr) {
        console.warn('⚠️ No se pudieron cargar los posts:', postsErr.response?.status, postsErr.message);
        console.warn('⚠️ El perfil se mostrará sin posts');
        postsData = [];
      }
      
      setProfile(profileData);
      setPosts(postsData);
      
    } catch (err) {
      console.error('❌ Error fatal:', err);
      setError(err.message || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
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

  const handleProfileUpdate = (updatedUser) => {

    setProfile(updatedUser);
    
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    setShowEditModal(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwnProfile && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Editar Perfil
            </button>
          </div>
        )}

        <ProfileHeader
          profile={profile}
          isOwnProfile={isOwnProfile}
          onFollowUpdate={loadProfileData}
        />

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Posts</h2>
        </div>

        <ProfilePosts
          posts={posts}
          loading={false}
          onPostDeleted={handlePostDeleted}
          onLikeUpdate={handleLikeUpdate}
        />
      </div>
      {showEditModal && (
        <EditProfileModal
          currentUser={profile}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;
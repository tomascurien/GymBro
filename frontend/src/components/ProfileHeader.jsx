import React, { useState } from 'react';
import { usersAPI } from '../services/api';

const ProfileHeader = ({ profile, isOwnProfile, onFollowUpdate }) => {
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing);
  const [followersCount, setFollowersCount] = useState(profile.followers_count);
  const [loading, setLoading] = useState(false);

  const handleFollowToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await usersAPI.unfollowUser(profile.id);
        setIsFollowing(false);
        setFollowersCount(followersCount - 1);
      } else {
        await usersAPI.followUser(profile.id);
        setIsFollowing(true);
        setFollowersCount(followersCount + 1);
      }
      if (onFollowUpdate) onFollowUpdate();
    } catch (error) {
      console.error('Error al seguir/dejar de seguir:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-5xl font-bold shadow-lg">
          {profile.username?.charAt(0).toUpperCase() || 'U'}
        </div>

        {/* Info del perfil */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-3">
            <h1 className="text-3xl font-bold text-gray-800">
              {profile.username}
            </h1>
            
            {!isOwnProfile && (
              <button
                onClick={handleFollowToggle}
                disabled={loading}
                className={`mt-2 md:mt-0 px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {loading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>

          <p className="text-xl text-gray-600 mb-3">{profile.full_name}</p>

          {/* Stats */}
          <div className="flex justify-center md:justify-start space-x-8 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {profile.posts_count || 0}
              </p>
              <p className="text-gray-600">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {followersCount || 0}
              </p>
              <p className="text-gray-600">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">
                {profile.following_count || 0}
              </p>
              <p className="text-gray-600">Siguiendo</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-700 max-w-2xl">{profile.bio}</p>
          )}

          {/* Fecha de registro */}
          <p className="text-sm text-gray-500 mt-3">
            Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', {
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
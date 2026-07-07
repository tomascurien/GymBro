import React, { useState } from 'react';
import { usersAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';

const ProfileHeader = ({ profile, isOwnProfile, onFollowUpdate }) => {
  const { t } = useI18n();
  // El único estado que maneja es el 'loading' del botón
  const [loading, setLoading] = useState(false);

  const handleFollowToggle = async () => {
    setLoading(true);
    try {
      let response;
      if (profile.isFollowing) {
        response = await usersAPI.unfollowUser(profile.id);
      } else {
        response = await usersAPI.followUser(profile.id);
      }

      if (response?.data?.isFollowing !== undefined) {
        onFollowUpdate({
          ...profile,
          isFollowing: response.data.isFollowing,
          followers_count: profile.followers_count + (response.data.isFollowing ? 1 : -1),
        });
      }
    } catch (error) {
      console.error('Error al seguir/dejar de seguir:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-edge rounded-2xl mb-6 overflow-hidden">
      {/* Portada */}
      {profile.cover_pic && (
        <div className="h-36 md:h-48 w-full">
          <img src={profile.cover_pic} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        {/* Avatar (superpuesto a la portada si existe) */}
        <div className={`w-32 h-32 rounded-full bg-accent flex items-center justify-center text-on-accent text-5xl font-display font-bold overflow-hidden shrink-0 ${profile.cover_pic ? '-mt-20 border-4 border-surface' : ''}`}>
          {profile.profile_pic ? (
            <img src={profile.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            profile.username?.charAt(0).toUpperCase() || 'U'
          )}
        </div>

        {/* Info del perfil */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-3">
            <h1 className="text-3xl font-display font-bold text-ink">
              {profile.name} {profile.surname}
            </h1>

            {!isOwnProfile && (
              <button
                onClick={handleFollowToggle}
                disabled={loading}
                className={`mt-2 md:mt-0 px-6 py-2 rounded-full font-semibold transition-colors disabled:opacity-50 ${
                  profile.isFollowing
                    ? 'bg-raised text-ink border border-edge hover:bg-edge/60'
                    : 'bg-accent text-on-accent hover:bg-accent-hi'
                }`}
              >
                {loading ? '...' : profile.isFollowing ? t('profile.unfollow') : t('profile.follow')}
              </button>
            )}
          </div>

          <p className="text-xl text-muted mb-3">@{profile.username}</p>

          {/* Stats */}
          <div className="flex justify-center md:justify-start space-x-8 mb-4">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-ink">
                {profile.posts_count || 0}
              </p>
              <p className="text-muted text-sm">{t('profile.posts')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-ink">
                {profile.followers_count || 0}
              </p>
              <p className="text-muted text-sm">{t('profile.followers')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-ink">
                {profile.following_count || 0}
              </p>
              <p className="text-muted text-sm">{t('profile.followingStat')}</p>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-ink max-w-2xl">{profile.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;

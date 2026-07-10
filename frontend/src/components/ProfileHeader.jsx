import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import Badge, { tierColor } from './Badge';

// Modal con todas las insignias: las ganadas con su nivel, y (solo en el
// perfil propio) las bloqueadas con el progreso hacia el próximo nivel.
const BadgesModal = ({ badges, isOwnProfile, onClose }) => {
  const { t } = useI18n();
  const visible = isOwnProfile ? badges : badges.filter((b) => b.tier > 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <div className="relative bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-fade-up">
        <div className="flex items-center justify-between p-4 border-b border-edge sticky top-0 bg-surface">
          <h2 className="font-display font-bold text-ink text-lg">{t('badges.title')}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-raised transition-colors text-muted hover:text-ink">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          {visible.map((b) => {
            const locked = b.tier === 0;
            const pct = b.nextThreshold
              ? Math.min(100, Math.round((b.value / b.nextThreshold) * 100))
              : 100;
            return (
              <div key={b.slug} className="flex items-center gap-4 bg-raised border border-edge rounded-2xl p-4">
                <Badge slug={b.slug} tier={Math.max(b.tier, 1)} totalTiers={b.tiers.length} locked={locked} size={56} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="font-display font-semibold text-ink">{t(`badge.${b.slug}`)}</p>
                    <p className="text-xs text-muted">
                      {locked ? t('badges.locked') : t('badges.tierOf', { tier: b.tier, total: b.tiers.length })}
                    </p>
                  </div>
                  <p className="text-sm text-muted">{t(`badge.${b.slug}.desc`)}</p>
                  {/* Progreso hacia el próximo nivel (solo perfil propio) */}
                  {isOwnProfile && b.nextThreshold && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-edge rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: tierColor(b.tier + 1, b.tiers.length),
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {t(`badge.${b.slug}.value`, { n: b.value })} · {b.value}/{b.nextThreshold}
                      </p>
                    </div>
                  )}
                  {(!isOwnProfile || !b.nextThreshold) && !locked && (
                    <p className="text-xs text-muted mt-1">{t(`badge.${b.slug}.value`, { n: b.value })}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProfileHeader = ({ profile, isOwnProfile, onFollowUpdate }) => {
  const { t } = useI18n();
  // El único estado que maneja es el 'loading' del botón
  const [loading, setLoading] = useState(false);
  const [badges, setBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    if (!profile.username) return;
    usersAPI.getBadges(profile.username)
      .then((res) => setBadges(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [profile.username]);

  const earned = badges.filter((b) => b.tier > 0);

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

          {/* Insignias: fila bajo la bio; el dueño ve el botón aunque no tenga ninguna */}
          {(earned.length > 0 || isOwnProfile) && badges.length > 0 && (
            <div className="flex items-center gap-2 mt-4 justify-center md:justify-start">
              {earned.map((b) => (
                <button
                  key={b.slug}
                  onClick={() => setShowBadges(true)}
                  title={`${t(`badge.${b.slug}`)} · ${t(`badge.${b.slug}.value`, { n: b.value })}`}
                  className="hover:scale-110 transition-transform"
                >
                  <Badge slug={b.slug} tier={b.tier} totalTiers={b.tiers.length} size={44} />
                </button>
              ))}
              <button
                onClick={() => setShowBadges(true)}
                className="text-xs text-muted hover:text-ink px-2 py-1 rounded-full hover:bg-raised transition-colors"
              >
                {t('badges.viewAll')}
              </button>
            </div>
          )}
        </div>
      </div>

      {showBadges && (
        <BadgesModal badges={badges} isOwnProfile={isOwnProfile} onClose={() => setShowBadges(false)} />
      )}
    </div>
  );
};

export default ProfileHeader;

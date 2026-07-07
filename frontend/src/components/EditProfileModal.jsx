import React, { useState, useRef, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { TOPICS } from '../constants/topics';

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const EditProfileModal = ({ currentUser, onClose, onProfileUpdated, isWelcome = false }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    surname: currentUser.surname || '',
    bio: currentUser.bio || '',
  });
  const [interests, setInterests] = useState(
    Array.isArray(currentUser.interests) ? currentUser.interests : []
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(currentUser.profile_pic || null);
  const [coverPreview, setCoverPreview] = useState(currentUser.cover_pic || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Liberar los object URLs creados para las previews
  useEffect(() => {
    return () => {
      [avatarPreview, coverPreview].forEach((url) => {
        if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreview, coverPreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFile = (e, kind) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('editProfile.onlyImages'));
      return;
    }
    setError('');
    const url = URL.createObjectURL(file);
    if (kind === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(url);
    } else {
      setCoverFile(file);
      setCoverPreview(url);
    }
  };

  const toggleInterest = (topic) => {
    setInterests((prev) =>
      prev.includes(topic) ? prev.filter((i) => i !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('surname', formData.surname);
      data.append('bio', formData.bio);
      data.append('interests', JSON.stringify(interests));
      if (avatarFile) data.append('avatar', avatarFile);
      if (coverFile) data.append('cover', coverFile);

      const response = await usersAPI.updateProfile(data);
      onProfileUpdated(response.data.user);
    } catch (err) {
      console.error('Error actualizando el perfil:', err);
      setError(err.response?.data?.message || t('editProfile.error'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-edge rounded-xl p-2.5 bg-raised text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
      <div className="bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-display font-bold mb-4 text-ink">
          {isWelcome ? t('editProfile.welcomeTitle') : t('editProfile.title')}
        </h2>

        {error && <p className="text-danger mb-3 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Portada + avatar superpuesto */}
          <div className="relative mb-10">
            <input type="file" accept="image/*" ref={coverInputRef} className="hidden" onChange={(e) => handleFile(e, 'cover')} />
            <input type="file" accept="image/*" ref={avatarInputRef} className="hidden" onChange={(e) => handleFile(e, 'avatar')} />

            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              title={t('editProfile.cover')}
              className="relative w-full h-28 rounded-xl overflow-hidden bg-raised border border-edge group"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-muted text-sm">
                  {t('editProfile.cover')}
                </span>
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-medium">
                <CameraIcon /> {t('editProfile.changePhoto')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title={t('editProfile.avatar')}
              className="absolute -bottom-8 left-4 w-20 h-20 rounded-full overflow-hidden bg-accent border-4 border-surface group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-on-accent text-2xl font-bold">
                  {currentUser.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <CameraIcon />
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('auth.name')}
              className={inputClass}
            />
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              placeholder={t('auth.surname')}
              className={inputClass}
            />
          </div>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder={t('editProfile.bioPlaceholder')}
            className={inputClass}
            rows="3"
          ></textarea>

          {/* Intereses: personalizan el feed "Para vos" */}
          <div>
            <p className="text-ink font-medium text-sm">{t('editProfile.interests')}</p>
            <p className="text-muted text-xs mb-2">{t('editProfile.interestsHint')}</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => {
                const active = interests.includes(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleInterest(topic)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-accent text-on-accent border-accent'
                        : 'bg-raised text-muted border-edge hover:text-ink hover:border-muted/50'
                    }`}
                  >
                    {t(`topic.${topic}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-raised text-ink border border-edge rounded-full hover:bg-edge/60 transition-colors text-sm font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-on-accent rounded-full hover:bg-accent-hi transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

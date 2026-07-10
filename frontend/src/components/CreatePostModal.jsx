import React, { useState, useRef, useEffect } from 'react';
import { postsAPI } from '../services/api';
import { useI18n } from '../i18n/I18nContext';
import { TOPICS } from '../constants/topics';

const CreatePostModal = ({ onClose, onPostCreated, initialText = '' }) => {
  const { t } = useI18n();
  const [text, setText] = useState(initialText);
  const [topic, setTopic] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Cargar usuario para mostrar el avatar
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Error parsing user', e);
      }
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Ajustar altura del textarea automáticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text]);

  const handleFile = (file) => {
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB
        setError(t('compose.fileTooBig'));
        return;
      }
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleFileChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      handleFile(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaFile) return;

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('text', text);
      if (topic) formData.append('topic', topic);
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      const response = await postsAPI.createPost(formData);

      if (previewUrl) URL.revokeObjectURL(previewUrl);

      onPostCreated(response.data);
      setText('');
      setMediaFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || t('compose.error'));
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || (!text.trim() && !mediaFile);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-16 sm:pt-24 px-4 backdrop-blur-sm">
      {/* Overlay para cerrar al hacer clic afuera */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div
        className={`relative bg-surface border border-edge rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all animate-fade-up ${isDragging ? 'ring-4 ring-accent scale-[1.01]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Overlay visual de drag */}
        {isDragging && (
          <div className="absolute inset-0 bg-accent/10 flex items-center justify-center z-50 border-2 border-dashed border-accent rounded-2xl pointer-events-none">
            <p className="text-2xl font-display font-bold text-accent">{t('compose.drop')}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-edge">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-raised transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="font-display font-bold text-ink sm:hidden">{t('compose.title')}</span>
          <div className="w-9 sm:hidden"></div>
        </div>

        <div className="p-4 flex space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-on-accent font-bold overflow-hidden">
              {currentUser?.profile_pic ? (
                <img src={currentUser.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser?.username?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
          </div>

          {/* Inputs y previews */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="mb-3 px-3 py-2 bg-danger/10 text-danger text-sm rounded-xl border border-danger/30">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('compose.placeholder')}
                className="w-full border-none focus:ring-0 focus:outline-none text-xl text-ink placeholder-muted resize-none p-0 bg-transparent min-h-[40px] max-h-[400px] overflow-y-auto"
                rows="1"
              ></textarea>

              {/* Preview de media */}
              {previewUrl && (
                <div className="relative mt-4 mb-2 group">
                  <button
                    type="button"
                    onClick={removeMedia}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition z-10 backdrop-blur-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={previewUrl} controls className="w-full rounded-2xl border border-edge max-h-[400px] object-cover bg-black" />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-full rounded-2xl border border-edge max-h-[400px] object-cover" />
                  )}
                </div>
              )}

              {/* Tema del post: alimenta el feed "Para vos" */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {TOPICS.map((tp) => {
                  const active = topic === tp;
                  return (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setTopic(active ? null : tp)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-accent text-on-accent border-accent'
                          : 'bg-raised text-muted border-edge hover:text-ink'
                      }`}
                    >
                      {t(`topic.${tp}`)}
                    </button>
                  );
                })}
              </div>

              <div className="border-b border-edge my-4"></div>

              {/* Toolbar inferior */}
              <div className="flex justify-between items-center">
                <div className="flex items-center -ml-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-accent hover:bg-accent/10 rounded-full transition-colors"
                    title={t('compose.media')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-colors ${
                    isSubmitDisabled
                      ? 'bg-accent/40 text-on-accent/70 cursor-not-allowed'
                      : 'bg-accent text-on-accent hover:bg-accent-hi'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('compose.posting')}
                    </div>
                  ) : t('compose.post')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;

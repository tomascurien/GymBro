import React, { useState, useRef, useEffect } from 'react';
import { postsAPI } from '../services/api';

const CreatePostModal = ({ onClose, onPostCreated }) => {
  const [text, setText] = useState('');
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
        console.error("Error parsing user", e);
      }
    }
    // Auto-focus al textarea al abrir
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
        setError('El archivo es demasiado grande (máx 50MB).');
        return;
      }
      setMediaFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  // --- DRAG AND DROP HANDLERS ---
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
  // -----------------------------

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
      setError(err.response?.data?.message || 'Error al crear el post');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || (!text.trim() && !mediaFile);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-start justify-center z-50 pt-16 sm:pt-24 px-4 backdrop-blur-sm">
      {/* Overlay para cerrar al hacer clic afuera */}
      <div className="absolute inset-0" onClick={onClose}></div>

      <div 
        className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden transform transition-all ${isDragging ? 'ring-4 ring-blue-400 scale-[1.01]' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay Visual */}
        {isDragging && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-90 flex items-center justify-center z-50 border-2 border-dashed border-blue-500 rounded-2xl pointer-events-none">
                <p className="text-2xl font-bold text-blue-500">Suelta tu archivo aquí</p>
            </div>
        )}

        {/* Header: Cerrar */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <span className="font-bold text-gray-900 sm:hidden">Nuevo Post</span>
            <div className="w-9 sm:hidden"></div> {/* Spacer */}
        </div>

        <div className="p-4 flex space-x-4">
            {/* Columna Izquierda: Avatar */}
            <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold overflow-hidden">
                    {currentUser?.profile_pic ? (
                        <img src={currentUser.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span>{currentUser?.username?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                </div>
            </div>

            {/* Columna Derecha: Inputs y Previews */}
            <div className="flex-1 min-w-0">
                {error && (
                    <div className="mb-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Text Area Auto-ajustable */}
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="¿Qué está pasando?"
                        className="w-full border-none focus:ring-0 text-xl text-gray-900 placeholder-gray-500 resize-none p-0 bg-transparent min-h-[40px] max-h-[400px] overflow-y-auto"
                        rows="1"
                    ></textarea>

                    {/* Previsualización de Medios */}
                    {previewUrl && (
                        <div className="relative mt-4 mb-2 group">
                            <button
                                type="button"
                                onClick={removeMedia}
                                className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-90 transition z-10 backdrop-blur-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                            
                            {mediaFile?.type.startsWith('video/') ? (
                                <video src={previewUrl} controls className="w-full rounded-2xl border border-gray-200 max-h-[400px] object-cover bg-black" />
                            ) : (
                                <img src={previewUrl} alt="Preview" className="w-full rounded-2xl border border-gray-200 max-h-[400px] object-cover" />
                            )}
                        </div>
                    )}

                    {/* Línea divisora sutil */}
                    <div className="border-b border-gray-100 my-4"></div>

                    {/* Toolbar Inferior */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center -ml-2">
                            {/* Input File Oculto */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={handleFileChange}
                            />
                            
                            {/* Botón de Medios (Imagen) */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition group"
                                title="Media"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Botón GIF (Decorativo) */}
                            <button type="button" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition cursor-not-allowed opacity-50" title="GIF">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>

                             {/* Botón Emoji (Decorativo) */}
                             <button type="button" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition cursor-not-allowed opacity-50" title="Emoji">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className={`px-5 py-2 rounded-full font-bold text-sm transition shadow-sm ${
                                isSubmitDisabled
                                    ? 'bg-blue-300 text-white cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Postear
                                </div>
                            ) : 'Postear'}
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
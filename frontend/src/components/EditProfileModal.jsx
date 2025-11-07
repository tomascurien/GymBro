import React, { useState } from 'react';
import { usersAPI } from '../services/api';

const EditProfileModal = ({ currentUser, onClose, onProfileUpdated }) => {
  //datos actuales del usuario
  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    surname: currentUser.surname || '',
    bio: currentUser.bio || '',
    profile_pic: currentUser.profile_pic || '',
    cover_pic: currentUser.cover_pic || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await usersAPI.updateProfile(formData);

      onProfileUpdated(response.data.user);
      
    } catch (err) {
      console.error('Error actualizando el perfil:', err);
      setError(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Editar Perfil</h2>

        {error && <p className="text-red-600 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nombre"
              className="w-full border border-gray-300 rounded-lg p-2"
            />
            <input
              type="text"
              name="surname"
              value={formData.surname}
              onChange={handleChange}
              placeholder="Apellido"
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Biografía (ej. Amante del fitness...)"
            className="w-full border border-gray-300 rounded-lg p-2"
            rows="3"
          ></textarea>
          <input
            type="text"
            name="profile_pic"
            value={formData.profile_pic}
            onChange={handleChange}
            placeholder="URL de tu foto de perfil"
            className="w-full border border-gray-300 rounded-lg p-2"
          />
          <input
            type="text"
            name="cover_pic"
            value={formData.cover_pic}
            onChange={handleChange}
            placeholder="URL de tu foto de portada"
            className="w-full border border-gray-300 rounded-lg p-2"
          />

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
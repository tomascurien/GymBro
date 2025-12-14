// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // 1. Definimos el esquema de validación con Yup
  const validationSchema = Yup.object({
    username: Yup.string()
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .required('El nombre de usuario es obligatorio'),
    name: Yup.string()
      .required('El nombre es obligatorio'),
    surname: Yup.string()
      .required('El apellido es obligatorio'),
    email: Yup.string()
      .email('Ingresa un correo electrónico válido')
      .required('El correo es obligatorio'),
    password: Yup.string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Debe tener mayúscula, minúscula y número')
      .required('La contraseña es obligatoria'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Las contraseñas no coinciden')
      .required('Debes confirmar tu contraseña'),
  });

  const formik = useFormik({
    initialValues: {
      username: '',
      name: '',
      surname: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setServerError('');

      try {
        // Formik ya validó todo, preparamos los datos
        const { confirmPassword, ...dataToSend } = values;
        
        const response = await authAPI.register(dataToSend);
        
        console.log('📋 Respuesta del registro:', response.data);
        
        // Opcional: Auto-login si la API devuelve token, o redirigir
        if (response.data.token) {
             localStorage.setItem('token', response.data.token);
             localStorage.setItem('user', JSON.stringify(response.data.user));
             window.dispatchEvent(new Event('userLoggedIn'));
             navigate('/feed', { replace: true });
        } else {
             alert('¡Cuenta creada exitosamente! Inicia sesión.');
             navigate('/login');
        }

      } catch (err) {
        console.error('Error en registro:', err);
        setServerError(err.response?.data?.message || 'Error al registrarse');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-from-gray-900 to-gray-800 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <img
              src="/GymBro_banner.png"
              alt="GymBro logo"
              className="mx-auto h-36 w-auto object-contain rounded-xl shadow-lg mb-4 hover:scale-105 transition-transform duration-300"
            />
          <p className="text-gray-600">Únete a la comunidad fitness</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Cuenta</h2>

          {/* Error del Servidor (General) */}
          {serverError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit}>
            
            {/* Campo: Username */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Nombre de usuario</label>
              <input
                type="text"
                name="username"
                {...formik.getFieldProps('username')} // Esto conecta value, onChange y onBlur automáticamente
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  formik.touched.username && formik.errors.username 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-gray-800'
                }`}
                placeholder="gymbrox99"
              />
              {formik.touched.username && formik.errors.username && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.username}</p>
              )}
            </div>

            {/* Campos: Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Nombre</label>
                    <input
                        type="text"
                        name="name"
                        {...formik.getFieldProps('name')}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                            formik.touched.name && formik.errors.name 
                            ? 'border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-green-500' // Tu estilo original verde
                        }`}
                        placeholder="Juan"
                    />
                    {formik.touched.name && formik.errors.name && (
                        <p className="text-red-500 text-xs mt-1">{formik.errors.name}</p>
                    )}
                </div>
                <div>
                    <label className="block text-gray-700 font-medium mb-2">Apellido</label>
                    <input
                        type="text"
                        name="surname"
                        {...formik.getFieldProps('surname')}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                            formik.touched.surname && formik.errors.surname 
                            ? 'border-red-500 focus:ring-red-200' 
                            : 'border-gray-300 focus:ring-green-500'
                        }`}
                        placeholder="Pérez"
                    />
                    {formik.touched.surname && formik.errors.surname && (
                        <p className="text-red-500 text-xs mt-1">{formik.errors.surname}</p>
                    )}
                </div>
            </div>

            {/* Campo: Email */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                {...formik.getFieldProps('email')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  formik.touched.email && formik.errors.email 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="tu@email.com"
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.email}</p>
              )}
            </div>

            {/* Campo: Password */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                {...formik.getFieldProps('password')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  formik.touched.password && formik.errors.password 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="••••••••"
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.password}</p>
              )}
            </div>

            {/* Campo: Confirm Password */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                {...formik.getFieldProps('confirmPassword')}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  formik.touched.confirmPassword && formik.errors.confirmPassword 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 focus:ring-green-500'
                }`}
                placeholder="••••••••"
              />
              {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E50914] text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-gray-900 font-semibold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
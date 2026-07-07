// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogoMark } from '../components/Logo';
import { useI18n } from '../i18n/I18nContext';

const Login = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);

      const token = response.data.token;
      if (!token) {
        throw new Error(t('auth.noToken'));
      }
      localStorage.setItem('token', token);

      const userData = response.data.user;
      if (!userData || !userData.username) {
        throw new Error(t('auth.badUserData'));
      }
      localStorage.setItem('user', JSON.stringify(userData));

      // Navegar antes del evento (mismo orden que Register: evita que PublicRoute
      // redirija por re-render mientras seguimos en la ruta pública)
      navigate('/feed', { replace: true });
      window.dispatchEvent(new Event('userLoggedIn'));

    } catch (err) {
      console.error('Error en login:', err);
      if (err.response?.data?.needsVerification) {
        setNeedsVerification(true);
        setError(t('verify.needsVerification'));
      } else {
        setError(err.response?.data?.message || err.message || t('auth.loginError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authAPI.resendVerification(formData.email, lang);
      setResent(true);
      setTimeout(() => setResent(false), 60000);
    } catch (e) {
      // Respuesta genérica; nada que mostrar
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-edge rounded-xl bg-raised text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="max-w-md w-full animate-fade-up">
        {/* Logo y campaña */}
        <div className="text-center mb-8">
          <LogoMark size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-ink mb-2">
            {t('brand.tagline')}
          </h1>
          <p className="text-muted text-sm">{t('brand.pitch')}</p>
        </div>

        {/* Formulario */}
        <div className="bg-surface border border-edge rounded-2xl p-8">
          <h2 className="text-2xl font-display font-bold text-ink mb-6">{t('auth.loginTitle')}</h2>

          {error && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-xl text-sm">
              {error}
              {needsVerification && (
                <div className="mt-2">
                  {resent ? (
                    <span className="text-accent font-medium">{t('verify.resent')}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="underline hover:no-underline font-medium"
                    >
                      {t('verify.resend')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-ink font-medium mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-ink font-medium mb-2">
                {t('auth.password')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hi text-on-accent py-3 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted text-sm">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-accent font-semibold hover:underline">
                {t('auth.registerHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

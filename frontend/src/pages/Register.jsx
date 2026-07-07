// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../services/api';
import { LogoMark } from '../components/Logo';
import { useI18n } from '../i18n/I18nContext';
import { MailIcon } from '../components/Icons';

const Register = () => {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  // Email al que se mandó el link de confirmación (muestra la pantalla "revisá tu correo")
  const [pendingEmail, setPendingEmail] = useState(null);
  const [resent, setResent] = useState(false);

  // Esquema de validación con Yup (mensajes traducidos)
  const validationSchema = Yup.object({
    username: Yup.string()
      .min(3, t('valid.usernameMin'))
      .required(t('valid.usernameRequired')),
    name: Yup.string()
      .required(t('valid.nameRequired')),
    surname: Yup.string()
      .required(t('valid.surnameRequired')),
    email: Yup.string()
      .email(t('valid.emailInvalid'))
      .required(t('valid.emailRequired')),
    password: Yup.string()
      .min(6, t('valid.passwordMin'))
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('valid.passwordPattern'))
      .required(t('valid.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('valid.confirmMatch'))
      .required(t('valid.confirmRequired')),
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
        const { confirmPassword, ...dataToSend } = values;
        const response = await authAPI.register({ ...dataToSend, lang });

        if (response.data.pendingVerification) {
          setPendingEmail(response.data.email);
        } else if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          // Navegar ANTES de disparar el evento: si el evento re-renderiza mientras
          // seguimos en /register, PublicRoute redirige a /feed y pisa esta navegación.
          // Onboarding: aterrizar en el perfil propio con el modal de edición abierto
          navigate(`/profile/${response.data.user.username}?welcome=1`, { replace: true });
          window.dispatchEvent(new Event('userLoggedIn'));
        } else {
          alert(t('auth.accountCreated'));
          navigate('/login');
        }
      } catch (err) {
        console.error('Error en registro:', err);
        setServerError(err.response?.data?.message || t('auth.registerError'));
      } finally {
        setLoading(false);
      }
    },
  });

  const inputClass = (touched, error) =>
    `w-full px-4 py-3 border rounded-xl bg-raised text-ink placeholder-muted focus:outline-none focus:ring-2 ${
      touched && error
        ? 'border-danger/60 focus:ring-danger/40'
        : 'border-edge focus:ring-accent'
    }`;

  const fieldError = (name) =>
    formik.touched[name] && formik.errors[name] ? (
      <p className="text-danger text-xs mt-1">{formik.errors[name]}</p>
    ) : null;

  const handleResend = async () => {
    try {
      await authAPI.resendVerification(pendingEmail, lang);
      setResent(true);
      setTimeout(() => setResent(false), 60000);
    } catch (e) {
      // Respuesta genérica igual; no hay error visible que mostrar
    }
  };

  // Pantalla post-registro: "revisá tu correo"
  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="max-w-md w-full text-center animate-fade-up">
          <LogoMark size={64} className="mx-auto mb-6" />
          <div className="bg-surface border border-edge rounded-2xl p-8">
            <MailIcon size={48} className="mx-auto mb-4 text-accent" />
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('verify.checkTitle')}</h1>
            <p className="text-muted mb-2">{t('verify.checkText', { email: pendingEmail })}</p>
            <p className="text-muted text-sm mb-6">{t('verify.spamHint')}</p>
            {resent ? (
              <p className="text-accent font-medium">{t('verify.resent')}</p>
            ) : (
              <button
                onClick={handleResend}
                className="bg-raised text-ink border border-edge px-5 py-2.5 rounded-full font-medium hover:bg-edge/60 transition-colors"
              >
                {t('verify.resend')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-8">
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
          <h2 className="text-2xl font-display font-bold text-ink mb-6">{t('auth.registerTitle')}</h2>

          {serverError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-xl text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={formik.handleSubmit}>
            {/* Username */}
            <div className="mb-4">
              <label className="block text-ink font-medium mb-2">{t('auth.username')}</label>
              <input
                type="text"
                name="username"
                {...formik.getFieldProps('username')}
                className={inputClass(formik.touched.username, formik.errors.username)}
                placeholder="anafit"
              />
              {fieldError('username')}
            </div>

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-ink font-medium mb-2">{t('auth.name')}</label>
                <input
                  type="text"
                  name="name"
                  {...formik.getFieldProps('name')}
                  className={inputClass(formik.touched.name, formik.errors.name)}
                  placeholder="Ana"
                />
                {fieldError('name')}
              </div>
              <div>
                <label className="block text-ink font-medium mb-2">{t('auth.surname')}</label>
                <input
                  type="text"
                  name="surname"
                  {...formik.getFieldProps('surname')}
                  className={inputClass(formik.touched.surname, formik.errors.surname)}
                  placeholder="Pérez"
                />
                {fieldError('surname')}
              </div>
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-ink font-medium mb-2">{t('auth.email')}</label>
              <input
                type="email"
                name="email"
                {...formik.getFieldProps('email')}
                className={inputClass(formik.touched.email, formik.errors.email)}
                placeholder="tu@email.com"
              />
              {fieldError('email')}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-ink font-medium mb-2">{t('auth.password')}</label>
              <input
                type="password"
                name="password"
                {...formik.getFieldProps('password')}
                className={inputClass(formik.touched.password, formik.errors.password)}
                placeholder="••••••••"
              />
              {fieldError('password')}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block text-ink font-medium mb-2">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                name="confirmPassword"
                {...formik.getFieldProps('confirmPassword')}
                className={inputClass(formik.touched.confirmPassword, formik.errors.confirmPassword)}
                placeholder="••••••••"
              />
              {fieldError('confirmPassword')}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hi text-on-accent py-3 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('auth.creating') : t('auth.registerBtn')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted text-sm">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="text-accent font-semibold hover:underline">
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

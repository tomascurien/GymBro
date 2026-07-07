// frontend/src/pages/VerifyEmail.jsx
// Página a la que apunta el link del correo de confirmación (/verify?token=...).
// Si el token es válido, el backend devuelve una sesión: confirmar el correo
// ES el primer login, y de ahí directo al onboarding (?welcome=1).
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogoMark } from '../components/Logo';
import { useI18n } from '../i18n/I18nContext';

const VerifyEmail = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    authAPI.verifyEmail(token)
      .then((res) => {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setStatus('success');
        setTimeout(() => {
          navigate(`/profile/${res.data.user.username}?welcome=1`, { replace: true });
          window.dispatchEvent(new Event('userLoggedIn'));
        }, 1200);
      })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="max-w-md w-full text-center animate-fade-up">
        <LogoMark size={64} className="mx-auto mb-6" />

        {status === 'verifying' && (
          <div className="bg-surface border border-edge rounded-2xl p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent mx-auto mb-4"></div>
            <p className="text-muted">{t('verify.verifying')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-surface border border-edge rounded-2xl p-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('verify.successTitle')}</h1>
            <p className="text-muted">{t('verify.successText')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-surface border border-edge rounded-2xl p-8">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="text-2xl font-display font-bold text-ink mb-2">{t('verify.errorTitle')}</h1>
            <p className="text-muted mb-6">{t('verify.errorText')}</p>
            <Link
              to="/login"
              className="inline-block bg-accent hover:bg-accent-hi text-on-accent font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              {t('verify.goLogin')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

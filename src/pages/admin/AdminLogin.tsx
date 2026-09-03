import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { adminApi, ApiError } from '../../lib/api';
import { useAdminSession } from '../../store/useAdminSession';

export function AdminLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setToken = useAdminSession((s) => s.setToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await adminApi.login(email, password);
      if (result.requiresTotp && result.tempToken) {
        setTempToken(result.tempToken);
      } else if (result.token) {
        setToken(result.token);
        navigate('/admin');
      }
    } catch {
      setError(t('admin.errorInvalid'));
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await adminApi.verifyTotp(tempToken!, code);
      setToken(result.token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('home.errorGeneric'));
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-5">
      <div className="mb-8 flex justify-center">
        <Logo className="h-8 w-auto" />
      </div>
      <form onSubmit={tempToken ? handleVerify : handleLogin} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {tempToken ? (
          <input
            required
            inputMode="numeric"
            pattern="\d{6}"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('admin.code')}
            className="input text-center tracking-[0.5em]"
          />
        ) : (
          <>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('admin.email')}
              className="input"
            />
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('admin.password')}
              className="input"
            />
          </>
        )}
        {error && <p className="text-sm text-alert">{error}</p>}
        <Button type="submit" className="w-full">
          {tempToken ? t('admin.verify') : t('admin.login')}
        </Button>
      </form>
    </div>
  );
}

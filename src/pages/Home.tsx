import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { api, ApiError } from '../lib/api';
import { CURRENCIES, guessDefaultCurrency } from '../lib/currencies';
import { useGroupSession } from '../store/useGroupSession';

type Tab = 'create' | 'join';

export function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useGroupSession((s) => s.setSession);

  const [tab, setTab] = useState<Tab>('create');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [currency, setCurrency] = useState<string>(() => guessDefaultCurrency(i18n.language));
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const group = await api.createGroup(name, pin, currency);
      const { token } = await api.joinGroup(group.code, pin);
      setSession({ code: group.code, name: group.name, currency: group.currency, token });
      setCreatedCode(group.code);
    } catch {
      setError(t('home.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const upperCode = code.trim().toUpperCase();
      const { token, name: groupName, currency: groupCurrency } = await api.joinGroup(upperCode, pin);
      setSession({ code: upperCode, name: groupName, currency: groupCurrency, token });
      navigate(`/g/${upperCode}`);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? t('home.errorInvalid') : t('home.errorGeneric'));
    } finally {
      setLoading(false);
    }
  }

  if (createdCode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-16 max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"
      >
        <h1 className="text-2xl font-bold">{t('home.createdTitle')}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t('home.createdCode')}</p>
        <p className="brand-gradient-text mt-4 text-4xl font-extrabold tracking-widest">{createdCode}</p>
        <Button className="mt-6 w-full" onClick={() => navigate(`/g/${createdCode}`)}>
          {t('home.continueButton')}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-sm px-5">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">
          rachaí<span className="brand-gradient-text">.</span>
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">{t('app.tagline')}</p>
      </div>

      <div className="mt-8 flex rounded-xl border border-[var(--border)] p-1">
        <button
          type="button"
          onClick={() => setTab('create')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === 'create' ? 'bg-[var(--surface-2)]' : 'text-[var(--text-muted)]'}`}
        >
          {t('home.createTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('join')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${tab === 'join' ? 'bg-[var(--surface-2)]' : 'text-[var(--text-muted)]'}`}
        >
          {t('home.joinTab')}
        </button>
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          <Field label={t('home.groupName')}>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('home.groupNamePlaceholder')}
              className="input"
            />
          </Field>
          <Field label={t('home.pin')}>
            <input
              required
              inputMode="numeric"
              pattern="\d{4,6}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t('home.pinPlaceholder')}
              className="input"
            />
          </Field>
          <Field label={t('home.currency')}>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input">
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Field>
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {t('home.createButton')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="mt-6 space-y-4">
          <Field label={t('home.code')}>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('home.codePlaceholder')}
              className="input uppercase"
            />
          </Field>
          <Field label={t('home.pin')}>
            <input
              required
              inputMode="numeric"
              pattern="\d{4,6}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t('home.pinPlaceholder')}
              className="input"
            />
          </Field>
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {t('home.joinButton')}
          </Button>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

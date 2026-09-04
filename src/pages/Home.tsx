import { CircleDollarSign, MessageCircle, Zap } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { WhatsAppShareButton } from '../components/WhatsAppShareButton';
import { api, ApiError } from '../lib/api';
import { CURRENCIES, guessDefaultCurrency } from '../lib/currencies';
import { sanitizeGroupCode } from '../lib/share';
import { useGroupSession } from '../store/useGroupSession';

type Tab = 'create' | 'join';

export function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setSession = useGroupSession((s) => s.setSession);

  // An invite link carries the group code, so open straight on the join tab
  // with it filled in — only the PIN is left to type.
  const [searchParams] = useSearchParams();
  const invitedCode = sanitizeGroupCode(searchParams.get('c'));

  const [tab, setTab] = useState<Tab>(invitedCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [currency, setCurrency] = useState<string>(() => guessDefaultCurrency(i18n.language));
  const [code, setCode] = useState(invitedCode);
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

        <WhatsAppShareButton groupName={name} code={createdCode} className="mt-6 w-full" />
        <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">{t('share.pinHint')}</p>

        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate(`/g/${createdCode}`)}>
          {t('home.continueButton')}
        </Button>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
        <div className="text-center lg:text-left">
          <h1 className="text-3xl font-extrabold leading-[1.1] text-balance sm:text-4xl lg:text-5xl">
            {t('home.heroTitle1')}
            <br />
            <span className="brand-gradient-text">{t('home.heroTitle2')}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--text-muted)] lg:mx-0">
            {t('home.heroLede')}
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
            {[t('home.trustSignup'), t('home.trustCurrencies'), t('home.trustWhatsapp')].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-none text-success">
                  <path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="flex rounded-xl border border-[var(--border)] p-1">
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
                      {c.code} · {c.name}
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
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 md:gap-6 md:py-14">
          {(
            [
              { icon: Zap, title: t('home.feature1Title'), desc: t('home.feature1Desc') },
              { icon: CircleDollarSign, title: t('home.feature2Title'), desc: t('home.feature2Desc') },
              { icon: MessageCircle, title: t('home.feature3Title'), desc: t('home.feature3Desc') },
            ] as const
          ).map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              <h3 className="mt-3 font-display text-[15px] font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
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

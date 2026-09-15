import { ArrowRight, CircleDollarSign, Zap } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { animate, motion, type Variants } from 'framer-motion';
import { Button } from '../components/Button';
import { CopyInviteButton } from '../components/CopyInviteButton';
import { Field } from '../components/Field';
import { WhatsAppShareButton } from '../components/WhatsAppShareButton';
import { api, ApiError, formatCents } from '../lib/api';
import { CURRENCIES } from '../lib/currencies';
import { sanitizeGroupCode } from '../lib/share';
import { useGroupSession } from '../store/useGroupSession';

type Tab = 'create' | 'join';

// Most groups so far have been in reais; people who need something else
// change it right there in the same dropdown.
const DEFAULT_CURRENCY = 'BRL';

const heroContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const heroItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSession = useGroupSession((s) => s.setSession);

  // An invite link carries the group code, so open straight on the join tab
  // with it filled in — only the PIN is left to type.
  const [searchParams] = useSearchParams();
  const invitedCode = sanitizeGroupCode(searchParams.get('c'));

  const [tab, setTab] = useState<Tab>(invitedCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
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
      const { token, role } = await api.joinGroup(group.code, pin);
      setSession({ code: group.code, name: group.name, currency: group.currency, token, role });
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
      const { token, name: groupName, currency: groupCurrency, role } = pin.trim()
        ? await api.joinGroup(upperCode, pin)
        : await api.viewGroup(upperCode);
      setSession({ code: upperCode, name: groupName, currency: groupCurrency, token, role });
      navigate(`/g/${upperCode}`);
    } catch (err) {
      const isInvalid = err instanceof ApiError && (err.status === 401 || err.status === 404);
      setError(isInvalid ? t('home.errorInvalid') : t('home.errorGeneric'));
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
        <CopyInviteButton groupName={name} code={createdCode} className="mt-2 w-full" />
        <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">{t('share.pinHint')}</p>

        <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate(`/g/${createdCode}`)}>
          {t('home.continueButton')}
        </Button>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
        <motion.div
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="text-center lg:text-left"
        >
          <motion.h1
            variants={heroItem}
            className="text-3xl font-extrabold leading-[1.1] text-balance sm:text-4xl lg:text-5xl"
          >
            {t('home.heroTitle1')}
            <br />
            <span className="brand-gradient-text">{t('home.heroTitle2')}</span>
          </motion.h1>

          <motion.p
            variants={heroItem}
            className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--text-muted)] lg:mx-0"
          >
            {t('home.heroLede')}
          </motion.p>

          <motion.ul
            variants={heroItem}
            className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start"
          >
            {[t('home.trustSignup'), t('home.trustCurrencies'), t('home.trustWhatsapp')].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 flex-none text-success">
                  <path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z" />
                </svg>
                {item}
              </li>
            ))}
          </motion.ul>

          <motion.div variants={heroItem}>
            <ReceiptDemo />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
        >
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
              <Field label={t('home.joinPin')} hint={t('home.joinPinHint')}>
                <input
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
                {pin.trim() ? t('home.joinButton') : t('home.viewButton')}
              </Button>
            </form>
          )}
        </motion.div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 md:gap-6 md:py-14">
          {(
            [
              { icon: Zap, title: t('home.feature1Title'), desc: t('home.feature1Desc') },
              { icon: CircleDollarSign, title: t('home.feature2Title'), desc: t('home.feature2Desc') },
              { icon: WhatsAppIcon, title: t('home.feature3Title'), desc: t('home.feature3Desc') },
            ] as const
          ).map(({ icon: Icon, title, desc }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
              whileHover={{ y: -3 }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              </div>
              <h3 className="mt-3 font-display text-[15px] font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function useCountUp(targetCents: number, delay: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, targetCents, {
      duration: 0.9,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [targetCents, delay]);

  return value;
}

// A small live-looking preview of the actual product: two example expenses
// tally up and settle into the one transfer that closes them out. Shows what
// the app does instead of just listing feature bullets.
function ReceiptDemo() {
  const { t, i18n } = useTranslation();
  const items = [
    { label: t('home.demoItem1'), cents: 12000 },
    { label: t('home.demoItem2'), cents: 4000 },
  ];
  const totalTarget = items.reduce((sum, item) => sum + item.cents, 0);
  const total = useCountUp(totalTarget, 0.5);
  const resultAmount = useCountUp(totalTarget / 2, 1.1);

  return (
    <div className="mx-auto mt-8 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:mx-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t('home.demoLabel')}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">{item.label}</span>
            <span className="font-mono font-medium tabular-nums">{formatCents(item.cents, 'BRL', i18n.language)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-[var(--border)]" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">{t('home.demoTotal')}</span>
        <span className="font-mono font-bold tabular-nums">{formatCents(total, 'BRL', i18n.language)}</span>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 220, damping: 18 }}
        className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-success"
      >
        <ArrowRight className="h-3.5 w-3.5 flex-none" />
        {t('group.transferLine', {
          from: t('home.demoFrom'),
          to: t('home.demoTo'),
          amount: formatCents(resultAmount, 'BRL', i18n.language),
        })}
      </motion.div>
    </div>
  );
}

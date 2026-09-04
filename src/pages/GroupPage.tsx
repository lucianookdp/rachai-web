import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Plus,
  Receipt,
  Scale,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { CopyInviteButton } from '../components/CopyInviteButton';
import { WhatsAppShareButton } from '../components/WhatsAppShareButton';
import { api, formatCents, type Balance, type Expense, type Participant, type Transfer } from '../lib/api';
import { useGroupSession } from '../store/useGroupSession';

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const session = useGroupSession();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const currency = session.currency ?? 'USD';

  const load = useCallback(async () => {
    if (!session.token || !code) return;
    const [p, e, b] = await Promise.all([
      api.getParticipants(code, session.token),
      api.getExpenses(code, session.token),
      api.getBalances(code, session.token),
    ]);
    setParticipants(p);
    setExpenses(e);
    setBalances(b.balances);
    setTransfers(b.suggestedTransfers);
  }, [code, session.token]);

  useEffect(() => {
    if (!session.token || session.code !== code) {
      navigate('/');
      return;
    }
    // load() is async, so its setState calls run after the fetch resolves rather
    // than synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, [code, session.token, session.code, navigate, load]);

  async function handleAddParticipant(e: FormEvent) {
    e.preventDefault();
    if (!session.token || !code || !newParticipant.trim()) return;
    await api.addParticipant(code, session.token, newParticipant.trim());
    setNewParticipant('');
    void load();
  }

  async function handleMarkPaid(transfer: Transfer) {
    if (!session.token || !code) return;
    await api.recordPayment(code, session.token, transfer.fromId, transfer.toId, transfer.amountCents);
    void load();
  }

  async function handleDeleteExpense(id: string) {
    if (!session.token || !code) return;
    await api.deleteExpense(code, session.token, id);
    void load();
  }

  async function handleCopyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; the code is still visible to copy by hand.
    }
  }

  if (!code) return null;

  const isSettled = balances.every((b) => b.amountCents === 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <Users className="h-3.5 w-3.5" />
            {t('group.participants')} · {participants.length}
          </div>
          <h1 className="mt-1.5 truncate font-display text-3xl font-extrabold sm:text-4xl">{session.name}</h1>
          <button
            type="button"
            onClick={handleCopyCode}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-sm font-semibold tracking-widest hover:border-teal"
          >
            {code}
            {codeCopied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </button>
        </div>
        <div className="flex flex-none items-center gap-2">
          <CopyInviteButton groupName={session.name ?? ''} code={code} />
          <WhatsAppShareButton groupName={session.name ?? ''} code={code} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-6 lg:order-2">
          <Section icon={Scale} title={t('group.balances')}>
            {isSettled ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="font-medium text-[var(--text-muted)]">{t('group.settled')}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {balances.map((b) => (
                  <li
                    key={b.participantId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] px-3.5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={b.name} />
                      <span className="truncate font-medium">{b.name}</span>
                    </div>
                    <span
                      className={`flex-none rounded-full px-2.5 py-1 text-xs font-bold ${
                        b.amountCents >= 0 ? 'bg-success/10 text-success' : 'bg-alert/10 text-alert'
                      }`}
                    >
                      {t(b.amountCents >= 0 ? 'group.youAreOwed' : 'group.youOwe')}{' '}
                      {formatCents(Math.abs(b.amountCents), currency, i18n.language)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {transfers.length > 0 && (
              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t('group.suggestedTransfers')}
                </h3>
                <ul className="space-y-2">
                  {transfers.map((tr, i) => (
                    <li key={i} className="rounded-xl border border-[var(--border)] p-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Avatar name={tr.fromName} size="sm" />
                        <span className="min-w-0 truncate font-medium">{tr.fromName}</span>
                        <ArrowRight className="h-3.5 w-3.5 flex-none text-[var(--text-muted)]" />
                        <Avatar name={tr.toName} size="sm" />
                        <span className="min-w-0 truncate font-medium">{tr.toName}</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="font-bold">{formatCents(tr.amountCents, currency, i18n.language)}</span>
                        <Button
                          variant="secondary"
                          className="px-3 py-1.5 text-xs"
                          onClick={() => handleMarkPaid(tr)}
                        >
                          {t('group.markAsPaid')}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section icon={Users} title={t('group.participants')}>
            {participants.length === 0 ? (
              <p className="text-[var(--text-muted)]">{t('group.noParticipantsYet')}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] py-1 pl-1 pr-3">
                    <Avatar name={p.name} size="sm" />
                    <span className="text-sm font-medium">{p.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddParticipant} className="mt-4 flex gap-2">
              <input
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder={t('group.namePlaceholder')}
                className="input"
              />
              <Button type="submit" className="inline-flex flex-none items-center gap-1.5">
                <Plus className="h-4 w-4" />
                {t('group.add')}
              </Button>
            </form>
          </Section>
        </div>

        <div className="lg:order-1">
          <Section
            icon={Receipt}
            title={t('group.expenses')}
            action={
              participants.length >= 1 && (
                <Button
                  variant="secondary"
                  className="inline-flex flex-none items-center gap-1.5"
                  onClick={() => setShowExpenseForm((v) => !v)}
                >
                  <Plus className="h-4 w-4" />
                  {t('group.addExpense')}
                </Button>
              )
            }
          >
            {showExpenseForm && (
              <ExpenseForm
                code={code}
                token={session.token!}
                participants={participants}
                onDone={() => {
                  setShowExpenseForm(false);
                  void load();
                }}
              />
            )}

            {expenses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Receipt className="h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">{t('group.noExpensesYet')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {expenses.map((expense) => {
                  const payer = participants.find((p) => p.id === expense.paidById);
                  return (
                    <li key={expense.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {payer && <Avatar name={payer.name} />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{expense.description}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{payer?.name}</p>
                      </div>
                      <span className="flex-none font-bold">
                        {formatCents(expense.amountCents, currency, i18n.language)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(expense.id)}
                        aria-label={t('group.delete')}
                        title={t('group.delete')}
                        className="flex-none rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-alert/10 hover:text-alert"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-[18px] w-[18px] text-teal" />
          <h2 className="font-display text-lg font-bold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${hash}deg 62% 42%)`;
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-bold text-white ${dim}`}
      style={{ background: avatarColor(name) }}
    >
      {initials(name)}
    </span>
  );
}

function ExpenseForm({
  code,
  token,
  participants,
  onDone,
}: {
  code: string;
  token: string;
  participants: Participant[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(participants[0]?.id ?? '');
  const [splitAmong, setSplitAmong] = useState<string[]>(participants.map((p) => p.id));

  function toggleParticipant(id: string) {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
    if (!amountCents || !paidById || splitAmong.length === 0) return;
    await api.createExpense(code, token, { description, amountCents, paidById, participantIds: splitAmong });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <input
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('group.descriptionPlaceholder')}
        className="input"
      />
      <div className="flex gap-3">
        <input
          required
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t('group.amount')}
          className="input"
        />
        <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="input">
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--text-muted)]">{t('group.splitAmong')}</p>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const selected = splitAmong.includes(p.id);
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => toggleParticipant(p.id)}
                className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors ${
                  selected ? 'bg-gradient-to-r from-teal to-violet text-white' : 'border border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                {selected ? (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/25">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <Avatar name={p.name} size="sm" />
                )}
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        {t('group.save')}
      </Button>
    </form>
  );
}

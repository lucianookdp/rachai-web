import {
  ArrowRight,
  BedDouble,
  Car,
  ChartPie,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  House,
  KeyRound,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Scale,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  Trash2,
  Users,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { CopyInviteButton } from '../components/CopyInviteButton';
import { Field } from '../components/Field';
import { WhatsAppShareButton } from '../components/WhatsAppShareButton';
import {
  api,
  ApiError,
  EXPENSE_CATEGORIES,
  formatCents,
  type Balance,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type Participant,
  type RecurringExpense,
  type Transfer,
} from '../lib/api';
import { buildExpensesCsv, downloadTextFile } from '../lib/csv';
import { buildPixPayload } from '../lib/pix';
import { useGroupSession } from '../store/useGroupSession';

type ExpenseFormTarget = 'new' | Expense | null;

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingBasket,
  transport: Car,
  lodging: BedDouble,
  housing: House,
  entertainment: Ticket,
  shopping: ShoppingBag,
  other: Tag,
};

// Distinct hues for the chart bars, readable on both themes.
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: 'hsl(24 85% 52%)',
  groceries: 'hsl(142 55% 40%)',
  transport: 'hsl(210 75% 50%)',
  lodging: 'hsl(265 60% 58%)',
  housing: 'hsl(174 70% 38%)',
  entertainment: 'hsl(330 70% 55%)',
  shopping: 'hsl(45 90% 45%)',
  other: 'hsl(215 12% 55%)',
};

// Older expenses (and an API that predates categories) may not carry one.
function categoryOf(expense: Expense): ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(expense.category) ? expense.category : 'other';
}

export function GroupPage() {
  const { code } = useParams<{ code: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const session = useGroupSession();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [pixEditing, setPixEditing] = useState<Participant | null>(null);
  const [newParticipant, setNewParticipant] = useState('');
  const [expenseFormTarget, setExpenseFormTarget] = useState<ExpenseFormTarget>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const currency = session.currency ?? 'USD';

  const load = useCallback(async () => {
    if (!session.token || !code) return;
    const [p, e, b, r] = await Promise.all([
      api.getParticipants(code, session.token),
      api.getExpenses(code, session.token),
      api.getBalances(code, session.token),
      // An API from before monthly expenses answers 404; the page still works.
      api.getRecurring(code, session.token).catch(() => [] as RecurringExpense[]),
    ]);
    setParticipants(p);
    setExpenses(e);
    setBalances(b.balances);
    setTransfers(b.suggestedTransfers);
    setRecurring(r);
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

  async function handleStopRecurring(id: string) {
    if (!session.token || !code) return;
    await api.deleteRecurring(code, session.token, id);
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

  function handleExportCsv() {
    if (!code) return;
    const csv = buildExpensesCsv(expenses, participants);
    downloadTextFile(`rachai-${code}.csv`, csv, 'text/csv;charset=utf-8;');
  }

  if (!code) return null;

  const canEdit = session.role === 'editor';
  const isSettled = balances.every((b) => b.amountCents === 0);
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const participantById = new Map(participants.map((p) => [p.id, p]));
  // Pix only exists in reais; other currencies just don't get the button.
  const pixEnabled = currency === 'BRL';

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      {!canEdit && (
        <UnlockBanner
          code={code}
          onUnlock={(result) =>
            session.setSession({
              code,
              name: result.name,
              currency: result.currency,
              token: result.token,
              role: result.role,
            })
          }
        />
      )}

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
        <div className="flex flex-wrap items-center gap-2">
          <CopyInviteButton groupName={session.name ?? ''} code={code} />
          <WhatsAppShareButton groupName={session.name ?? ''} code={code} />
        </div>
      </div>

      <div className="mb-6">
        <Section icon={Users} title={t('group.participants')}>
          {participants.length === 0 ? (
            <p className="text-[var(--text-muted)]">{t('group.noParticipantsYet')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {participants.map((p) => {
                const chip = (
                  <>
                    <Avatar name={p.name} size="sm" />
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.pixKey && <KeyRound className="h-3.5 w-3.5 text-teal" aria-label={t('group.setPixKey')} />}
                  </>
                );
                return (
                  <li key={p.id}>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => setPixEditing((current) => (current?.id === p.id ? null : p))}
                        title={t('group.pixKeyOf', { name: p.name })}
                        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors ${
                          pixEditing?.id === p.id
                            ? 'border-teal bg-teal/10'
                            : 'border-transparent bg-[var(--surface-2)] hover:border-[var(--border)]'
                        }`}
                      >
                        {chip}
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] py-1 pl-1 pr-3">{chip}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {canEdit && pixEditing && (
            <PixKeyEditor
              key={pixEditing.id}
              code={code}
              token={session.token!}
              participant={pixEditing}
              onDone={() => {
                setPixEditing(null);
                void load();
              }}
            />
          )}
          {canEdit && (
            <form onSubmit={handleAddParticipant} className="mt-4 flex max-w-sm gap-2">
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
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
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
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t('group.suggestedTransfers')}
                </h3>
                <p className="mb-2.5 mt-1 text-xs text-[var(--text-muted)]">{t('group.suggestedTransfersHint')}</p>
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
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">{formatCents(tr.amountCents, currency, i18n.language)}</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {pixEnabled && participantById.get(tr.toId)?.pixKey && (
                            <CopyPixButton
                              pixKey={participantById.get(tr.toId)!.pixKey!}
                              name={tr.toName}
                              amountCents={tr.amountCents}
                            />
                          )}
                          {canEdit && (
                            <Button
                              variant="secondary"
                              className="px-3 py-1.5 text-xs"
                              onClick={() => handleMarkPaid(tr)}
                            >
                              {t('group.markAsPaid')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {expenses.length > 0 && (
            <Section icon={ChartPie} title={t('group.spendingByCategory')}>
              <SpendingByCategory expenses={expenses} currency={currency} />
            </Section>
          )}
        </div>

        <div className="lg:order-1">
          <Section
            icon={Receipt}
            title={t('group.expenses')}
            subtitle={expenses.length > 0 ? formatCents(totalCents, currency, i18n.language) : undefined}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {expenses.length > 0 && (
                  <Button
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                    onClick={handleExportCsv}
                  >
                    <Download className="h-4 w-4" />
                    {t('group.export')}
                  </Button>
                )}
                {canEdit && participants.length >= 1 && (
                  <Button
                    variant="secondary"
                    className="inline-flex items-center gap-1.5"
                    onClick={() => setExpenseFormTarget((current) => (current === 'new' ? null : 'new'))}
                  >
                    <Plus className="h-4 w-4" />
                    {t('group.addExpense')}
                  </Button>
                )}
              </div>
            }
          >
            {expenseFormTarget === 'new' && (
              <ExpenseForm
                code={code}
                token={session.token!}
                participants={participants}
                currency={currency}
                onDone={() => {
                  setExpenseFormTarget(null);
                  void load();
                }}
                onCancel={() => setExpenseFormTarget(null)}
              />
            )}

            {recurring.length > 0 && (
              <div className="mb-5 rounded-xl border border-[var(--border)] p-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  <Repeat className="h-3.5 w-3.5" />
                  {t('group.monthlyExpenses')}
                </h3>
                <ul className="space-y-1.5">
                  {recurring.map((r) => (
                    <li key={r.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.description}</p>
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {t('group.monthlyLine', {
                            amount: formatCents(r.amountCents, currency, i18n.language),
                            day: r.dayOfMonth,
                          })}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleStopRecurring(r.id)}
                          className="flex-none rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-alert/10 hover:text-alert"
                        >
                          {t('group.stopRecurring')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {expenses.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Receipt className="h-8 w-8 text-[var(--text-muted)]" />
                <p className="text-[var(--text-muted)]">{t('group.noExpensesYet')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {expenses.map((expense) => {
                  if (expenseFormTarget !== 'new' && expenseFormTarget?.id === expense.id) {
                    return (
                      <li key={expense.id} className="py-3 first:pt-0 last:pb-0">
                        <ExpenseForm
                          code={code}
                          token={session.token!}
                          participants={participants}
                          currency={currency}
                          editingExpense={expenseFormTarget}
                          onDone={() => {
                            setExpenseFormTarget(null);
                            void load();
                          }}
                          onCancel={() => setExpenseFormTarget(null)}
                        />
                      </li>
                    );
                  }

                  const payer = participantById.get(expense.paidById);
                  const category = categoryOf(expense);
                  const CategoryIcon = CATEGORY_ICONS[category];
                  return (
                    <li key={expense.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-white"
                        style={{ background: CATEGORY_COLORS[category] }}
                        title={t(`categories.${category}`)}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          <span className="truncate">{expense.description}</span>
                          {expense.recurringId && (
                            <span className="flex-none rounded-full bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal">
                              {t('group.monthlyBadge')}
                            </span>
                          )}
                        </p>
                        {payer && (
                          <p className="truncate text-xs text-[var(--text-muted)]">
                            {t(`categories.${category}`)} ·{' '}
                            {t('group.expensePaidBySplit', { payer: payer.name, count: expense.shares.length })}
                          </p>
                        )}
                        {expense.note && (
                          <p className="truncate text-xs italic text-[var(--text-muted)]">{expense.note}</p>
                        )}
                      </div>
                      <span className="flex-none font-bold">
                        {formatCents(expense.amountCents, currency, i18n.language)}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpenseFormTarget(expense)}
                            aria-label={t('group.edit')}
                            title={t('group.edit')}
                            className="flex-none rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(expense.id)}
                            aria-label={t('group.delete')}
                            title={t('group.delete')}
                            className="flex-none rounded-lg p-2 text-[var(--text-muted)] hover:bg-alert/10 hover:text-alert"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
  subtitle,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-[18px] w-[18px] text-teal" />
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {subtitle && <span className="text-sm font-medium text-[var(--text-muted)]">· {subtitle}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PixKeyEditor({
  code,
  token,
  participant,
  onDone,
}: {
  code: string;
  token: string;
  participant: Participant;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(participant.pixKey ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(pixKey: string | null) {
    setError(null);
    setSaving(true);
    try {
      await api.updateParticipantPixKey(code, token, participant.id, pixKey);
      onDone();
    } catch (err) {
      setError(
        t(err instanceof ApiError && err.message.includes('cpf_not_allowed') ? 'group.pixKeyCpf' : 'group.pixKeyInvalid'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(value.trim() || null);
      }}
      className="mt-4 max-w-md space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
    >
      <Field label={t('group.pixKeyOf', { name: participant.name })}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('group.pixKeyPlaceholder')}
          maxLength={100}
          autoComplete="off"
          className="input"
        />
      </Field>
      <p className="text-xs text-[var(--text-muted)]">{t('group.pixKeyHint')}</p>
      {error && <p className="text-xs text-alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {t('group.save')}
        </Button>
        {participant.pixKey && (
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void save(null)}>
            {t('group.removePixKey')}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('group.cancel')}
        </Button>
      </div>
    </form>
  );
}

function CopyPixButton({ pixKey, name, amountCents }: { pixKey: string; name: string; amountCents: number }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildPixPayload({ key: pixKey, name, amountCents }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the key is still visible in the group to copy by hand.
    }
  }

  return (
    <Button
      variant="secondary"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
      onClick={handleCopy}
      title={t('group.copyPixHint')}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {t(copied ? 'group.pixCopied' : 'group.copyPix')}
    </Button>
  );
}

function SpendingByCategory({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const { t, i18n } = useTranslation();
  const totals = new Map<ExpenseCategory, number>();
  for (const expense of expenses) {
    const category = categoryOf(expense);
    totals.set(category, (totals.get(category) ?? 0) + expense.amountCents);
  }
  const rows = [...totals].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, cents]) => sum + cents, 0);

  return (
    <ul className="space-y-3">
      {rows.map(([category, cents]) => {
        const Icon = CATEGORY_ICONS[category];
        const percent = total > 0 ? Math.round((cents * 100) / total) : 0;
        return (
          <li key={category}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 flex-none" style={{ color: CATEGORY_COLORS[category] }} />
                <span className="truncate">{t(`categories.${category}`)}</span>
              </span>
              <span className="flex-none font-medium">
                {formatCents(cents, currency, i18n.language)}{' '}
                <span className="text-xs text-[var(--text-muted)]">· {percent}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(percent, 2)}%`, background: CATEGORY_COLORS[category] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function UnlockBanner({
  code,
  onUnlock,
}: {
  code: string;
  onUnlock: (result: { token: string; name: string; currency: string; role: 'editor' }) => void;
}) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      const result = await api.joinGroup(code, pin);
      onUnlock(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Eye className="h-4 w-4 flex-none" />
          {t('group.viewOnlyNotice')}
        </div>
        <div className="flex flex-none items-center gap-2">
          <input
            inputMode="numeric"
            pattern="\d{4,6}"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t('home.pinPlaceholder')}
            className="input w-28"
          />
          <Button type="submit" variant="secondary" disabled={loading || !pin.trim()}>
            {t('group.unlock')}
          </Button>
        </div>
      </form>
      {error && <p className="mt-2 text-xs text-alert">{t('home.errorInvalid')}</p>}
    </div>
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

function parseAmountToCents(value: string): number {
  const cents = Math.round(parseFloat(value.replace(',', '.')) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

function centsToAmountString(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Client-side mirror of the backend's splitEqually, used only to seed the
// custom-amounts inputs with a sensible starting point when switching modes.
// The backend re-validates whatever is actually submitted.
function previewEqualSplit(totalCents: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => (index < remainder ? base + 1 : base));
}

function ExpenseForm({
  code,
  token,
  participants,
  currency,
  editingExpense,
  onDone,
  onCancel,
}: {
  code: string;
  token: string;
  participants: Participant[];
  currency: string;
  editingExpense?: Expense;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [paidById, setPaidById] = useState(editingExpense?.paidById ?? participants[0]?.id ?? '');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(editingExpense ? 'custom' : 'equal');
  const [category, setCategory] = useState<ExpenseCategory>(editingExpense ? categoryOf(editingExpense) : 'other');
  const [note, setNote] = useState(editingExpense?.note ?? '');
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [dayOfMonth, setDayOfMonth] = useState(() => Math.min(new Date().getDate(), 28));
  const [error, setError] = useState<string | null>(null);
  // Monthly expenses split equally (see the API's createRecurringSchema).
  const monthly = !editingExpense && splitMode === 'equal' && repeatMonthly;

  const [amount, setAmount] = useState(editingExpense ? centsToAmountString(editingExpense.amountCents) : '');
  const [splitAmong, setSplitAmong] = useState<string[]>(
    editingExpense ? editingExpense.shares.map((s) => s.participantId) : participants.map((p) => p.id),
  );

  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() =>
    editingExpense
      ? Object.fromEntries(editingExpense.shares.map((s) => [s.participantId, centsToAmountString(s.shareCents)]))
      : {},
  );

  function toggleParticipant(id: string) {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function handleModeChange(mode: 'equal' | 'custom') {
    if (mode === 'custom' && Object.keys(customAmounts).length === 0 && splitAmong.length > 0) {
      const shares = previewEqualSplit(parseAmountToCents(amount), splitAmong.length);
      const seeded: Record<string, string> = {};
      splitAmong.forEach((id, index) => {
        seeded[id] = centsToAmountString(shares[index]!);
      });
      setCustomAmounts(seeded);
    }
    setSplitMode(mode);
  }

  const amountCents = parseAmountToCents(amount);
  const perPersonCents = splitAmong.length > 0 ? Math.floor(amountCents / splitAmong.length) : 0;
  const customTotalCents = participants.reduce(
    (sum, p) => sum + parseAmountToCents(customAmounts[p.id] ?? ''),
    0,
  );

  const isValid =
    !!paidById &&
    (splitMode === 'equal'
      ? amountCents > 0 && splitAmong.length > 0
      : participants.some((p) => parseAmountToCents(customAmounts[p.id] ?? '') > 0));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let payload: ExpenseInput;
    if (splitMode === 'equal') {
      if (!amountCents || splitAmong.length === 0) return;
      payload = { description, amountCents, paidById, category, note, participantIds: splitAmong };
    } else {
      const shares = participants
        .map((p) => ({ participantId: p.id, shareCents: parseAmountToCents(customAmounts[p.id] ?? '') }))
        .filter((s) => s.shareCents > 0);
      if (shares.length === 0) return;
      payload = {
        description,
        amountCents: shares.reduce((sum, s) => sum + s.shareCents, 0),
        paidById,
        category,
        note,
        shares,
      };
    }

    try {
      if (monthly) {
        await api.createRecurring(code, token, {
          description,
          amountCents,
          paidById,
          participantIds: splitAmong,
          category,
          dayOfMonth,
        });
      } else if (editingExpense) {
        await api.updateExpense(code, token, editingExpense.id, payload);
      } else {
        await api.createExpense(code, token, payload);
      }
      onDone();
    } catch (err) {
      setError(t('group.limitReached', { error: err instanceof Error ? err.message : '' }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <Field label={t('group.description')}>
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('group.descriptionPlaceholder')}
          className="input"
          maxLength={200}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--text-muted)]">{t('group.category')}</p>
        <div className="flex flex-wrap gap-1.5">
          {EXPENSE_CATEGORIES.map((option) => {
            const Icon = CATEGORY_ICONS[option];
            const selected = category === option;
            return (
              <button
                type="button"
                key={option}
                onClick={() => setCategory(option)}
                aria-pressed={selected}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  selected ? 'border-teal bg-teal/10 text-teal' : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={selected ? undefined : { color: CATEGORY_COLORS[option] }} />
                {t(`categories.${option}`)}
              </button>
            );
          })}
        </div>
      </div>

      <Field label={t('group.paidBy')}>
        <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="input">
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--text-muted)]">{t('group.splitAmong')}</p>
        <div className="mb-2 flex rounded-xl border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => handleModeChange('equal')}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
              splitMode === 'equal' ? 'bg-[var(--surface)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {t('group.splitEqual')}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
              splitMode === 'custom' ? 'bg-[var(--surface)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {t('group.splitCustom')}
          </button>
        </div>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t(splitMode === 'equal' ? 'group.splitEqualHint' : 'group.splitCustomHint')}
        </p>

        {splitMode === 'equal' ? (
          <>
            <Field label={t('group.amount')}>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('group.amountPlaceholder')}
                className="input"
              />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.map((p) => {
                const selected = splitAmong.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-teal bg-teal/10 text-teal'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
                    }`}
                  >
                    {selected ? (
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal text-white">
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
            {amountCents > 0 && splitAmong.length > 0 && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {t('group.perPersonHint', { amount: formatCents(perPersonCents, currency, i18n.language) })}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar name={p.name} size="sm" />
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <input
                    inputMode="decimal"
                    value={customAmounts[p.id] ?? ''}
                    onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder={t('group.amountPlaceholder')}
                    className="input w-28 text-right"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-sm">
              <span className="text-[var(--text-muted)]">{t('group.customTotalLabel')}</span>
              <span className="font-bold">{formatCents(customTotalCents, currency, i18n.language)}</span>
            </div>
          </>
        )}
      </div>

      {!editingExpense && splitMode === 'equal' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={repeatMonthly}
              onChange={(e) => setRepeatMonthly(e.target.checked)}
              className="h-4 w-4 accent-teal"
            />
            <Repeat className="h-4 w-4 text-teal" />
            {t('group.repeatMonthly')}
          </label>
          {repeatMonthly && (
            <div className="mt-2.5 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">{t('group.repeatMonthlyHint')}</p>
              <Field label={t('group.dayOfMonth')}>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Number(e.target.value))}
                  className="input w-28"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>
      )}

      {!monthly && (
        <Field label={t('group.note')}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('group.notePlaceholder')}
            maxLength={140}
            className="input"
          />
        </Field>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid} className="flex-1 sm:flex-none">
          {t('group.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 sm:flex-none">
          {t('group.cancel')}
        </Button>
      </div>
    </form>
  );
}

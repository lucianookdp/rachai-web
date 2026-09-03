import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
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

  if (!code) return null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 space-y-8">
      <h1 className="text-2xl font-extrabold">{session.name}</h1>

      <Section title={t('group.balances')}>
        {balances.every((b) => b.amountCents === 0) ? (
          <p className="text-[var(--text-muted)]">{t('group.settled')}</p>
        ) : (
          <ul className="space-y-2">
            {balances.map((b) => (
              <li key={b.participantId} className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-4 py-2.5">
                <span className="font-medium">{b.name}</span>
                <span className={b.amountCents >= 0 ? 'text-success font-semibold' : 'text-alert font-semibold'}>
                  {b.amountCents >= 0 ? t('group.youAreOwed') : t('group.youOwe')}{' '}
                  {formatCents(Math.abs(b.amountCents), i18n.language)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {transfers.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--text-muted)]">{t('group.suggestedTransfers')}</h3>
            <ul className="space-y-2">
              {transfers.map((tr, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2.5">
                  <span>
                    {t('group.transferLine', {
                      from: tr.fromName,
                      to: tr.toName,
                      amount: formatCents(tr.amountCents, i18n.language),
                    })}
                  </span>
                  <Button variant="secondary" onClick={() => handleMarkPaid(tr)}>
                    {t('group.markAsPaid')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title={t('group.participants')}>
        {participants.length === 0 ? (
          <p className="text-[var(--text-muted)]">{t('group.noParticipantsYet')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <li key={p.id} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm font-medium">
                {p.name}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddParticipant} className="mt-3 flex gap-2">
          <input
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder={t('group.namePlaceholder')}
            className="input"
          />
          <Button type="submit">{t('group.add')}</Button>
        </form>
      </Section>

      <Section
        title={t('group.expenses')}
        action={
          participants.length >= 1 && (
            <Button variant="secondary" onClick={() => setShowExpenseForm((v) => !v)}>
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
          <p className="mt-3 text-[var(--text-muted)]">{t('group.noExpensesYet')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {expenses.map((expense) => {
              const payer = participants.find((p) => p.id === expense.paidById);
              return (
                <li key={expense.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2.5">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-xs text-[var(--text-muted)]">{payer?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCents(expense.amountCents, i18n.language)}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-xs text-[var(--text-muted)] hover:text-alert"
                    >
                      {t('group.delete')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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
    <form onSubmit={handleSubmit} className="mb-4 space-y-3 rounded-xl bg-[var(--surface-2)] p-4">
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
          {participants.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => toggleParticipant(p.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                splitAmong.includes(p.id) ? 'bg-gradient-to-r from-teal to-violet text-white' : 'bg-[var(--surface)] border border-[var(--border)]'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit">{t('group.save')}</Button>
    </form>
  );
}

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildJoinUrl } from '../lib/share';

interface CopyInviteButtonProps {
  groupName: string;
  code: string;
  compact?: boolean;
  className?: string;
}

export function CopyInviteButton({ groupName, code, compact = false, className = '' }: CopyInviteButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const message = t('share.message', { name: groupName, code, url: buildJoinUrl(code) });
  const size = compact ? 'rounded-lg px-3 py-1.5 text-xs' : 'rounded-xl px-5 py-2.5 text-sm';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; there's no further fallback for it.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 border border-[var(--border)] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)] ${size} ${className}`}
    >
      {copied ? (
        <Check className={compact ? 'h-3.5 w-3.5 text-success' : 'h-4 w-4 text-success'} />
      ) : (
        <Copy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      {copied ? t('share.copied') : t('share.copy')}
    </button>
  );
}

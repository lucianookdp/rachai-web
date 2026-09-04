// The invite carries the group code, never the PIN. The code and the PIN are
// meant to be two independent factors: putting both in one forwardable message
// — or in a URL, which ends up in browser history, referrer headers and link
// previews — collapses them into a single one.
export function buildJoinUrl(code: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}?c=${encodeURIComponent(code)}`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// A code arriving from the URL is untrusted input: keep only the characters a
// real code can contain, so nothing else reaches the join form or the API.
export function sanitizeGroupCode(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

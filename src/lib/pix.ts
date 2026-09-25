// Builds a static Pix "copia e cola" code (the BR Code / EMV format from the
// Banco Central's Pix manual) that any Brazilian bank app accepts, with the
// amount already filled in. Nothing leaves the browser.

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

// Bank apps reject anything outside plain ASCII in the name and city fields.
function plainAscii(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** CRC16/CCITT-FALSE, the checksum the BR Code ends with. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload({
  key,
  name,
  amountCents,
  city = 'BRASIL',
}: {
  key: string;
  name: string;
  amountCents?: number;
  city?: string;
}): string {
  const body =
    field('00', '01') +
    field('26', field('00', 'br.gov.bcb.pix') + field('01', key)) +
    field('52', '0000') +
    field('53', '986') +
    (amountCents ? field('54', (amountCents / 100).toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', plainAscii(name, 25) || 'RACHAI') +
    field('60', plainAscii(city, 15) || 'BRASIL') +
    field('62', field('05', '***')) +
    '6304';
  return body + crc16(body);
}

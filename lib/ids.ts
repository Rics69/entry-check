const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * Случайный id без похожих символов. 20 знаков ≈ 100 бит: ссылку на оплаченную поездку
 * /trip/<id> нельзя подобрать, поэтому она сама служит ключом доступа.
 */
export function randomId(prefix = "", length = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return prefix + id;
}

/** Короткий стабильный отпечаток строки (FNV-1a, 32 бита) — чтобы заметить изменение правила. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

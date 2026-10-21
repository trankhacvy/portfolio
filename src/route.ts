const HASH_PREFIX = '#/';
const COMMAND_PREFIX = '/';

function safeDecode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

export function hashToInput(hash: string): string | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;

  const path = safeDecode(hash.slice(HASH_PREFIX.length));
  if (path === null) return null;

  const words = path.split('/').filter(Boolean);

  return words.length > 0 ? `${COMMAND_PREFIX}${words.join(' ')}` : null;
}

export function toHash(name: string, args: string[]): string {
  const path = [name, ...args].map(encodeURIComponent).join('/');
  return `${HASH_PREFIX}${path}`;
}

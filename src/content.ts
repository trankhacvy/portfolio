import type { Post } from './types';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_FIELDS = ['title', 'date', 'summary'] as const;

function parseFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const line of block.split(/\r?\n/)) {
    const sep = line.indexOf(':');
    if (sep < 1) continue;

    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
    fields[key] = value;
  }

  return fields;
}

export function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path;
  return file.replace(/\.md$/, '');
}

export function parsePost(path: string, raw: string): Post {
  const slug = slugFromPath(path);
  const match = FRONTMATTER.exec(raw);
  if (!match) throw new Error(`${path}: missing frontmatter`);

  const fields = parseFields(match[1] ?? '');
  for (const name of REQUIRED_FIELDS) {
    if (!fields[name]) throw new Error(`${path}: missing "${name}" in frontmatter`);
  }

  const { title = '', date = '', summary = '' } = fields;
  if (!DATE_FORMAT.test(date)) throw new Error(`${path}: date must be YYYY-MM-DD`);

  return { slug, title, date, summary, body: (match[2] ?? '').trim() };
}

export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function loadPosts(): Post[] {
  const files = import.meta.glob<string>('/content/blog/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  return sortPosts(Object.entries(files).map(([path, raw]) => parsePost(path, raw)));
}

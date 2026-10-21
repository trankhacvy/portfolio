import { describe, expect, it } from 'vitest';
import { loadPosts, parsePost, sortPosts } from './content';

const RAW = `---
title: "Hello: world"
date: 2026-01-02
summary: A summary
---

Body line one.

Body line two.
`;

function makePost(slug: string, date: string) {
  return parsePost(`/${slug}.md`, `---\ntitle: ${slug}\ndate: ${date}\nsummary: s\n---\nb`);
}

describe('parsePost', () => {
  it('extracts frontmatter fields and body', () => {
    const post = parsePost('/content/blog/hello.md', RAW);

    expect(post).toEqual({
      slug: 'hello',
      title: 'Hello: world',
      date: '2026-01-02',
      summary: 'A summary',
      body: 'Body line one.\n\nBody line two.',
    });
  });

  it('rejects a post without frontmatter', () => {
    expect(() => parsePost('/content/blog/x.md', 'just text')).toThrow(/frontmatter/);
  });

  it('rejects a post with a missing field', () => {
    const raw = '---\ntitle: T\ndate: 2026-01-01\n---\nbody';
    expect(() => parsePost('/content/blog/x.md', raw)).toThrow(/summary/);
  });

  it('rejects a malformed date', () => {
    const raw = '---\ntitle: T\ndate: Jan 1\nsummary: S\n---\nbody';
    expect(() => parsePost('/content/blog/x.md', raw)).toThrow(/YYYY-MM-DD/);
  });
});

describe('sortPosts', () => {
  it('orders newest first without mutating the input', () => {
    const input = [makePost('old', '2025-01-01'), makePost('new', '2026-06-01'), makePost('mid', '2025-12-31')];

    expect(sortPosts(input).map((p) => p.slug)).toEqual(['new', 'mid', 'old']);
    expect(input.map((p) => p.slug)).toEqual(['old', 'new', 'mid']);
  });
});

describe('loadPosts', () => {
  it('loads the shipped blog posts, newest first', () => {
    const posts = loadPosts();
    const dates = posts.map((p) => p.date);

    expect(posts.map((p) => p.slug)).toContain('hello-terminal');
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

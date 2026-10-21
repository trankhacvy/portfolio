import { describe, expect, it } from 'vitest';
import { hashToInput, toHash } from './route';

describe('route', () => {
  it('turns a hash into command input', () => {
    expect(hashToInput('#/work')).toBe('work');
    expect(hashToInput('#/blog/hello-terminal')).toBe('blog hello-terminal');
  });

  it('ignores hashes that are not routes', () => {
    expect(hashToInput('')).toBeNull();
    expect(hashToInput('#top')).toBeNull();
    expect(hashToInput('#/')).toBeNull();
    expect(hashToInput('#/%E0%A4%A')).toBeNull();
  });

  it('round-trips a command and args', () => {
    expect(toHash('blog', ['hello-terminal'])).toBe('#/blog/hello-terminal');
    expect(hashToInput(toHash('blog', ['a b']))).toBe('blog a b');
  });
});

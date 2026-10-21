import { describe, expect, it, vi } from 'vitest';
import { profile } from '../content/profile';
import { loadPosts } from './content';
import { COMMANDS, execute, filterMenu, menuFor, moveIndex, resolve } from './commands';
import { Theme, Tone, type Ctx, type MenuState } from './types';

function nameOf(input: string): string {
  const result = resolve(input, COMMANDS);
  if ('unknown' in result) throw new Error(`unknown: ${result.unknown}`);
  return result.command.name;
}

function makeCtx(overrides: Partial<Ctx> = {}): Ctx {
  return {
    profile,
    posts: loadPosts(),
    theme: Theme.Dark,
    setTheme: vi.fn(),
    clear: vi.fn(),
    ...overrides,
  };
}

function run(input: string, ctx: Ctx = makeCtx()) {
  const result = resolve(input, COMMANDS);
  if ('unknown' in result) throw new Error(`unknown: ${result.unknown}`);
  return result.command.run(result.args, ctx);
}

describe('resolve', () => {
  it.each(['/work', 'work', '/PROJECTS', '  /Work  ', '/projects'])('maps %s to work', (input) => {
    expect(nameOf(input)).toBe('work');
  });

  it('passes args through', () => {
    const result = resolve('/blog hello-terminal', COMMANDS);

    expect(result).toMatchObject({ args: ['hello-terminal'] });
    expect(nameOf('/blog hello-terminal')).toBe('blog');
  });

  it('falls back to keywords for plain text', () => {
    expect(nameOf('show me your projects')).toBe('work');
    expect(nameOf('read the blog')).toBe('blog');
    expect(nameOf('how do I hire you?')).toBe('contact');
    expect(nameOf('who are you')).toBe('about');
    expect(nameOf('?')).toBe('help');
  });

  it('resolves aliases', () => {
    expect(nameOf('whoami')).toBe('about');
    expect(nameOf('cls')).toBe('clear');
    expect(nameOf('quit')).toBe('exit');
  });

  it('reports unknown input', () => {
    expect(resolve('/nope', COMMANDS)).toEqual({ unknown: '/nope' });
    expect(resolve('gibberish xyz', COMMANDS)).toEqual({ unknown: 'gibberish xyz' });
  });

  it('does not keyword-match slash input', () => {
    expect(resolve('/show projects', COMMANDS)).toEqual({ unknown: '/show projects' });
  });
});

describe('filterMenu', () => {
  const names = (query: string) => filterMenu(query, COMMANDS).map((cmd) => cmd.name);

  it('puts prefix matches before substring matches', () => {
    const result = names('b');

    expect(result[0]).toBe('blog');
    expect(result).toContain('about');
  });

  it('lists every visible command for an empty query', () => {
    expect(names('')).toEqual(COMMANDS.filter((cmd) => !cmd.hidden).map((cmd) => cmd.name));
  });

  it('never lists hidden commands', () => {
    for (const query of ['', 's', 'e', 'h', 'sudo', 'hire-me', 'exit']) {
      const hidden = filterMenu(query, COMMANDS).filter((cmd) => cmd.hidden);
      expect(hidden).toEqual([]);
    }
  });

  it('matches aliases', () => {
    expect(names('pro')).toEqual(['work']);
  });
});

describe('menu state', () => {
  const closed: MenuState = { open: false };

  it('opens for a bare slash prefix and closes once args start', () => {
    expect(menuFor('/', closed)).toEqual({ open: true, query: '', index: 0 });
    expect(menuFor('/bl', closed)).toEqual({ open: true, query: 'bl', index: 0 });
    expect(menuFor('/blog x', closed)).toEqual({ open: false });
    expect(menuFor('work', closed)).toEqual({ open: false });
  });

  it('keeps the index while the query is unchanged and resets it otherwise', () => {
    const open: MenuState = { open: true, query: 'b', index: 2 };

    expect(menuFor('/b', open)).toEqual(open);
    expect(menuFor('/bl', open)).toEqual({ open: true, query: 'bl', index: 0 });
  });

  it('wraps the selection both ways', () => {
    const open: MenuState = { open: true, query: '', index: 0 };

    expect(moveIndex(open, -1, 3)).toMatchObject({ index: 2 });
    expect(moveIndex({ ...open, index: 2 }, 1, 3)).toMatchObject({ index: 0 });
    expect(moveIndex({ open: false }, 1, 3)).toEqual({ open: false });
  });
});

describe('blog command', () => {
  it('lists posts with no args', () => {
    const blocks = run('/blog');

    expect(blocks[0]).toMatchObject({ kind: 'tool', call: 'Glob(content/blog/*.md)' });
    expect(blocks[1]).toMatchObject({ kind: 'posts' });
  });

  it('renders a post as markdown', () => {
    const blocks = run('/blog hello-terminal');
    const markdown = blocks.find((block) => block.kind === 'markdown');

    expect(blocks[0]).toMatchObject({ kind: 'tool', call: 'Read(content/blog/hello-terminal.md)' });
    expect(markdown).toMatchObject({ html: expect.stringContaining('<h1>') });
  });

  it('returns an Error text naming valid slugs for a bad slug', () => {
    const [block] = run('/blog nope');

    expect(block).toMatchObject({ kind: 'text', tone: Tone.Error });
    expect(block).toMatchObject({ text: expect.stringContaining('hello-terminal') });
  });
});

describe('theme command', () => {
  it('toggles when called without args', () => {
    const setTheme = vi.fn();
    run('/theme', makeCtx({ theme: Theme.Dark, setTheme }));

    expect(setTheme).toHaveBeenCalledWith(Theme.Light);
  });

  it('sets an explicit theme', () => {
    const setTheme = vi.fn();
    run('/theme dark', makeCtx({ theme: Theme.Dark, setTheme }));

    expect(setTheme).toHaveBeenCalledWith(Theme.Dark);
  });

  it('rejects an unknown theme without changing it', () => {
    const setTheme = vi.fn();
    const [block] = run('/theme neon', makeCtx({ setTheme }));

    expect(setTheme).not.toHaveBeenCalled();
    expect(block).toMatchObject({ tone: Tone.Error });
  });
});

describe('other commands', () => {
  it('work lists every profile project', () => {
    const blocks = run('/work');

    expect(blocks[1]).toMatchObject({ kind: 'projects', items: profile.projects });
  });

  it('clear asks the context to clear', () => {
    const clear = vi.fn();
    run('/clear', makeCtx({ clear }));

    expect(clear).toHaveBeenCalledOnce();
  });

  it('help lists visible commands only', () => {
    const [, table] = run('/help');
    const keys = table?.kind === 'table' ? table.rows.map((row) => row.key) : [];

    expect(keys).toContain('/work');
    expect(keys).not.toContain('/sudo');
  });

  it('contact exposes a mailto link', () => {
    const [table] = run('/contact');
    const urls = table?.kind === 'table' ? table.rows.map((row) => row.url) : [];

    expect(urls).toContain('mailto:khacvy93@gmail.com');
  });
});

describe('execute', () => {
  it('returns an Error block naming the unknown input', () => {
    const { blocks, hash } = execute('/nope', makeCtx());

    expect(blocks).toEqual([{ kind: 'text', text: 'Unknown command: /nope. Try /help', tone: Tone.Error }]);
    expect(hash).toBeNull();
  });

  it('gives routable commands a hash and others none', () => {
    expect(execute('/blog hello-terminal', makeCtx()).hash).toBe('#/blog/hello-terminal');
    expect(execute('work', makeCtx()).hash).toBe('#/work');
    expect(execute('/help', makeCtx()).hash).toBeNull();
    expect(execute('/clear', makeCtx()).hash).toBeNull();
  });
});

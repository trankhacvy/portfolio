import { marked } from 'marked';
import {
  Theme,
  Tone,
  type Block,
  type Command,
  type Ctx,
  type MenuState,
  type Post,
  type Resolved,
} from './types';
import { toHash } from './route';

const LEADING_SLASH = /^\//;
const TOKEN_EDGE_PUNCT = /^[^\w?]+|[^\w?]+$/g;
const URL_SCHEME = /^(https?:\/\/|mailto:)/;

const CLOSED_MENU: MenuState = { open: false };

const SHORTCUTS = [
  { key: 'Enter', value: 'run the command' },
  { key: '↑ / ↓', value: 'history, or move in the slash menu' },
  { key: 'Tab', value: 'complete the selected command' },
  { key: 'Esc', value: 'close the menu, or skip the spinner' },
  { key: 'Ctrl+L', value: 'clear the screen' },
  { key: 'Ctrl+C', value: 'discard the current input' },
];

function text(value: string, tone: Tone = Tone.Normal): Block {
  return { kind: 'text', text: value, tone };
}

function isTheme(value: string | undefined): value is Theme {
  return value === Theme.Dark || value === Theme.Light;
}

function displayUrl(url: string): string {
  return url.replace(URL_SCHEME, '');
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function listSlugs(posts: Post[]): string {
  return posts.map((post) => post.slug).join(', ');
}

function runHelp(): Block[] {
  const rows = visibleCommands(COMMANDS).map((cmd) => ({
    key: `/${cmd.name}`,
    value: cmd.summary,
  }));

  return [
    text('Commands', Tone.Dim),
    { kind: 'table', rows },
    text('Shortcuts', Tone.Dim),
    { kind: 'table', rows: SHORTCUTS },
  ];
}

function runAbout(_args: string[], { profile }: Ctx): Block[] {
  return [
    text(`${profile.name} (@${profile.handle})`, Tone.Accent),
    text(`${profile.role} · ${profile.location}`, Tone.Dim),
    ...profile.bio.map((line) => text(line)),
  ];
}

function runWork(_args: string[], { profile }: Ctx): Block[] {
  return [
    {
      kind: 'tool',
      call: 'Read(content/projects.ts)',
      result: `Read ${plural(profile.projects.length, 'project')}`,
    },
    { kind: 'projects', items: profile.projects },
  ];
}

function runBlog(args: string[], { posts }: Ctx): Block[] {
  const slug = args[0]?.toLowerCase();

  if (slug === undefined) {
    return [
      {
        kind: 'tool',
        call: 'Glob(content/blog/*.md)',
        result: `Found ${plural(posts.length, 'post')}`,
      },
      { kind: 'posts', items: posts },
    ];
  }

  const post = posts.find((candidate) => candidate.slug === slug);
  if (!post) {
    return [text(`No post "${slug}". Available: ${listSlugs(posts)}`, Tone.Error)];
  }

  const html = marked.parse(`# ${post.title}\n\n${post.body}`, { async: false });
  const lines = post.body.split('\n').length;

  return [
    { kind: 'tool', call: `Read(content/blog/${post.slug}.md)`, result: `Read ${plural(lines, 'line')}` },
    text(post.date, Tone.Dim),
    { kind: 'markdown', html },
  ];
}

function runContact(_args: string[], { profile }: Ctx): Block[] {
  const rows = profile.links.map((link) => ({
    key: link.label,
    value: displayUrl(link.url),
    url: link.url,
  }));

  return [{ kind: 'table', rows }];
}

function runTheme(args: string[], ctx: Ctx): Block[] {
  const requested = args[0]?.toLowerCase();

  if (requested !== undefined && !isTheme(requested)) {
    return [text(`Unknown theme: ${requested}. Use dark or light.`, Tone.Error)];
  }

  const next = isTheme(requested)
    ? requested
    : ctx.theme === Theme.Dark
      ? Theme.Light
      : Theme.Dark;
  ctx.setTheme(next);

  return [text(`Theme: ${next}`, Tone.Dim)];
}

function runClear(_args: string[], ctx: Ctx): Block[] {
  ctx.clear();
  return [];
}

function runHireMe(_args: string[], { profile }: Ctx): Block[] {
  const email = profile.links.find((link) => link.url.startsWith('mailto:'));
  const rows = email ? [{ key: 'Email', value: displayUrl(email.url), url: email.url }] : [];

  return [text('Open to interesting work. Say hi.', Tone.Accent), { kind: 'table', rows }];
}

function runSudo(): Block[] {
  return [text('nice try. this incident will be reported.', Tone.Error)];
}

function runExit(): Block[] {
  return [text('there is no escape. try /help', Tone.Dim)];
}

export const COMMANDS: Command[] = [
  { name: 'help', aliases: ['?'], summary: 'List commands and shortcuts', run: runHelp },
  { name: 'about', aliases: ['whoami'], summary: 'Who I am', routable: true, run: runAbout },
  { name: 'work', aliases: ['projects'], summary: 'Projects I have built', routable: true, run: runWork },
  { name: 'blog', aliases: ['posts'], summary: 'Posts, or /blog <slug> to read one', routable: true, run: runBlog },
  { name: 'contact', aliases: ['links'], summary: 'Where to find me', routable: true, run: runContact },
  { name: 'theme', aliases: [], summary: 'Toggle dark or light', run: runTheme },
  { name: 'clear', aliases: ['cls'], summary: 'Clear the screen', run: runClear },
  { name: 'hire-me', aliases: [], summary: '', hidden: true, run: runHireMe },
  { name: 'sudo', aliases: [], summary: '', hidden: true, run: runSudo },
  { name: 'exit', aliases: ['quit'], summary: '', hidden: true, run: runExit },
];

/** Plain-text words that map to a command, for input typed without a slash. */
const KEYWORDS: Record<string, string> = {
  projects: 'work',
  project: 'work',
  work: 'work',
  portfolio: 'work',
  blog: 'blog',
  posts: 'blog',
  writing: 'blog',
  contact: 'contact',
  email: 'contact',
  hire: 'contact',
  who: 'about',
  about: 'about',
  help: 'help',
  '?': 'help',
};

export function visibleCommands(registry: Command[]): Command[] {
  return registry.filter((cmd) => !cmd.hidden);
}

function findCommand(word: string, registry: Command[]): Command | undefined {
  return registry.find((cmd) => cmd.name === word || cmd.aliases.includes(word));
}

function findByKeyword(tokens: string[], registry: Command[]): Command | undefined {
  for (const token of tokens) {
    const name = KEYWORDS[token.replace(TOKEN_EDGE_PUNCT, '')];
    const command = name === undefined ? undefined : findCommand(name, registry);
    if (command) return command;
  }

  return undefined;
}

export function resolve(input: string, registry: Command[]): Resolved {
  const trimmed = input.trim();
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const head = (tokens[0] ?? '').replace(LEADING_SLASH, '');

  const exact = findCommand(head, registry);
  if (exact) return { command: exact, args: tokens.slice(1) };

  const isSlashInput = trimmed.startsWith('/');
  const fuzzy = isSlashInput ? undefined : findByKeyword(tokens, registry);
  if (fuzzy) return { command: fuzzy, args: [] };

  return { unknown: trimmed };
}

export function filterMenu(query: string, registry: Command[]): Command[] {
  const needle = query.toLowerCase().replace(LEADING_SLASH, '');
  const visible = visibleCommands(registry);
  if (needle === '') return visible;

  const words = (cmd: Command) => [cmd.name, ...cmd.aliases];
  const prefix = visible.filter((cmd) => words(cmd).some((word) => word.startsWith(needle)));
  const rest = visible.filter((cmd) => !prefix.includes(cmd));
  const substring = rest.filter((cmd) => words(cmd).some((word) => word.includes(needle)));

  return [...prefix, ...substring];
}

export function menuFor(input: string, prev: MenuState): MenuState {
  if (!input.startsWith('/') || /\s/.test(input)) return CLOSED_MENU;

  const query = input.slice(1);
  const index = prev.open && prev.query === query ? prev.index : 0;

  return { open: true, query, index };
}

export function moveIndex(state: MenuState, delta: number, count: number): MenuState {
  if (!state.open || count === 0) return state;

  const index = (state.index + delta + count) % count;
  return { ...state, index };
}

export type Execution = { blocks: Block[]; hash: string | null };

export function execute(input: string, ctx: Ctx, registry: Command[] = COMMANDS): Execution {
  const resolved = resolve(input, registry);

  if ('unknown' in resolved) {
    return { blocks: [text(`Unknown command: ${resolved.unknown}. Try /help`, Tone.Error)], hash: null };
  }

  const { command, args } = resolved;
  const blocks = command.run(args, ctx);
  const hash = command.routable ? toHash(command.name, args) : null;

  return { blocks, hash };
}

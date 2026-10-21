import './style.css';
import { profile } from '../content/profile';
import { COMMANDS, execute, filterMenu, menuFor, moveIndex } from './commands';
import { loadPosts } from './content';
import { MENU_ID_PREFIX, renderBlock, renderMenu } from './render';
import { hashToInput } from './route';
import { startSpinner, type Spinner } from './spinner';
import { Theme, Tone, type Block, type Ctx, type MenuState } from './types';

const Pace = { Animated: 'animated', Instant: 'instant' } as const;
type Pace = (typeof Pace)[keyof typeof Pace];

const THEME_KEY = 'theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#141413', light: '#faf9f5' };
const SUGGESTION = 'Try /about, /work, /blog';
const CTRL_C_ECHO = '^C';
const FINE_POINTER = '(pointer: fine)';

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);

  return node as T;
}

const transcript = byId('transcript');
const input = byId<HTMLInputElement>('cmd');
const menuEl = byId('menu');
const menuHint = byId('hint-menu');

const posts = loadPosts();
const history: string[] = [];
let historyAt = 0;
let draft = '';
let menu: MenuState = { open: false };
let spinner: Spinner | null = null;
let busy = false;
let refocus = false;
let welcomeTurn: HTMLElement;

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === Theme.Light ? Theme.Light : Theme.Dark;
  } catch {
    return Theme.Dark;
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

const ctx: Ctx = {
  profile,
  posts,
  theme: readTheme(),
  setTheme(theme) {
    ctx.theme = theme;
    applyTheme(theme);

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage can be blocked; the theme still applies for this session
    }
  },
  clear() {
    for (const turn of [...transcript.children]) {
      if (turn !== welcomeTurn) turn.remove();
    }
  },
};

function scrollToEnd(): void {
  requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

function appendTurn(blocks: Block[]): HTMLElement {
  const turn = document.createElement('section');
  turn.className = 'turn';
  turn.append(...blocks.map(renderBlock));
  transcript.append(turn);
  scrollToEnd();

  return turn;
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function think(turn: HTMLElement): Promise<void> {
  return new Promise((done) => {
    spinner = startSpinner(turn, done);
  });
}

function enterBusy(): void {
  refocus = document.activeElement === input;
  busy = true;
  input.readOnly = true;
  transcript.setAttribute('aria-busy', 'true');
}

function leaveBusy(): void {
  busy = false;
  spinner = null;
  input.readOnly = false;
  transcript.setAttribute('aria-busy', 'false');

  if (refocus || window.matchMedia(FINE_POINTER).matches) input.focus({ preventScroll: true });
}

function syncMenu(): void {
  const open = menu.open;
  const commands = menu.open ? filterMenu(menu.query, COMMANDS) : [];
  const visible = open && commands.length > 0;
  const index = menu.open ? Math.min(menu.index, Math.max(commands.length - 1, 0)) : 0;

  menuEl.hidden = !visible;
  menuHint.hidden = !visible;
  input.setAttribute('aria-expanded', String(visible));

  if (!visible) {
    input.removeAttribute('aria-activedescendant');
    return;
  }

  menu = { open: true, query: menu.open ? menu.query : '', index };
  renderMenu(menuEl, commands, index);
  input.setAttribute('aria-activedescendant', `${MENU_ID_PREFIX}${index}`);
  menuEl.scrollIntoView({ block: 'nearest' });
}

function closeMenu(): void {
  menu = { open: false };
  syncMenu();
}

function selectedName(): string | null {
  if (!menu.open) return null;

  return filterMenu(menu.query, COMMANDS)[menu.index]?.name ?? null;
}

async function runInput(raw: string, pace: Pace): Promise<void> {
  const text = raw.trim();
  if (busy || text === '') return;

  if (history[history.length - 1] !== text) history.push(text);
  historyAt = history.length;
  draft = '';
  input.value = '';
  closeMenu();

  const turn = appendTurn([{ kind: 'echo', input: text }]);
  enterBusy();

  if (pace === Pace.Animated && !reducedMotion()) await think(turn);

  const { blocks, hash } = execute(text, ctx);
  if (hash) window.history.replaceState(null, '', hash);

  turn.append(...blocks.map(renderBlock));
  leaveBusy();
  scrollToEnd();
}

function completeSelected(): void {
  const name = selectedName();
  if (name === null) return;

  input.value = `/${name} `;
  closeMenu();
}

function recallHistory(delta: number): void {
  const next = historyAt + delta;
  if (next < 0 || next > history.length) return;

  if (historyAt === history.length) draft = input.value;
  historyAt = next;
  input.value = next === history.length ? draft : (history[next] ?? '');
  input.setSelectionRange(input.value.length, input.value.length);
  closeMenu();
}

function discardInput(): void {
  appendTurn([{ kind: 'echo', input: `${input.value}${CTRL_C_ECHO}` }]);
  input.value = '';
  closeMenu();
}

function hasSelection(): boolean {
  return (window.getSelection()?.toString() ?? '') !== '';
}

function onInputKey(event: KeyboardEvent): void {
  if (busy) {
    event.preventDefault();
    return;
  }

  const key = event.key;
  const ctrl = event.ctrlKey && !event.metaKey && !event.altKey;

  if (ctrl && key === 'c' && !hasSelection()) {
    event.preventDefault();
    discardInput();
    return;
  }

  if (key === 'Enter') {
    event.preventDefault();
    const name = selectedName();
    void runInput(name === null ? input.value : `/${name}`, Pace.Animated);
    return;
  }

  if (key === 'Tab' && menu.open && selectedName() !== null) {
    event.preventDefault();
    completeSelected();
    return;
  }

  if (key === 'Escape' && menu.open) {
    event.preventDefault();
    closeMenu();
    return;
  }

  if (key !== 'ArrowUp' && key !== 'ArrowDown') return;

  event.preventDefault();
  const delta = key === 'ArrowUp' ? -1 : 1;

  if (!menu.open) {
    recallHistory(delta);
    return;
  }

  const count = filterMenu(menu.query, COMMANDS).length;
  menu = moveIndex(menu, delta, count);
  syncMenu();
}

function onDocumentKey(event: KeyboardEvent): void {
  if (busy && event.key === 'Escape') {
    spinner?.skip();
    return;
  }

  const isClear = event.ctrlKey && !event.metaKey && event.key === 'l';
  if (!isClear || busy) return;

  event.preventDefault();
  ctx.clear();
  scrollToEnd();
}

function onClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const runner = target.closest<HTMLElement>('[data-run]');
  if (runner?.dataset.run) {
    event.preventDefault();
    void runInput(runner.dataset.run, Pace.Animated);
    return;
  }

  const row = target.closest<HTMLElement>('.menu-row');
  if (row?.dataset.name) {
    void runInput(`/${row.dataset.name}`, Pace.Animated);
    return;
  }

  if (busy || hasSelection() || target.closest('a, button, input')) return;

  input.focus({ preventScroll: true });
}

function runHash(pace: Pace): boolean {
  const route = hashToInput(window.location.hash);
  if (route === null) return false;

  void runInput(route, pace);

  return true;
}

function boot(): void {
  applyTheme(ctx.theme);
  welcomeTurn = appendTurn([{ kind: 'welcome' }]);
  input.focus({ preventScroll: true });

  input.addEventListener('keydown', onInputKey);
  input.addEventListener('input', () => {
    menu = menuFor(input.value, menu);
    syncMenu();
  });
  document.addEventListener('keydown', onDocumentKey);
  document.addEventListener('click', onClick);
  menuEl.addEventListener('mousedown', (event) => event.preventDefault());
  window.addEventListener('hashchange', () => runHash(Pace.Animated));

  if (runHash(Pace.Instant)) return;

  appendTurn([{ kind: 'text', text: SUGGESTION, tone: Tone.Dim }]);
}

boot();

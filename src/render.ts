import { Tone, type Block, type Command, type Post, type Project } from './types';

type Renderers = { [K in Block['kind']]: (block: Extract<Block, { kind: K }>) => HTMLElement };

const EXTERNAL_URL = /^https?:\/\//;
const STAR = '★';
const SEPARATOR = ' · ';
const ELBOW = '  ⎿  ';
const TOOL_DOT = '⏺';
const WELCOME_GLYPH = '✻';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;

  return node;
}

function link(label: string, url: string, className = ''): HTMLAnchorElement {
  const anchor = el('a', className, label);
  anchor.href = url;
  if (!EXTERNAL_URL.test(url)) return anchor;

  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';

  return anchor;
}

function runLink(label: string, input: string, hash: string): HTMLAnchorElement {
  const anchor = link(label, hash);
  anchor.dataset.run = input;

  return anchor;
}

function renderEcho({ input }: { input: string }): HTMLElement {
  const line = el('div', 'echo');
  line.append(el('span', 'echo-glyph', '> '), input);

  return line;
}

function renderTool({ call, result }: { call: string; result: string }): HTMLElement {
  const parenAt = call.indexOf('(');
  const name = parenAt === -1 ? call : call.slice(0, parenAt);
  const args = parenAt === -1 ? '' : call.slice(parenAt);

  const head = el('div', 'tool-call');
  head.append(el('span', 'tool-dot', TOOL_DOT), ' ', el('strong', '', name), args);

  const tail = el('div', 'tool-result');
  tail.append(el('span', 'tool-elbow', ELBOW), result);

  const block = el('div', 'tool');
  block.append(head, tail);

  return block;
}

function renderText({ text, tone = Tone.Normal }: { text: string; tone?: Tone }): HTMLElement {
  return el('div', `text tone-${tone}`, text);
}

function renderTable({ rows }: { rows: { key: string; value: string; url?: string }[] }): HTMLElement {
  const list = el('dl', 'table');

  for (const row of rows) {
    const value = el('dd');
    value.append(row.url ? link(row.value, row.url) : row.value);
    list.append(el('dt', '', row.key), value);
  }

  return list;
}

function projectMeta(project: Project): HTMLElement {
  const stars = project.stars > 0 ? `${SEPARATOR}${STAR}${project.stars}` : '';
  const meta = el('span', 'dim', `${SEPARATOR}${project.lang}${stars}`);
  if (!project.demo) return meta;

  meta.append(SEPARATOR, link('demo', project.demo));

  return meta;
}

function renderProject(project: Project): HTMLElement {
  const head = el('div', 'project-head');
  head.append(link(project.name, project.url, 'project-name'), projectMeta(project));

  const item = el('div', 'project');
  item.append(head, el('div', 'project-blurb', project.blurb));

  return item;
}

function renderProjects({ items }: { items: Project[] }): HTMLElement {
  const list = el('div', 'projects');
  list.append(...items.map(renderProject));

  return list;
}

function renderPost(post: Post): HTMLElement {
  const hash = `#/blog/${encodeURIComponent(post.slug)}`;

  const head = el('div', 'post-head');
  head.append(el('span', 'dim', post.date), '  ', runLink(post.title, `blog ${post.slug}`, hash));

  const hint = el('div', 'post-hint dim');
  hint.append(runLink(`/blog ${post.slug}`, `blog ${post.slug}`, hash));

  const item = el('div', 'post');
  item.append(head, el('div', 'post-summary dim', post.summary), hint);

  return item;
}

function renderPosts({ items }: { items: Post[] }): HTMLElement {
  const list = el('div', 'posts');
  list.append(...items.map(renderPost));

  return list;
}

function renderMarkdown({ html }: { html: string }): HTMLElement {
  const body = el('div', 'markdown');
  body.innerHTML = html;

  return body;
}

function renderWelcome(): HTMLElement {
  const title = el('div', 'welcome-title');
  title.append(el('span', 'accent', WELCOME_GLYPH), " Welcome to Vy's terminal!");

  const gap = el('div', 'welcome-gap');
  gap.setAttribute('aria-hidden', 'true');

  const box = el('div', 'welcome');
  box.append(title, gap, el('div', 'dim', '/help for commands, or just type'), el('div', 'dim', 'cwd: ~/khacvy'));

  return box;
}

const RENDERERS: Renderers = {
  echo: renderEcho,
  tool: renderTool,
  text: renderText,
  table: renderTable,
  projects: renderProjects,
  posts: renderPosts,
  markdown: renderMarkdown,
  welcome: renderWelcome,
};

export function renderBlock(block: Block): HTMLElement {
  const render = RENDERERS[block.kind] as (block: Block) => HTMLElement;
  return render(block);
}

export const MENU_ID_PREFIX = 'menu-option-';

export function renderMenu(menu: HTMLElement, commands: Command[], selected: number): void {
  const rows = commands.map((cmd, i) => {
    const row = el('div', 'menu-row');
    row.id = `${MENU_ID_PREFIX}${i}`;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(i === selected));
    row.dataset.name = cmd.name;
    row.append(el('span', 'menu-name', `/${cmd.name}`), el('span', 'menu-summary', cmd.summary));

    return row;
  });

  menu.replaceChildren(...rows);
}

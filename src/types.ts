export const Tone = {
  Normal: 'normal',
  Dim: 'dim',
  Accent: 'accent',
  Error: 'error',
} as const;
export type Tone = (typeof Tone)[keyof typeof Tone];

export const Theme = {
  Dark: 'dark',
  Light: 'light',
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

export type Link = { label: string; url: string };

export type Project = {
  name: string;
  blurb: string;
  lang: string;
  stars: number;
  url: string;
  demo?: string;
};

export type Profile = {
  name: string;
  handle: string;
  role: string;
  location: string;
  bio: string[];
  links: Link[];
  projects: Project[];
};

export type Post = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body: string;
};

export type TableRow = { key: string; value: string; url?: string };

export type Block =
  | { kind: 'echo'; input: string }
  | { kind: 'tool'; call: string; result: string }
  | { kind: 'text'; text: string; tone?: Tone }
  | { kind: 'table'; rows: TableRow[] }
  | { kind: 'projects'; items: Project[] }
  | { kind: 'posts'; items: Post[] }
  | { kind: 'markdown'; html: string }
  | { kind: 'welcome' };

export type Ctx = {
  profile: Profile;
  posts: Post[];
  theme: Theme;
  setTheme(t: Theme): void;
  clear(): void;
};

export type Command = {
  name: string;
  aliases: string[];
  summary: string;
  hidden?: boolean;
  /** Running it rewrites the URL hash so the view is deep-linkable. */
  routable?: boolean;
  run: (args: string[], ctx: Ctx) => Block[];
};

export type Resolved =
  | { command: Command; args: string[] }
  | { unknown: string };

export type MenuState =
  | { open: false }
  | { open: true; query: string; index: number };

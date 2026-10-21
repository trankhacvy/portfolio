// TODO(owner): review the bio below. It is built only from public GitHub facts.
import type { Profile } from '../src/types';

export const profile: Profile = {
  name: 'Khac Vy',
  handle: 'trankhacvy',
  role: 'Software engineer at Dwarves Foundation',
  location: 'Vietnam',
  bio: [
    'Make Code Not War. A vibe coder, based in Vietnam.',
    'Builds on Solana. TypeScript most of the time, some Rust and Dart.',
    'Lately building tools around coding agents, like kvy-cli: run Claude Code and Codex locally, control them from anywhere.',
  ],
  links: [
    { label: 'GitHub', url: 'https://github.com/trankhacvy' },
    { label: 'X', url: 'https://x.com/trankhac_vy' },
    { label: 'Substack', url: 'https://khacvy.substack.com' },
    { label: 'Email', url: 'mailto:khacvy93@gmail.com' },
  ],
  projects: [
    {
      name: 'kvy-cli',
      lang: 'TypeScript',
      stars: 0,
      url: 'https://github.com/trankhacvy/kvy-cli',
      blurb: 'Run Claude Code and Codex locally, control them from anywhere.',
    },
    {
      name: 'solana-nextjs-starter',
      lang: 'TypeScript',
      stars: 24,
      url: 'https://github.com/trankhacvy/solana-nextjs-starter',
      demo: 'https://solnext.vercel.app',
      blurb: 'Solana + Next.js boilerplate for building scalable web apps.',
    },
    {
      name: 'cnft-tools',
      lang: 'TypeScript',
      stars: 15,
      url: 'https://github.com/trankhacvy/cnft-tools',
      demo: 'https://cnft-tools.vercel.app',
      blurb: 'No-code tools to interact with Compressed NFTs.',
    },
    {
      name: 'takeaway-ui',
      lang: 'TypeScript',
      stars: 16,
      url: 'https://github.com/trankhacvy/takeaway-ui',
      demo: 'https://takeaway-ui.vercel.app',
      blurb: 'UI component experiments.',
    },
    {
      name: 'underlords-guide',
      lang: 'Dart',
      stars: 19,
      url: 'https://github.com/trankhacvy/underlords-guide',
      blurb: 'Unofficial guide app for Dota Underlords.',
    },
    {
      name: 'solactions',
      lang: 'TypeScript',
      stars: 2,
      url: 'https://github.com/trankhacvy/solactions',
      demo: 'https://solactions-mu.vercel.app',
      blurb: 'Solana Actions experiments.',
    },
    {
      name: 'oh-my-snake',
      lang: 'Rust',
      stars: 2,
      url: 'https://github.com/trankhacvy/oh-my-snake',
      blurb: 'Snake game written with the Bevy engine.',
    },
  ],
};

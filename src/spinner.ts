const FRAMES = ['·', '✢', '✳', '✶', '✻', '✽'];
const VERBS = ['Reading', 'Grepping', 'Pondering', 'Compiling', 'Vibing'];
const FRAME_MS = 120;
const THINK_MS = 350;

let verbIndex = 0;

export type Spinner = { skip(): void };

export function startSpinner(parent: HTMLElement, onDone: () => void): Spinner {
  const verb = VERBS[verbIndex++ % VERBS.length];
  const glyph = document.createElement('span');
  const line = document.createElement('div');
  let frame = 0;
  let finished = false;

  line.className = 'spinner';
  line.setAttribute('aria-hidden', 'true');
  line.append(glyph, ` ${verb}…`);
  glyph.textContent = FRAMES[0] ?? '';
  parent.append(line);

  const ticker = setInterval(() => {
    frame = (frame + 1) % FRAMES.length;
    glyph.textContent = FRAMES[frame] ?? '';
  }, FRAME_MS);

  function finish(): void {
    if (finished) return;
    finished = true;

    clearInterval(ticker);
    clearTimeout(timer);
    line.remove();
    onDone();
  }

  const timer = setTimeout(finish, THINK_MS);

  return { skip: finish };
}

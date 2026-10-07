// @vitest-environment node
/**
 * lane:platform (PLAT-001 to PLAT-003; 0.5 design §14) — the web platform against faked browser globals (window,
 * document, navigator; each test stubs its own and they are restored after it), and two static scans of src: only
 * src/platform calls the Notification, clipboard and share APIs, and src/platform makes no runtime import from
 * persistence, sim, state or ui.
 */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { createWebPlatform, APP_ICON, NOTIFICATION_CLICK, type PlatformNotification } from '@/platform';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const PLATFORM_DIR = join(SRC, 'platform');

const note = (over: Partial<PlatformNotification> = {}): PlatformNotification => ({
  id: 'n1',
  title: 'Prismatic betta in the shop',
  body: 'Coral Reef Supply just stocked a Prismatic Halfmoon. It leaves in 2 h.',
  route: '/shop/fish/offer_k3x9',
  category: 'rare',
  ...over,
});

/** A Notification constructor double with its own record: what was constructed and how often permission was asked. */
function notificationApi(permission: NotificationPermission, opts: { answer?: NotificationPermission; throws?: boolean } = {}) {
  const made: { title: string; options: NotificationOptions; onclick: ((ev: Event) => unknown) | null; closed: boolean }[] = [];
  let asks = 0;
  class FakeNotification {
    static permission = permission;
    static async requestPermission() {
      asks++;
      FakeNotification.permission = opts.answer ?? 'granted';
      return FakeNotification.permission;
    }
    onclick: ((ev: Event) => unknown) | null = null;
    closed = false;
    constructor(
      readonly title: string,
      readonly options: NotificationOptions = {},
    ) {
      if (opts.throws) throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
      made.push(this);
    }
    close() {
      this.closed = true;
    }
  }
  return { Api: FakeNotification, made, asks: () => asks };
}

/** An element the copy fallback can use; `selected` says whether the copy would take its text. */
class FakeTextarea {
  value = '';
  style: Record<string, string> = {};
  attrs: Record<string, string> = {};
  selected = false;
  setAttribute(k: string, v: string) {
    this.attrs[k] = v;
  }
  select() {
    this.selected = true;
  }
  setSelectionRange() {
    this.selected = true;
  }
}

/** document: an EventTarget with a visibility state, a body, and an execCommand('copy') that copies the selection. */
function fakeDocument(opts: { visibility?: DocumentVisibilityState; copy?: 'refused' | 'throws' } = {}) {
  const children: FakeTextarea[] = [];
  const copies: string[] = [];
  const button = {
    focused: 0,
    focus() {
      this.focused++;
    },
  };
  const d = Object.assign(new EventTarget(), {
    visibilityState: opts.visibility ?? ('visible' as DocumentVisibilityState),
    activeElement: button,
    body: {
      appendChild: (n: FakeTextarea) => (children.push(n), n),
      removeChild: (n: FakeTextarea) => (children.splice(children.indexOf(n), 1), n),
    },
    createElement: vi.fn(() => new FakeTextarea()),
    execCommand: vi.fn((cmd: string) => {
      if (opts.copy === 'throws') throw new Error('SecurityError');
      const area = children.find((c) => c.selected);
      if (cmd !== 'copy' || opts.copy === 'refused' || !area) return false;
      copies.push(area.value);
      return true;
    }),
  });
  return { doc: d, children, copies, button };
}

/** A service-worker container with a registration (or none) and a message channel. */
function fakeServiceWorker(reg: { showNotification: (title: string, options?: NotificationOptions) => Promise<void> } | undefined) {
  return Object.assign(new EventTarget(), { getRegistration: vi.fn(async () => reg) });
}

/** Install window, document and navigator for one test (restored by vi.unstubAllGlobals after it). */
function browser(opts: { Notification?: unknown; navigator?: object; document?: object } = {}) {
  const win = Object.assign(new EventTarget(), { focus: vi.fn() }, 'Notification' in opts ? { Notification: opts.Notification } : {});
  const doc = opts.document ?? fakeDocument().doc;
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('navigator', opts.navigator ?? {});
  return { win };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PLAT-002: web notifications', () => {
  it('outside a browser (no window at all) everything is unsupported and nothing breaks', async () => {
    const p = createWebPlatform();
    expect(p.kind).toBe('web');
    expect(p.notifications.permission()).toBe('unsupported');
    expect(await p.notifications.request()).toBe('unsupported');
    expect(await p.notifications.show(note())).toBe(false);
    expect(await p.clipboard.write('x')).toBe(false);
    p.notifications.onOpen(() => undefined)();
    p.lifecycle.onPause(() => undefined)();
    p.lifecycle.onResume(() => undefined)();
  });

  it('without window.Notification: permission() is "unsupported" and show() resolves false', async () => {
    browser();
    const p = createWebPlatform();
    expect(p.notifications.permission()).toBe('unsupported');
    expect(await p.notifications.show(note())).toBe(false);
    expect(await p.notifications.request()).toBe('unsupported');
  });

  it('maps Notification.permission', () => {
    for (const permission of ['default', 'granted', 'denied'] as NotificationPermission[]) {
      browser({ Notification: notificationApi(permission).Api });
      expect(createWebPlatform().notifications.permission()).toBe(permission);
    }
  });

  it.each(['default', 'denied'] as NotificationPermission[])('with permission "%s", show() resolves false and creates nothing', async (permission) => {
    const api = notificationApi(permission);
    const showNotification = vi.fn(async () => undefined);
    const sw = fakeServiceWorker({ showNotification });
    browser({ Notification: api.Api, navigator: { serviceWorker: sw } });
    const p = createWebPlatform();
    expect(await p.notifications.show(note())).toBe(false);
    expect(api.made).toEqual([]);
    expect(showNotification).not.toHaveBeenCalled();
    expect(sw.getRegistration).not.toHaveBeenCalled();
  });

  it('asks for permission only when request() is called: creating, reading, showing and subscribing never ask', async () => {
    const api = notificationApi('default', { answer: 'granted' });
    browser({ Notification: api.Api, navigator: { serviceWorker: fakeServiceWorker(undefined) } });
    const p = createWebPlatform();
    p.notifications.permission();
    await p.notifications.show(note());
    p.notifications.onOpen(() => undefined);
    expect(api.asks()).toBe(0);
    expect(await p.notifications.request()).toBe('granted');
    expect(api.asks()).toBe(1);
    expect(p.notifications.permission()).toBe('granted');

    const refusing = notificationApi('default', { answer: 'denied' });
    browser({ Notification: refusing.Api });
    expect(await createWebPlatform().notifications.request()).toBe('denied');
  });

  it.each<[string, object]>([
    ['no service-worker support', {}],
    ['no registration', { serviceWorker: fakeServiceWorker(undefined) }],
  ])('granted with %s: one Notification tagged with the category, and its click reaches every onOpen subscriber', async (_, nav) => {
    const api = notificationApi('granted');
    const { win } = browser({ Notification: api.Api, navigator: nav });
    const p = createWebPlatform();
    const a: (string | null)[] = [];
    const b: (string | null)[] = [];
    const gone: (string | null)[] = [];
    p.notifications.onOpen((r) => a.push(r));
    p.notifications.onOpen((r) => b.push(r));
    p.notifications.onOpen((r) => gone.push(r))();

    expect(await p.notifications.show(note())).toBe(true);
    expect(api.made).toHaveLength(1);
    const shown = api.made[0];
    expect(shown.title).toBe('Prismatic betta in the shop');
    expect(shown.options).toEqual({ body: note().body, tag: 'rare', icon: APP_ICON, data: { route: '/shop/fish/offer_k3x9' } });

    shown.onclick?.(new Event('click'));
    expect(a).toEqual(['/shop/fish/offer_k3x9']);
    expect(b).toEqual(['/shop/fish/offer_k3x9']);
    expect(gone).toEqual([]);
    expect(win.focus).toHaveBeenCalledTimes(1);
    expect(shown.closed).toBe(true);
  });

  it('a notification without a route opens with null; one subscriber that throws does not stop the others', async () => {
    const api = notificationApi('granted');
    browser({ Notification: api.Api });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const p = createWebPlatform();
    const heard: (string | null)[] = [];
    p.notifications.onOpen(() => {
      throw new Error('handler bug');
    });
    p.notifications.onOpen((r) => heard.push(r));
    expect(await p.notifications.show(note({ route: null, category: 'test', title: 'Test notification' }))).toBe(true);
    expect(api.made[0].options.tag).toBe('test');
    api.made[0].onclick?.(new Event('click'));
    expect(heard).toEqual([null]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('granted with a service-worker registration: shows through it, and its click messages reach onOpen', async () => {
    const api = notificationApi('granted');
    const showNotification = vi.fn(async (_title: string, _options?: NotificationOptions) => undefined);
    const sw = fakeServiceWorker({ showNotification });
    browser({ Notification: api.Api, navigator: { serviceWorker: sw } });
    const p = createWebPlatform();

    expect(await p.notifications.show(note({ category: 'market', route: '/market/listings/l7' }))).toBe(true);
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Prismatic betta in the shop', {
      body: note().body,
      tag: 'market',
      icon: APP_ICON,
      data: { route: '/market/listings/l7' },
    });
    expect(api.made).toEqual([]);

    const heard: (string | null)[] = [];
    const off = p.notifications.onOpen((r) => heard.push(r));
    const message = (data: unknown) => sw.dispatchEvent(new MessageEvent('message', { data }));
    message({ type: NOTIFICATION_CLICK, route: '/market/listings/l7' });
    message({ type: NOTIFICATION_CLICK });
    message({ route: '/shop' }); // not a notification click
    message('reload');
    expect(heard).toEqual(['/market/listings/l7', null]);
    off();
    message({ type: NOTIFICATION_CLICK, route: '/shop' });
    expect(heard).toEqual(['/market/listings/l7', null]);
  });

  it('falls back to a Notification when the worker refuses; resolves false when both ways fail', async () => {
    const api = notificationApi('granted');
    const refuse = vi.fn(async () => {
      throw new TypeError('No active registration available on the ServiceWorkerRegistration.');
    });
    browser({ Notification: api.Api, navigator: { serviceWorker: fakeServiceWorker({ showNotification: refuse }) } });
    expect(await createWebPlatform().notifications.show(note())).toBe(true);
    expect(refuse).toHaveBeenCalledTimes(1);
    expect(api.made).toHaveLength(1);

    // Android Chrome: no worker registered and the constructor is illegal.
    const illegal = notificationApi('granted', { throws: true });
    browser({ Notification: illegal.Api, navigator: { serviceWorker: fakeServiceWorker(undefined) } });
    expect(await createWebPlatform().notifications.show(note())).toBe(false);
  });

  it('schedule and cancelAll are undefined on the web', () => {
    const p = createWebPlatform();
    expect(p.notifications.schedule).toBeUndefined();
    expect(p.notifications.cancelAll).toBeUndefined();
  });

  it('the notification icon is the favicon the repo ships, under the base path', async () => {
    expect(APP_ICON).toBe(`${import.meta.env.BASE_URL}favicon.svg`);
    expect(await readFile(join(ROOT, 'public', 'favicon.svg'), 'utf8')).toContain('<svg');
  });
});

describe('PLAT-003: clipboard, share, lifecycle and storage on the web', () => {
  it('clipboard.write resolves true through navigator.clipboard.writeText, without touching the page', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    const page = fakeDocument();
    browser({ navigator: { clipboard: { writeText } }, document: page.doc });
    expect(await createWebPlatform().clipboard.write('https://example.test/#/shop/fish/offer_k3x9')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://example.test/#/shop/fish/offer_k3x9');
    expect(page.doc.execCommand).not.toHaveBeenCalled();
  });

  it.each<[string, object]>([
    ['writeText rejects', { clipboard: { writeText: async () => Promise.reject(new Error('NotAllowedError')) } }],
    ['there is no navigator.clipboard', {}],
  ])('when %s, it copies from a hidden textarea, then removes it and gives focus back', async (_, nav) => {
    const page = fakeDocument();
    browser({ navigator: nav, document: page.doc });
    expect(await createWebPlatform().clipboard.write('copy me')).toBe(true);
    expect(page.doc.execCommand).toHaveBeenCalledWith('copy');
    expect(page.copies).toEqual(['copy me']);
    expect(page.children).toEqual([]);
    expect(page.button.focused).toBe(1);
  });

  it.each(['refused', 'throws'] as const)('resolves false when writeText rejects and the fallback copy %s', async (copy) => {
    const page = fakeDocument({ copy });
    const writeText = vi.fn(async () => Promise.reject(new Error('NotAllowedError')));
    browser({ navigator: { clipboard: { writeText } }, document: page.doc });
    expect(await createWebPlatform().clipboard.write('copy me')).toBe(false);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(page.doc.execCommand).toHaveBeenCalledTimes(1);
    expect(page.children).toEqual([]);
  });

  it('share exists only when navigator.share does; true when shared, false when cancelled', async () => {
    browser();
    expect(createWebPlatform().share).toBeUndefined();

    const share = vi.fn(async (_data?: ShareData) => undefined);
    const nav = { share };
    browser({ navigator: nav });
    const p = createWebPlatform();
    expect(p.share).toBeTypeOf('function');
    expect(await p.share!({ title: 'Prismatic Halfmoon', url: 'https://example.test/#/shop/fish/offer_k3x9' })).toBe(true);
    expect(share).toHaveBeenCalledWith({ title: 'Prismatic Halfmoon', url: 'https://example.test/#/shop/fish/offer_k3x9' });
    expect(share.mock.contexts[0]).toBe(nav); // called as a method (a detached navigator.share throws)

    share.mockRejectedValueOnce(new DOMException('Share canceled', 'AbortError'));
    expect(await p.share!({ title: 'x', url: 'https://example.test/' })).toBe(false);
  });

  it('onPause fires on visibilitychange to hidden and on pagehide; onResume on visible and on pageshow', () => {
    const page = fakeDocument();
    const { win } = browser({ document: page.doc });
    const p = createWebPlatform();
    const calls: string[] = [];
    p.lifecycle.onPause(() => calls.push('pause'));
    p.lifecycle.onResume(() => calls.push('resume'));
    const visibility = (state: DocumentVisibilityState) => {
      page.doc.visibilityState = state;
      page.doc.dispatchEvent(new Event('visibilitychange'));
    };

    visibility('hidden');
    visibility('visible');
    expect(calls).toEqual(['pause', 'resume']);
    win.dispatchEvent(new Event('pagehide'));
    win.dispatchEvent(new Event('pageshow'));
    expect(calls).toEqual(['pause', 'resume', 'pause', 'resume']);
  });

  it('one pause per trip away and one resume per return (closing fires hidden and pagehide; first load fires pageshow)', () => {
    const page = fakeDocument();
    const { win } = browser({ document: page.doc });
    const p = createWebPlatform();
    const calls: string[] = [];
    p.lifecycle.onPause(() => calls.push('pause'));
    p.lifecycle.onResume(() => calls.push('resume'));

    win.dispatchEvent(new Event('pageshow')); // the first load: nothing to resume from
    page.doc.visibilityState = 'hidden';
    page.doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pagehide'));
    win.dispatchEvent(new Event('pageshow')); // back from the back/forward cache
    page.doc.visibilityState = 'visible';
    page.doc.dispatchEvent(new Event('visibilitychange'));
    expect(calls).toEqual(['pause', 'resume']);

    // Subscribed while hidden: the first thing it can hear is the return.
    const late = createWebPlatform();
    page.doc.visibilityState = 'hidden';
    const lateCalls: string[] = [];
    late.lifecycle.onPause(() => lateCalls.push('pause'));
    late.lifecycle.onResume(() => lateCalls.push('resume'));
    win.dispatchEvent(new Event('pagehide'));
    page.doc.visibilityState = 'visible';
    page.doc.dispatchEvent(new Event('visibilitychange'));
    expect(lateCalls).toEqual(['resume']);
  });

  it('onPause and onResume return functions that unsubscribe and remove their listeners', () => {
    const page = fakeDocument();
    const { win } = browser({ document: page.doc });
    const targets = [page.doc, win].map((t) => ({ add: vi.spyOn(t, 'addEventListener'), remove: vi.spyOn(t, 'removeEventListener') }));
    const p = createWebPlatform();
    const calls: string[] = [];
    const offPause = p.lifecycle.onPause(() => calls.push('pause'));
    const offResume = p.lifecycle.onResume(() => calls.push('resume'));
    offPause();
    offResume();
    page.doc.visibilityState = 'hidden';
    page.doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pagehide'));
    page.doc.visibilityState = 'visible';
    page.doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('pageshow'));
    expect(calls).toEqual([]);
    // Every listener added (event type and function) was removed again.
    for (const { add, remove } of targets) {
      const added = add.mock.calls.map(([type, fn]) => [type, fn]);
      const removed = remove.mock.calls.map(([type, fn]) => [type, fn]);
      expect(added.length).toBeGreaterThan(0);
      expect(removed).toHaveLength(added.length);
      for (const entry of added) expect(removed).toContainEqual(entry);
    }
  });

  it('storageCandidates stays undefined, so persistence keeps its own detection', () => {
    expect(createWebPlatform().storageCandidates).toBeUndefined();
    browser({ Notification: notificationApi('granted').Api, navigator: { share: async () => undefined } });
    expect(createWebPlatform().storageCandidates).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// PLAT-001 static scans

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(join(e.parentPath, e.name));
  }
  return out;
}

/** Comments removed (as in core-architecture-boundaries), so a doc comment may name an API without tripping a scan. */
const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

/** Direct uses of the browser APIs that only src/platform may touch (references count, not just calls). */
const DIRECT: { name: string; re: RegExp }[] = [
  {
    name: 'window.Notification',
    re: /\b(?:window|globalThis|self)\s*\??\.\s*Notification\b|\bnew\s+Notification\b|(?<![\w$.])Notification\s*\??\.\s*(?:permission|requestPermission)\b|['"`]Notification['"`]\s+in\b|\btypeof\s+Notification\b/g,
  },
  // execCommand('copy') is the clipboard fallback the platform owns.
  { name: 'navigator.clipboard', re: /\bnavigator\s*\??\.\s*clipboard\b|\bexecCommand\s*\(\s*['"`]copy['"`]/g },
  { name: 'navigator.share', re: /\bnavigator\s*\??\.\s*(?:share|canShare)\b/g },
];

const directHits = (code: string) => DIRECT.filter(({ re }) => (code.match(re) ?? []).length > 0).map((d) => d.name);

/** Module specifiers of value imports, re-exports, side-effect and dynamic imports (type-only ones skipped). */
function valueImports(code: string): string[] {
  const specs: string[] = [];
  for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]/g)) if (!m[2]) specs.push(m[4]);
  for (const m of code.matchAll(/(?:^|[;\s])import\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  return specs;
}

const NOT_FROM_PLATFORM = ['persistence', 'sim', 'state', 'ui'];

/** The forbidden layers a src/platform file imports values from. */
function forbiddenImports(file: string, code: string): string[] {
  const out: string[] = [];
  for (const spec of valueImports(code)) {
    let target: string;
    if (spec.startsWith('@/')) target = join(SRC, spec.slice(2));
    else if (spec.startsWith('.')) target = resolve(dirname(file), spec);
    else continue; // a package
    const layer = relative(SRC, target).split(/[\\/]/)[0];
    if (NOT_FROM_PLATFORM.includes(layer)) out.push(layer);
  }
  return out;
}

describe('PLAT-001: static scans', () => {
  let outside: { rel: string; code: string }[] = [];
  let inside: { file: string; code: string }[] = [];

  // Asynchronous reads, so a slow disk never blocks the Vitest worker.
  beforeAll(async () => {
    const files = await sourceFiles(SRC);
    const codes = await Promise.all(files.map(async (f) => stripComments(await readFile(f, 'utf8'))));
    files.forEach((file, i) => {
      if (file.startsWith(PLATFORM_DIR + '/') || file.startsWith(PLATFORM_DIR + '\\')) inside.push({ file, code: codes[i] });
      else outside.push({ rel: relative(ROOT, file).split('\\').join('/'), code: codes[i] });
    });
  }, 300_000);

  it('the patterns catch direct uses and leave the platform seam and look-alikes alone', () => {
    expect(directHits("if ('Notification' in window) new Notification('Hi', { body });")).toEqual(['window.Notification']);
    expect(directHits('const ok = Notification.permission; await Notification.requestPermission();')).toEqual(['window.Notification']);
    expect(directHits('const N = window.Notification;')).toEqual(['window.Notification']);
    expect(directHits("typeof Notification !== 'undefined'")).toEqual(['window.Notification']);
    expect(directHits('await navigator.clipboard.writeText(url);')).toEqual(['navigator.clipboard']);
    expect(directHits("document.execCommand('copy');")).toEqual(['navigator.clipboard']);
    expect(directHits('await navigator?.share?.({ title, url }); navigator.canShare(d);')).toEqual(['navigator.share']);
    expect(
      directHits(
        'const n: PlatformNotification = x; await reg.showNotification(t); platform().clipboard.write(u); platform().share?.(d); s.notifications.length; navigator.userAgent;',
      ),
    ).toEqual([]);
    expect(stripComments('// navigator.clipboard.writeText(x)\n/* new Notification() */ f();')).toBe('\n f();');
  });

  it('the import parser skips type-only imports and resolves aliased and relative paths to layers', () => {
    const code =
      "import type { KVBackend } from '@/persistence';\nimport { x } from '@/sim/y';\nexport * from '../state/ui';\nimport '@/ui/side';\nconst m = await import('../persistence/storage');\nimport { y } from './types';\nimport { z } from 'idb-keyval';";
    expect(forbiddenImports(join(PLATFORM_DIR, 'web.ts'), code)).toEqual(['sim', 'state', 'ui', 'persistence']);
  });

  it('scans all of src', () => {
    expect(outside.length).toBeGreaterThan(100);
    expect(inside.length).toBeGreaterThanOrEqual(4);
  });

  it('outside src/platform, no code calls window.Notification, navigator.clipboard or navigator.share directly', () => {
    const problems = outside.flatMap(({ rel, code }) => directHits(code).map((name) => `${rel}: ${name} (use platform())`));
    expect(problems).toEqual([]);
  });

  it('src/platform makes no runtime import from persistence, sim, state or ui', () => {
    const problems = inside.flatMap(({ file, code }) => forbiddenImports(file, code).map((layer) => `${relative(ROOT, file)} -> ${layer}`));
    expect(problems).toEqual([]);
  });
});

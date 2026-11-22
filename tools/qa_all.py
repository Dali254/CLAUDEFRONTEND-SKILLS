#!/usr/bin/env python3
"""
qa_all.py: one QA run for Sunrise UI sites (Playwright, Python).

Checks every page at several widths, in light mode, classic dark and every built-in dark theme:
  • horizontal overflow (same idea as ?sr-debug)
  • real text contrast: walks every visible text node, composites rgba backgrounds up the tree,
    treats the body glow (body::before) as its brightest colour, skips gradient/image backgrounds,
    flags < 4.5:1 (< 3:1 for large text)
  • white text on gradient buttons, checked against EVERY colour stop of the gradient
  • console errors, page errors and CSP violations (securitypolicyviolation events)
  • login really succeeded (fails if still on a login URL)
Exit code 1 on any failure.

Examples
  # static demo (served with: python3 -m http.server 8765 from the repo root)
  python3 tools/qa_all.py --base http://127.0.0.1:8765/demo/ \\
      --pages dashboard.html,transactions.html,pages.html,admin.html,components.html \\
      --public login.html,register.html,forgot.html,public.html \\
      --login-url login.html --user demo --password demo

  # real site, reset the login rate limiter before signing in
  python3 tools/qa_all.py --base https://staging.example.com/ --pages dashboard,admin/users \\
      --login-url login --user qa@example.com --password "$QA_PASS" \\
      --reset-cmd "php artisan cache:clear" --themes light,dark,ocean,oled

Install:  pip install playwright && playwright install chromium   (or --chrome /usr/bin/google-chrome)
"""
import argparse, asyncio, json, subprocess, sys, time, urllib.parse, urllib.request

DARK_THEMES = ['midnight', 'ocean', 'forest', 'purple', 'wine', 'teal', 'coffee', 'steel', 'rose', 'oled']

INIT_JS = """
window.__qa = { csp: [] };
document.addEventListener('securitypolicyviolation', e => window.__qa.csp.push(e.violatedDirective + ' blocked ' + (e.blockedURI || 'inline') + ' @' + (e.sourceFile || '') + ':' + (e.lineNumber || '')));
"""

# ---------------------------------------------------------------- in-page checks
CHECK_JS = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: [], contrast: [], buttons: [] };

  /* ---------- overflow ---------- */
  const SKIP_OVF = '.sr-drawer,.sr-studio,.sr-modal,[hidden],.sr-toasts,.sr-filter-row,.sr-chips,.sr-tabs,.sr-table-wrap,.sr-snap,.sr-promo-track,.sr-combo__pop,[data-qa-skip]';
  if (document.documentElement.scrollWidth > vw + 1) out.overflow.push('page scrolls sideways: ' + document.documentElement.scrollWidth + 'px > ' + vw + 'px');
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest(SKIP_OVF)) return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    if (r.right > vw + 1 || r.left < -1) out.overflow.push(desc(el) + ' (' + Math.round(r.left) + '→' + Math.round(r.right) + ')');
  });
  out.overflow = out.overflow.slice(0, 8);

  /* ---------- colour helpers ---------- */
  const probe = document.createElement('i'); probe.style.cssText = 'position:absolute;width:0;height:0'; document.body.appendChild(probe);
  function parse(c) {
    if (!c) return null; let m;
    if ((m = c.match(/^color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.e-]+))?\)/))) return [m[1]*255, m[2]*255, m[3]*255, m[4] === undefined ? 1 : +m[4]];
    if ((m = c.match(/^rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?\)/))) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    probe.style.color = ''; probe.style.color = c; const v = getComputedStyle(probe).color; return v !== c ? parse(v) : null;
  }
  const over = (fg, bg) => { const a = fg[3]; return [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1]; };
  const lum = c => c.slice(0, 3).reduce((s, v, i) => { v /= 255; v = v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); return s + v * [.2126, .7152, .0722][i]; }, 0);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const colorsIn = s => (s.match(/(rgba?\([^)]*\)|color\(srgb[^)]*\))/g) || []).map(parse).filter(Boolean);
  function desc(el) { const c = (el.className && el.className.baseVal === undefined ? String(el.className) : '').trim().split(/\s+/).slice(0, 2).join('.'); return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : ''); }

  /* page base: html/body background, plus every colour of the body::before glow (its brightest point) */
  const rootBg = parse(getComputedStyle(document.body).backgroundColor);
  const htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  let paper = rootBg && rootBg[3] > 0 ? rootBg : (htmlBg && htmlBg[3] > 0 ? htmlBg : [255, 255, 255, 1]);
  if (paper[3] < 1) paper = over(paper, [255, 255, 255, 1]);
  const bcs = getComputedStyle(document.body, '::before');
  const glowOn = bcs.content !== 'none' && bcs.display !== 'none' && +bcs.opacity > 0;
  const glowOpacity = glowOn ? +bcs.opacity : 0;
  const glows = glowOn ? colorsIn(bcs.backgroundImage).filter(c => c[3] > 0).map(c => over([c[0], c[1], c[2], c[3] * glowOpacity], paper)) : [];
  const bases = [paper].concat(glows);

  /* backgrounds behind an element: composite translucent layers; null if a gradient/image is in the way */
  function backgroundsFor(el) {
    const layers = []; let e = el;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && e !== document.body && e !== document.documentElement) return null;   // gradient or image: skip
      const bg = parse(cs.backgroundColor);
      if (bg && bg[3] > 0 && e !== document.body && e !== document.documentElement) { layers.push(bg); if (bg[3] >= 1) break; }
      e = e.parentElement;
    }
    const opaque = layers.length && layers[layers.length - 1][3] >= 1;
    const starts = opaque ? [null] : bases;
    return starts.map(b => layers.slice().reverse().reduce((acc, l) => acc ? over(l, acc) : l, b));
  }
  function opacityOf(el) { let o = 1, e = el; while (e && e.nodeType === 1) { o *= +getComputedStyle(e).opacity; e = e.parentElement; } return o; }

  /* ---------- contrast walk ---------- */
  const SKIP_TXT = 'script,style,noscript,template,[hidden],.sr-logo,.sr-drawer:not(.is-open),.sr-studio:not(.is-open),.sr-sr-only,.sr-only,[data-qa-skip],.ph,svg';
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest(SKIP_TXT)) continue;
    if (el.closest('button:disabled,[aria-disabled="true"],input:disabled')) continue;   // WCAG: inactive controls are exempt
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const rr = range.getBoundingClientRect(); if (rr.width < 1 || rr.height < 1) continue;
    // clipped away (e.g. inside an overflow:hidden ancestor that is scrolled/collapsed)
    let clipped = false, p = el; while (p && p !== document.body) { const s = getComputedStyle(p); if (s.overflow !== 'visible') { const b = p.getBoundingClientRect(); if (rr.right <= b.left || rr.left >= b.right || rr.bottom <= b.top || rr.top >= b.bottom) { clipped = true; break; } } p = p.parentElement; }
    if (clipped) continue;
    const bgs = backgroundsFor(el); if (!bgs) continue;
    const fg0 = parse(cs.color); if (!fg0) continue;
    const op = opacityOf(el); const fg = [fg0[0], fg0[1], fg0[2], fg0[3] * op];
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    let worst = 99, worstBg = null;
    bgs.forEach(bg => { const r = ratio(over(fg, bg), bg); if (r < worst) { worst = r; worstBg = bg; } });
    if (worst < need - 0.005) out.contrast.push({ el: desc(el), text: n.textContent.trim().slice(0, 40), ratio: +worst.toFixed(2), need, fg: cs.color, bg: 'rgb(' + worstBg.slice(0, 3).map(Math.round).join(',') + ')' });
  }

  /* ---------- white text on gradient buttons: every stop must pass ---------- */
  document.querySelectorAll('.sr-btn,button,a[class*="btn"],[role="button"],.sr-promo__cta,.sr-tab--cta').forEach(el => {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) return;
    if (!/gradient/.test(cs.backgroundImage) || !el.textContent.trim()) return;
    const fg = parse(cs.color); if (!fg || lum(fg) < .6) return;    // only light text on gradients
    const under = backgroundsFor(el.parentElement) || bases;
    const stops = colorsIn(cs.backgroundImage);
    let worst = 99, ws = null;
    stops.forEach(s => under.forEach(u => { const c = over(s, u); const r = ratio(fg, c); if (r < worst) { worst = r; ws = c; } }));
    const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700), need = large ? 3 : 4.5;
    if (worst < need - 0.005) out.buttons.push({ el: desc(el), text: el.textContent.trim().slice(0, 30), ratio: +worst.toFixed(2), need, stop: 'rgb(' + ws.slice(0, 3).map(Math.round).join(',') + ')' });
  });
  probe.remove();
  out.contrast = out.contrast.slice(0, 12); out.buttons = out.buttons.slice(0, 8);
  return out;
}
"""

SET_THEME_JS = """
async (t) => {
  /* measure final colours, never a half-finished fade */
  if (!document.getElementById('qa-still')) { const s = document.createElement('style'); s.id = 'qa-still'; s.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}'; document.head.appendChild(s); }
  if (!window.SRTheme) return 'no SRTheme';
  if (t === 'light') SRTheme.apply({ mode: 'light' });
  else if (t === 'dark') SRTheme.apply({ mode: 'dark', dark: { theme: '' } });
  else SRTheme.apply({ mode: 'dark', dark: { theme: t, useAccent: true } });
  document.querySelectorAll('[data-sr-reveal]').forEach(e => e.classList.add('is-in'));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.documentElement.getAttribute('data-sr-dark') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}
"""


def parse_args():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--base', required=True, help='base URL, e.g. https://staging.example.com/')
    ap.add_argument('--pages', default='', help='comma list of signed-in pages (relative to --base)')
    ap.add_argument('--public', default='', help='comma list of public pages (tested signed out)')
    ap.add_argument('--widths', default='360,412,1280')
    ap.add_argument('--themes', default='light,dark,' + ','.join(DARK_THEMES), help="light, dark (classic) and/or theme names; 'all' = every one")
    ap.add_argument('--login-url', help='login page (relative to --base). Omit when no login is needed')
    ap.add_argument('--user'); ap.add_argument('--password')
    ap.add_argument('--user-field', default='input[name=username],input[name=login],input[name=email],input[name=phone],#user,input[type=email]')
    ap.add_argument('--pass-field', default='input[type=password]')
    ap.add_argument('--submit', default='form [type=submit],form button:not([type=button])')
    ap.add_argument('--login-pattern', default='login', help='if the URL still contains this after signing in, login failed')
    ap.add_argument('--reset-cmd', help='shell command run before login to reset rate limits (e.g. "php artisan cache:clear")')
    ap.add_argument('--reset-url', help='URL POSTed to before login to reset rate limits (staging only)')
    ap.add_argument('--chrome', help='path to a Chrome/Chromium binary (default: Playwright chromium)')
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--json', help='write the full report to this file')
    a = ap.parse_args()
    if a.themes == 'all': a.themes = 'light,dark,' + ','.join(DARK_THEMES)
    return a


def reset_limits(a):
    if a.reset_cmd:
        print(f'↺ reset: {a.reset_cmd}'); subprocess.run(a.reset_cmd, shell=True, check=False)
    if a.reset_url:
        try:
            urllib.request.urlopen(urllib.request.Request(urllib.parse.urljoin(a.base, a.reset_url), method='POST', data=b''), timeout=15); print('↺ reset url called')
        except Exception as e: print('↺ reset url failed:', e)


async def login(browser, a):
    ctx = await browser.new_context()
    pg = await ctx.new_page()
    url = urllib.parse.urljoin(a.base, a.login_url)
    await pg.goto(url, wait_until='domcontentloaded')
    await pg.locator(a.user_field).first.fill(a.user or '')
    await pg.locator(a.pass_field).first.fill(a.password or '')
    try:
        async with pg.expect_navigation(timeout=15000):
            await pg.locator(a.submit).first.click()
    except Exception:
        pass
    await pg.wait_for_timeout(800)
    ok = a.login_pattern.lower() not in pg.url.lower()
    state = await ctx.storage_state()
    await ctx.close()
    return ok, pg.url, state


async def run_one(browser, a, path, width, theme, state, sem, results):
    async with sem:
        ctx = await browser.new_context(viewport={'width': width, 'height': 900}, is_mobile=width < 768, has_touch=width < 768,
                                        storage_state=state, color_scheme='dark' if theme != 'light' else 'light')
        await ctx.add_init_script(INIT_JS)
        pg = await ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)[:200]))
        pg.on('console', lambda m: m.type == 'error' and errors.append('console: ' + m.text[:200]))
        url = urllib.parse.urljoin(a.base, path)
        rec = {'page': path, 'width': width, 'theme': theme}
        try:
            resp = await pg.goto(url, wait_until='load', timeout=30000)
            if resp and resp.status >= 400: errors.append(f'HTTP {resp.status}')
            if state and a.login_pattern.lower() in pg.url.lower(): errors.append('redirected to login: session not valid')
            await pg.evaluate("document.fonts && document.fonts.ready")
            await pg.evaluate(SET_THEME_JS, theme)
            # scroll through so lazy/reveal content is laid out
            await pg.evaluate("async()=>{const H=document.documentElement.scrollHeight;for(let y=0;y<H;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,15))}scrollTo(0,0)}")
            await pg.wait_for_timeout(250)
            chk = await pg.evaluate(CHECK_JS)
            rec.update(chk)
            rec['csp'] = await pg.evaluate('window.__qa ? window.__qa.csp : []')
        except Exception as e:
            errors.append('qa error: ' + str(e)[:200]); rec.update({'overflow': [], 'contrast': [], 'buttons': [], 'csp': []})
        rec['errors'] = errors
        rec['fail'] = bool(rec['overflow'] or rec['contrast'] or rec['buttons'] or rec['csp'] or errors)
        results.append(rec)
        mark = 'FAIL' if rec['fail'] else 'ok  '
        print(f"{mark} {path:24s} {width:5d} {theme:9s} overflow={len(rec['overflow'])} contrast={len(rec['contrast'])} buttons={len(rec['buttons'])} csp={len(rec['csp'])} errors={len(errors)}", flush=True)
        await ctx.close()


async def main():
    a = parse_args()
    from playwright.async_api import async_playwright
    pages = [p for p in a.pages.split(',') if p]
    public = [p for p in a.public.split(',') if p]
    widths = [int(w) for w in a.widths.split(',')]
    themes = [t for t in a.themes.split(',') if t]
    report = {'login': None, 'runs': []}
    t0 = time.time()
    async with async_playwright() as p:
        kw = {'executable_path': a.chrome} if a.chrome else {}
        browser = await p.chromium.launch(args=['--no-sandbox'], **kw)
        state = None
        if a.login_url and pages:
            reset_limits(a)
            ok, landed, state = await login(browser, a)
            report['login'] = {'ok': ok, 'landed': landed}
            print(('✓ login succeeded → ' if ok else '✗ LOGIN FAILED (still on login) → ') + landed)
            if not ok:
                await browser.close(); write(a, report); sys.exit(1)
        sem = asyncio.Semaphore(a.workers)
        jobs = [run_one(browser, a, pg, w, t, state, sem, report['runs']) for pg in pages for w in widths for t in themes]
        jobs += [run_one(browser, a, pg, w, t, None, sem, report['runs']) for pg in public for w in widths for t in themes]
        await asyncio.gather(*jobs)
        await browser.close()
    fails = [r for r in report['runs'] if r['fail']]
    tot = lambda k: sum(len(r.get(k, [])) for r in report['runs'])
    print('\n================ SUMMARY ================')
    print(f"runs {len(report['runs'])} · failed {len(fails)} · {time.time()-t0:.0f}s")
    print(f"overflow {tot('overflow')} · low-contrast text {tot('contrast')} · low-contrast buttons {tot('buttons')} · console/page errors {tot('errors')} · CSP violations {tot('csp')}")
    for r in fails[:25]:
        print(f"\n✗ {r['page']} @ {r['width']}px · {r['theme']}")
        for o in r['overflow'][:3]: print('   overflow ', o)
        for c in r['contrast'][:4]: print(f"   contrast  {c['ratio']}:1 < {c['need']}  \"{c['text']}\"  {c['el']}  fg {c['fg']} on {c['bg']}")
        for c in r['buttons'][:3]: print(f"   button    {c['ratio']}:1 < {c['need']}  \"{c['text']}\"  {c['el']}  at stop {c['stop']}")
        for c in r['csp'][:3]: print('   csp      ', c)
        for c in r['errors'][:3]: print('   error    ', c)
    write(a, report)
    sys.exit(1 if fails or (report['login'] and not report['login']['ok']) else 0)


def write(a, report):
    if a.json:
        with open(a.json, 'w') as f: json.dump(report, f, indent=1)
        print('report →', a.json)


if __name__ == '__main__':
    asyncio.run(main())

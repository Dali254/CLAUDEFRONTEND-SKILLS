"""Backend browser checks (part of tools/check-all). Starts a throw-away instance with every module on and demo data, then
   as guest, member and admin crawls every reachable page and checks, at 360/390/412/768/1366 px and with large text (html 20px):
   HTTP 200 · no PHP warnings · no console errors / page errors / CSP violations / unknown icons · no inline handlers · nonce on every inline script ·
   no .php links · no sideways scroll · no clipped text · no cut-off placeholder · textareas ≥ 60px · nothing covering buttons/links/fields ·
   every searchable select opens on a phone and an option can be picked.  Exit code 1 on any failure."""
import asyncio, re, sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
from instance import Instance, ADMIN, MEMBER
from playwright.async_api import async_playwright

WIDTHS = [360, 390, 412, 768, 1366]
SKIP = re.compile(r'^/(logout|return-to-admin|files/|admin/backups/|admin/members/export|admin/jobs/import/sample|manifest\.webmanifest|sw\.js|pwa/|push/|geo/|chat/api|favicon\.ico|health)|/api/|\?download|^/admin/chats/\d+/close')
MAX_PAGES = int(os.environ.get('SR_QA_MAX_PAGES', '120'))
CHROME = os.environ.get('SR_CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)

INIT = """window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'inline')));"""
LAYOUT = r"""() => {
  const bad = [], vw = document.documentElement.clientWidth, vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && +cs.opacity > 0 && !e.closest('[hidden],.sr-drawer:not(.is-open),.sr-modal[hidden],.sr-toasts,.sr-combo__pop[hidden]'); };
  if (document.documentElement.scrollWidth > vw + 1) bad.push('sideways scroll (' + document.documentElement.scrollWidth + ' > ' + vw + ')');
  const skipX = '.sr-table-wrap,.sr-chips,.sr-tabs,.sr-snap,.sr-promo-track,.sr-logos,.sr-filter-row,.sr-chat__list,.sr-toasts';
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.closest(skipX)) continue;
    const cs = getComputedStyle(e), hasText = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText && (cs.overflowX === 'hidden' || cs.overflow === 'hidden' || cs.overflowX === 'clip') && e.scrollWidth > e.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && cs.webkitLineClamp === 'none' && e.clientWidth > 0)
      bad.push('clipped text: "' + e.textContent.trim().slice(0, 30) + '"');
    if (e.tagName === 'TEXTAREA' && !e.hasAttribute('data-sr-autogrow') && e.getBoundingClientRect().height < 60) bad.push('textarea under 60px: ' + (e.name || e.id));
    if (e.tagName === 'INPUT' && e.placeholder && !e.value && /^(text|search|email|tel|url|password|number|)$/.test(e.type)) {
      const c = document.createElement('canvas').getContext('2d'); c.font = cs.font;
      const room = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), need = c.measureText(e.placeholder).width;
      const ph = getComputedStyle(e, '::placeholder');
      if (need > room + 1 && cs.textOverflow !== 'ellipsis' && ph.textOverflow !== 'ellipsis') bad.push('placeholder cut off: "' + e.placeholder + '"');
    }
  }
  // something covering a button, link or field (fixed bars excluded)
  const fixed = [...document.querySelectorAll('body *')].filter(e => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'sticky') && vis(e); }).map(e => e.getBoundingClientRect());
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]):not([type=file]),select,textarea,.sr-combo__btn')) {
    if (!vis(e) || e.closest('.sr-tabbar,.sr-topbar,.sr-toasts,[hidden],.sr-chat__head')) continue;
    if (getComputedStyle(e).position === 'fixed' || getComputedStyle(e).position === 'sticky') continue;
    const r = e.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.width < 4 || r.height < 4) continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || x > vw || fixed.some(f => x >= f.left && x <= f.right && y >= f.top && y <= f.bottom)) continue;
    const top = document.elementFromPoint(x, y);
    if (top && top !== e && !e.contains(top) && !top.contains(e) && !(e.labels && [...e.labels].some(l => l.contains(top))) && !top.closest('label')?.contains(e) && getComputedStyle(e).opacity !== '0')
      bad.push('covered: ' + (e.textContent.trim() || e.name || e.getAttribute('aria-label') || e.tagName).slice(0, 30) + ' (by ' + (top.className || top.tagName).toString().slice(0, 40) + ')');
  }
  return [...new Set(bad)].slice(0, 8);
}"""
COMBOS = r"""() => [...document.querySelectorAll('select')].filter(s => s.__srComboApi && s.__srComboApi.button && s.__srComboApi.button.offsetParent && !s.disabled).slice(0, 3).map(s => s.name || s.id)"""

def html_problems(html):
    bad = []
    tags = re.findall(r'<[a-zA-Z][^>]*>', html)
    if any(re.search(r'\son[a-z]+\s*=', t) for t in tags if not t.startswith(('<script', '<style'))): bad.append('inline event handler (on…=) in HTML')
    for t in re.findall(r'<script\b[^>]*>', html, re.I):
        if 'src=' not in t and 'nonce=' not in t: bad.append('inline <script> without nonce: ' + t[:60])
    for m in re.findall(r'(?:href|action|src)="([^"]*\.php[^"]*)"', html):
        if not re.match(r'https?://(?!127\.0\.0\.1|localhost)', m): bad.append('.php link: ' + m)   # our own links only; other sites may use .php
    for m in re.findall(r'(Fatal error|Warning:|Notice:|Deprecated:|Uncaught )', html): bad.append('PHP message in page: ' + m)
    return bad

async def login(ctx, base, who):
    pg = await ctx.new_page()
    await pg.goto(base + '/login'); await pg.fill('[name=login]', who[0]); await pg.fill('[name=password]', who[1])
    await pg.click('button[type=submit]'); await pg.wait_for_load_state('load'); await pg.close()

async def discover(ctx, base, starts):
    seen, queue, out = set(), list(starts), []
    pg = await ctx.new_page()
    while queue and len(out) < MAX_PAGES:
        path = queue.pop(0)
        key = re.sub(r'/\d+', '/{n}', path.split('#')[0])
        if key in seen or SKIP.search(path): continue
        seen.add(key)
        try: r = await pg.goto(base + path, wait_until='load')
        except Exception as e: out.append((path, 0)); continue
        out.append((path, r.status if r else 0))
        if r and r.ok and 'text/html' in (r.headers.get('content-type') or ''):
            for h in await pg.eval_on_selector_all('a[href]', 'as => as.map(a => a.getAttribute("href"))'):
                if not h or h.startswith(('http', 'mailto:', 'tel:', '#', 'javascript:')) or '/logout' in h: continue
                h = h.split('#')[0]
                if h.startswith('/') and h not in queue: queue.append(h)
    await pg.close(); return out

async def check_page(ctx, base, path, width, big=False, signed_in=False):
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('page error: ' + str(e)[:140]))
    pg.on('console', lambda m: (m.type == 'error' or '[SRIcons]' in m.text) and errs.append('console: ' + m.text[:140]))
    await pg.set_viewport_size({'width': width, 'height': 860 if width < 800 else 900})
    try: r = await pg.goto(base + path, wait_until='load', timeout=45000)
    except Exception:   # one retry: the PHP dev server queues requests that share a session
        r = await pg.goto(base + path, wait_until='load', timeout=45000)
    if big: await pg.add_style_tag(content='html{font-size:20px!important}'); await pg.evaluate('window.SRViewport && SRViewport.update && SRViewport.update()')
    await pg.wait_for_timeout(150)
    bad = []
    if not r or r.status != 200: bad.append('HTTP %s' % (r.status if r else 'no response'))
    if width == 390 and not big:
        bad += html_problems(await pg.content())
        if signed_in: lo = await pg.evaluate(LOGOUT); bad += [] if lo == 'ok' else ['R18: ' + lo]
    bad += [ 'CSP: ' + c for c in await pg.evaluate('window.__csp || []') ]
    bad += await pg.evaluate(LAYOUT)
    if width == 390 and not big:   # searchable selects open as a sheet on a phone and an option can be picked
        for name in await pg.evaluate(COMBOS):
            try:
                ok = await pg.evaluate("""async (n) => { const s = [...document.querySelectorAll('select')].find(x => (x.name || x.id) === n), api = s.__srComboApi, b = api.button;
                    b.scrollIntoView({block:'center'}); b.click(); await new Promise(r => setTimeout(r, 250));
                    const pop = document.querySelector('.sr-combo__pop:not([hidden])'); if (!pop) return 'did not open';
                    const pr = pop.getBoundingClientRect(); if (pr.left < -1 || pr.right > innerWidth + 1 || pr.bottom > innerHeight + 1) return 'opened outside the screen';
                    const opts = [...pop.querySelectorAll('[role=option]')].filter(o => !o.getAttribute('aria-disabled')); if (!opts.length) return 'no options';
                    const o = opts[Math.min(1, opts.length - 1)], want = o.getAttribute('data-value') ?? o.dataset.v ?? null, r = o.getBoundingClientRect();
                    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!top || !(o === top || o.contains(top))) return 'option is covered';
                    o.click(); await new Promise(r => setTimeout(r, 200));
                    if (document.querySelector('.sr-combo__pop:not([hidden])')) return 'did not close after picking';
                    return s.selectedIndex >= 0 ? 'ok' : 'nothing selected'; }""", name)
            except Exception as e: ok = 'error ' + str(e)[:80]
            if ok != 'ok': bad.append('searchable select "%s": %s' % (name, ok))
    bad += errs
    await pg.close()
    return bad

LOGOUT = r"""() => { const m = document.querySelector('.sr-popover--account, #pop-account'); if (!m) return 'no avatar menu';
  const items = [...m.querySelectorAll('a[href], button')]; const last = items[items.length - 1];
  if (!last || !/log ?out/i.test(last.textContent)) return 'avatar menu does not end with Log out';
  const f = last.closest('form'); if (!f || f.method.toLowerCase() !== 'post' || !f.querySelector('[name=_csrf]')) return 'Log out is not a POST form with CSRF';
  return 'ok'; }"""

async def check_forms(b, base):
    """R15 · field errors: red box + message under the field, focus on the first error, toast naming it, novalidate forms, clears when fixed; server errors land under the field too"""
    bad = []; ctx = await b.new_context(viewport={'width': 390, 'height': 860}); pg = await ctx.new_page()
    await pg.goto(base + '/register'); await pg.click('button[type=submit]'); await pg.wait_for_timeout(500)
    r = await pg.evaluate("""() => { const f = document.querySelector('[name=name]'), e = document.getElementById(f.id + '-err'), t = document.querySelector('.sr-toast, .sr-toasts > *');
        return { red: f.classList.contains('is-invalid') && getComputedStyle(f).borderColor !== getComputedStyle(document.querySelector('[name=email]')).borderColor,
                 under: !!e && !e.hidden && e.getBoundingClientRect().top >= f.getBoundingClientRect().bottom - 2 && e.textContent.trim().length > 3,
                 described: (f.getAttribute('aria-describedby') || '').includes(f.id + '-err'), focus: document.activeElement === f,
                 toast: !!t && /Full name/i.test(t.textContent), summary: document.querySelectorAll('.is-invalid').length } }""")
    for k, msg in [('red', 'no red box on the invalid field'), ('under', 'message is not under the field'), ('described', 'field not linked to its message (aria-describedby)'), ('focus', 'focus did not move to the first error'), ('toast', 'no toast naming the field')]:
        if not r[k]: bad.append('register (empty submit): ' + msg)
    await pg.fill('[name=name]', 'Test Person'); await pg.wait_for_timeout(150)
    if await pg.evaluate("document.querySelector('[name=name]').classList.contains('is-invalid') || !document.getElementById(document.querySelector('[name=name]').id + '-err').hidden"): bad.append('register: error did not clear when fixed')
    # server-side error (client checks bypassed) must come back under the same field
    await pg.fill('[name=phone]', '12'); await pg.fill('[name=password]', 'long-enough-pass')
    async with pg.expect_navigation(wait_until='load'): await pg.evaluate("document.querySelector('form.sr-auth__form').submit()")
    await pg.wait_for_timeout(200)
    if not await pg.evaluate("(() => { const e = document.querySelector('[name=phone]'); const m = e && document.getElementById(e.id + '-err'); return e && e.classList.contains('is-invalid') && m && !m.hidden && m.textContent.trim().length > 3 })()"):
        bad.append('register (server error): phone error not shown under the phone field')
    if await pg.input_value('[name=name]') != 'Test Person': bad.append('register (server error): typed values were lost')
    await ctx.close(); return bad

async def main():
    fails = []; t0 = time.time()
    with Instance('qa').create().install().serve() as inst:
        base = inst.base
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox']) if CHROME else await p.chromium.launch()
            roles = {}
            for role, who, starts in [('guest', None, ['/', '/login', '/register', '/forgot-password', '/jobs', '/p/terms', '/offline']),
                                      ('member', MEMBER, ['/dashboard', '/stages', '/jobs', '/documents', '/partner', '/chat', '/help', '/account', '/notifications', '/jobs/applied']),
                                      ('admin', ADMIN, ['/admin', '/dashboard'])]:
                ctx = await b.new_context(viewport={'width': 390, 'height': 860}, user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36')
                await ctx.add_init_script(INIT)
                if who: await login(ctx, base, who)
                pages = await discover(ctx, base, starts)
                roles[role] = (ctx, pages)
                for path, st in pages:
                    if st not in (200,): fails.append('%s %s: HTTP %s' % (role, path, st))
            sem = asyncio.Semaphore(4)
            async def one(role, ctx, path, w, big):
                async with sem:
                    try: bad = await check_page(ctx, base, path, w, big, role != 'guest' and not path.startswith(('/p/', '/offline')))
                    except Exception as e: bad = ['check crashed: ' + str(e)[:120]]
                    for x in bad: fails.append('%s %s @%s%s: %s' % (role, path, w, ' large-text' if big else '', x))
            jobs = []
            for role, (ctx, pages) in roles.items():
                for path, st in pages:
                    if st != 200: continue
                    for w in WIDTHS: jobs.append(one(role, ctx, path, w, False))
                    jobs.append(one(role, ctx, path, 390, True))
            await asyncio.gather(*jobs)
            try: fails += ['forms: ' + x for x in await check_forms(b, base)]
            except Exception as e: fails.append('forms: check crashed: ' + str(e)[:160])
            n = sum(len(v[1]) for v in roles.values())
            await b.close()
        fails += ['server log: ' + e for e in inst.app_errors()]
    print('backend pages checked: %d (%d widths + large text) in %ds' % (n, len(WIDTHS), time.time() - t0))
    for f in sorted(set(fails)): print('  FAIL', f)
    return 1 if fails else 0

if __name__ == '__main__': sys.exit(asyncio.run(main()))

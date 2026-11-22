/* =====================================================================
   SUNRISE THEME ENGINE
   - Admin sets the site default (server injects window.SR_THEME = {...})
   - Users may toggle light/dark (and, if allowed, their own colours)
   - Persists to localStorage, applies before paint (no flash)
   Config (either works; the <meta> needs no inline script, so it is CSP-safe):
     <meta name="sr-theme" content='{"preset":"ember","dark":{"theme":"ocean","useAccent":true}}'>
     <script nonce="…">window.SR_THEME = {...}</script>
   dark: { theme: 'midnight'|'ocean'|'forest'|'purple'|'wine'|'teal'|'coffee'|'steel'|'rose'|'oled',
           useAccent: true }   // useAccent: switch the brand to the theme's accent while dark
   API:  SRTheme.apply(cfg)  SRTheme.get()  SRTheme.setMode('light'|'dark'|'system')
         SRTheme.preset('ocean')  SRTheme.darkTheme('ocean')  SRTheme.audit()  SRTheme.reset()
         SRTheme.toCSS()  SRTheme.presets  SRTheme.darkThemes
   ===================================================================== */
(function (w, d) {
  'use strict';
  var KEY = 'sr-theme-v1';
  var PRESETS = {
    ember:    { name: 'Ember',    brand: '#ff5b14', brand2: '#ffb21e', brand3: '#f0306e' },
    ocean:    { name: 'Ocean',    brand: '#0284c7', brand2: '#22d3ee', brand3: '#6366f1' },
    emerald:  { name: 'Emerald',  brand: '#059669', brand2: '#a3e635', brand3: '#0ea5e9' },
    royal:    { name: 'Royal',    brand: '#7c3aed', brand2: '#f472b6', brand3: '#4f46e5' },
    rose:     { name: 'Rose',     brand: '#e11d48', brand2: '#fb923c', brand3: '#c026d3' },
    cobalt:   { name: 'Cobalt',   brand: '#2563eb', brand2: '#38bdf8', brand3: '#7c3aed' },
    gold:     { name: 'Gold',     brand: '#d97706', brand2: '#facc15', brand3: '#dc2626' },
    graphite: { name: 'Graphite', brand: '#334155', brand2: '#94a3b8', brand3: '#0f766e' }
  };
  /* 10 built-in dark themes. Palettes live in sunrise.css (html.dark[data-sr-dark=…]); here: look + accent. */
  var DARK = {
    midnight: { name: 'Midnight', look: 'solid' },
    ocean:    { name: 'Ocean',    look: 'glass',    accent: ['#2563eb', '#0284c7', '#4f46e5'] },
    forest:   { name: 'Forest',   look: 'gradient', accent: ['#047857', '#059669', '#0f766e'] },
    purple:   { name: 'Purple',   look: 'glass',    accent: ['#7c3aed', '#9333ea', '#c026d3'] },
    wine:     { name: 'Wine',     look: 'gradient', accent: ['#be123c', '#e11d48', '#c2410c'] },
    teal:     { name: 'Teal',     look: 'glass',    accent: ['#0f766e', '#0e7490', '#047857'] },
    coffee:   { name: 'Coffee',   look: 'solid',    accent: ['#b45309', '#a16207', '#c2410c'] },
    steel:    { name: 'Steel',    look: 'gradient', accent: ['#4f46e5', '#2563eb', '#7c3aed'] },
    rose:     { name: 'Rose',     look: 'glass',    accent: ['#db2777', '#be185d', '#9333ea'] },
    oled:     { name: 'OLED',     look: 'solid' }
  };
  var GLOW = { solid: 0, gradient: .30, glass: .40 };
  var DEFAULTS = {
    preset: 'ember', brand: '#ff5b14', brand2: '#ffb21e', brand3: '#f0306e',
    mode: 'system',          // light | dark | system
    icons: 'heroicons',      // heroicons (default) | fluent | lucide | tabler | fontawesome
    radius: 1,               // 0.6 – 1.4 multiplies every corner radius
    font: 'sora',            // sora | jakarta | grotesk | system
    allowUserColors: false,  // admin decides whether members may recolour
    dark: null               // { theme: 'ocean', useAccent: true }  (null = classic dark)
  };
  var FONTS = {
    sora:    '"Sora","Inter",ui-sans-serif,system-ui,sans-serif',
    jakarta: '"Plus Jakarta Sans","Inter",ui-sans-serif,system-ui,sans-serif',
    grotesk: '"Space Grotesk","Inter",ui-sans-serif,system-ui,sans-serif',
    system:  'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'
  };
  var HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b || {}) if (b[k] !== undefined && b[k] !== null) o[k] = b[k]; return o; }
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function metaCfg() { var m = d.querySelector('meta[name="sr-theme"]'); if (!m) return {}; try { return JSON.parse(m.getAttribute('content')) || {}; } catch (e) { return {}; } }
  function siteCfg() { return merge(merge(DEFAULTS, metaCfg()), w.SR_THEME || {}); }
  var site = siteCfg();                                  // admin default from server
  var state;

  function resolve() {
    var user = read();
    var s = merge(site, { mode: user.mode });           // mode is always a user choice
    if (site.allowUserColors) s = merge(s, { preset: user.preset, brand: user.brand, brand2: user.brand2, brand3: user.brand3, radius: user.radius, font: user.font, icons: user.icons, dark: user.dark });
    return s;
  }

  function isDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return !!(w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* ---- colour maths (WCAG 2.x) ---- */
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function rgb2hex(c) { return '#' + c.map(function (v) { v = Math.round(Math.max(0, Math.min(255, v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function lum(c) { return c.reduce(function (a, v, i) { v /= 255; v = v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); return a + v * [.2126, .7152, .0722][i]; }, 0); }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mixc(a, b, t) { return a.map(function (v, i) { return v * t + b[i] * (1 - t); }); }
  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];
  /* move colour c toward `to` until it reaches `min` contrast against every colour in bgs */
  function ensure(c, bgs, min, to) { var t = 1; while (t > 0 && bgs.some(function (b) { return ratio(c.map(function (v, i) { return v * t + to[i] * (1 - t); }), b) < min; })) t -= .02; return mixc(c, to, Math.max(0, t)); }
  var probe;
  /* resolve any CSS colour (var(), color-mix(), rgb(), color(srgb …)) to [r,g,b] using the browser */
  function resolveColor(expr) {
    if (!probe) { probe = d.createElement('i'); probe.setAttribute('aria-hidden', 'true'); probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'; }
    if (!probe.isConnected) d.documentElement.appendChild(probe);
    probe.style.color = ''; probe.style.color = expr;
    var v = getComputedStyle(probe).color, m;
    if ((m = v.match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)/))) return [m[1] * 255, m[2] * 255, m[3] * 255];
    if ((m = v.match(/rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)/))) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function backgrounds(dark, accents) {
    var bgs = ['--paper', '--surface-solid', '--surface-2', '--sunken'].map(function (v) { return resolveColor('var(' + v + ')'); }).filter(Boolean);
    var look = d.documentElement.getAttribute('data-sr-look'), a = GLOW[look] || 0, paper = bgs[0];
    if (dark && a && paper) accents.forEach(function (c) { bgs.push(mixc(hex2rgb(c), paper, a)); });   // brightest point of each glow
    return bgs;
  }
  function contrastVars(s, dark, accents) {
    var st = d.documentElement.style, b = hex2rgb(accents[0]), b2 = hex2rgb(accents[1]), b3 = hex2rgb(accents[2]);
    var bgs = backgrounds(dark, accents);
    if (!bgs.length) return;
    /* links also sit on --brand-soft (brand tint over each background) */
    bgs.slice().forEach(function (bg) { bgs.push(mixc(b, bg, dark ? .16 : .09)); });
    var fg = dark ? ensure(b, bgs, 4.6, WHITE) : ensure(mixc(b, BLACK, .84), bgs, 4.6, BLACK);
    st.setProperty(dark ? '--sr-fg-dark' : '--sr-fg-light', rgb2hex(fg));
    /* button / brand-gradient stops: darken until white text passes 4.5:1 at every stop */
    [mixc(b, b2, .62), b, mixc(b, b3, .72)].forEach(function (c, i) { st.setProperty('--sr-g' + (i + 1), rgb2hex(ensure(c, [WHITE], 4.6, BLACK))); });
  }

  function paint(s) {
    var r = d.documentElement, st = r.style, dark = isDark(s.mode);
    var dt = s.dark && DARK[s.dark.theme] ? s.dark : null, def = dt ? DARK[dt.theme] : null;
    var useAcc = dark && def && def.accent && dt.useAccent !== false;
    var b1 = useAcc ? def.accent[0] : s.brand, b2 = useAcc ? def.accent[1] : s.brand2, b3 = useAcc ? def.accent[2] : s.brand3;
    if (HEX.test(b1)) st.setProperty('--brand', b1);
    if (HEX.test(b2)) st.setProperty('--brand-2', b2);
    if (HEX.test(b3)) st.setProperty('--brand-3', b3);
    if (dark && def) { r.setAttribute('data-sr-dark', dt.theme); r.setAttribute('data-sr-look', def.look); }
    else { r.removeAttribute('data-sr-dark'); r.removeAttribute('data-sr-look'); }
    st.setProperty('--radius-scale', String(Math.min(1.4, Math.max(.6, +s.radius || 1))));
    st.setProperty('--font-display', FONTS[s.font] || FONTS.sora);
    r.classList.toggle('dark', dark);
    try { contrastVars(s, dark, [b1, b2, b3].map(function (c) { return HEX.test(c) ? c : '#ff5b14'; })); } catch (e) {}
    r.setAttribute('data-theme', s.preset || 'custom');
    r.setAttribute('data-icons', s.icons || 'heroicons');
    var meta = d.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(r).getPropertyValue('--paper').trim() || (dark ? '#0b0d0e' : '#fbf8f5'));
    d.dispatchEvent(new CustomEvent('sr:theme', { detail: s }));
  }

  var API = {
    presets: PRESETS, fonts: FONTS, darkThemes: DARK,
    get: function () { return merge({}, state); },
    site: function () { return merge({}, site); },
    /* apply(cfg, {scope:'site'|'user'}) — 'site' is what the admin panel uses */
    apply: function (cfg, opt) {
      opt = opt || {};
      if (cfg.preset && PRESETS[cfg.preset] && !cfg.brand) cfg = merge(cfg, { brand: PRESETS[cfg.preset].brand, brand2: PRESETS[cfg.preset].brand2, brand3: PRESETS[cfg.preset].brand3 });
      if (cfg.brand && !cfg.preset) cfg.preset = 'custom';
      state = merge(state, cfg);
      if (opt.scope === 'site') site = merge(site, cfg);
      var saved = read(); var k; for (k in cfg) saved[k] = cfg[k]; write(saved);
      paint(state); return API.get();
    },
    preset: function (id, opt) { return PRESETS[id] ? API.apply({ preset: id }, opt) : API.get(); },
    setMode: function (m) { return API.apply({ mode: m }); },
    /* darkTheme('ocean') · darkTheme(null) for classic dark. scope 'site' = admin default */
    darkTheme: function (id, opt) { return API.apply({ dark: id && DARK[id] ? { theme: id, useAccent: !(state.dark && state.dark.useAccent === false) } : { theme: '' } }, opt); },
    /* live WCAG check of the current mode: heading/body ≥7, secondary ≥4.5, white button text ≥4.5 */
    audit: function () {
      var dark = isDark(state.mode), acc = ['--brand', '--brand-2', '--brand-3'].map(function (v) { return rgb2hex(resolveColor('var(' + v + ')') || [255, 91, 20]); });
      var bgs = backgrounds(dark, acc), out = [], ok = true;
      [['Headings', '--heading', 7], ['Body text', '--text', 7], ['Secondary', '--muted', 4.5], ['Hints', '--faint', 4.5], ['Links', '--brand-fg', 4.5]].forEach(function (t) {
        var c = resolveColor('var(' + t[1] + ')'); if (!c) return;
        var m = Math.min.apply(null, bgs.map(function (b) { return ratio(c, b); })); out.push({ name: t[0], ratio: +m.toFixed(2), min: t[2] }); if (m < t[2]) ok = false;
      });
      var g = ['--sr-g1', '--sr-g2', '--sr-g3'].map(function (v) { return resolveColor('var(' + v + ')'); }).filter(Boolean);
      if (g.length) { var m = Math.min.apply(null, g.map(function (c) { return ratio(WHITE, c); })); out.push({ name: 'Button text', ratio: +m.toFixed(2), min: 4.5 }); if (m < 4.5) ok = false; }
      var worst = out.reduce(function (a, b) { return !a || b.ratio / b.min < a.ratio / a.min ? b : a; }, null);
      return { ok: ok, items: out, worst: worst };
    },
    toggleMode: function () { return API.setMode(isDark(state.mode) ? 'light' : 'dark'); },
    isDark: function () { return isDark(state.mode); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} d.documentElement.removeAttribute('style'); site = siteCfg(); state = resolve(); paint(state); return API.get(); },
    /* JSON the admin backend should store (settings table / config file) */
    toJSON: function () { return { preset: state.preset, brand: state.brand, brand2: state.brand2, brand3: state.brand3, radius: +state.radius, font: state.font, icons: state.icons, dark: state.dark || null, allowUserColors: !!site.allowUserColors }; },
    /* A static CSS override block for sites without JS config */
    toCSS: function () { return ':root{--brand:' + state.brand + ';--brand-2:' + state.brand2 + ';--brand-3:' + state.brand3 + ';--radius-scale:' + state.radius + ';--font-display:' + (FONTS[state.font] || FONTS.sora) + '}'; }
  };

  state = resolve();
  paint(state);
  if (w.matchMedia) w.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.mode === 'system') paint(state); });
  w.SRTheme = API;
})(window, document);

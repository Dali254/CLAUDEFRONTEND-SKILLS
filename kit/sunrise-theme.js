/* =====================================================================
   SUNRISE THEME ENGINE
   - Admin sets the site default (server injects window.SR_THEME = {...})
   - Users may toggle light/dark (and, if allowed, their own colours)
   - Persists to localStorage, applies before paint (no flash)
   API:  SRTheme.apply(cfg)  SRTheme.get()  SRTheme.setMode('light'|'dark'|'system')
         SRTheme.preset('ocean')  SRTheme.reset()  SRTheme.toCSS()  SRTheme.presets
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
  var DEFAULTS = {
    preset: 'ember', brand: '#ff5b14', brand2: '#ffb21e', brand3: '#f0306e',
    mode: 'system',          // light | dark | system
    icons: 'heroicons',      // heroicons (default) | fluent | lucide | tabler | fontawesome
    radius: 1,               // 0.6 – 1.4 multiplies every corner radius
    font: 'sora',            // sora | jakarta | grotesk | system
    allowUserColors: false   // admin decides whether members may recolour
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

  var site = merge(DEFAULTS, w.SR_THEME || {});        // admin default from server
  var state;

  function resolve() {
    var user = read();
    var s = merge(site, { mode: user.mode });           // mode is always a user choice
    if (site.allowUserColors) s = merge(s, { preset: user.preset, brand: user.brand, brand2: user.brand2, brand3: user.brand3, radius: user.radius, font: user.font, icons: user.icons });
    return s;
  }

  function isDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return !!(w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function paint(s) {
    var r = d.documentElement, st = r.style;
    if (HEX.test(s.brand)) st.setProperty('--brand', s.brand);
    if (HEX.test(s.brand2)) st.setProperty('--brand-2', s.brand2);
    if (HEX.test(s.brand3)) st.setProperty('--brand-3', s.brand3);
    st.setProperty('--radius-scale', String(Math.min(1.4, Math.max(.6, +s.radius || 1))));
    st.setProperty('--font-display', FONTS[s.font] || FONTS.sora);
    var dark = isDark(s.mode);
    r.classList.toggle('dark', dark);
    r.setAttribute('data-theme', s.preset || 'custom');
    r.setAttribute('data-icons', s.icons || 'heroicons');
    var meta = d.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(r).getPropertyValue('--paper').trim() || (dark ? '#0b0d0e' : '#fbf8f5'));
    d.dispatchEvent(new CustomEvent('sr:theme', { detail: s }));
  }

  var API = {
    presets: PRESETS, fonts: FONTS,
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
    toggleMode: function () { return API.setMode(isDark(state.mode) ? 'light' : 'dark'); },
    isDark: function () { return isDark(state.mode); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} d.documentElement.removeAttribute('style'); site = merge(DEFAULTS, w.SR_THEME || {}); state = resolve(); paint(state); return API.get(); },
    /* JSON the admin backend should store (settings table / config file) */
    toJSON: function () { return { preset: state.preset, brand: state.brand, brand2: state.brand2, brand3: state.brand3, radius: +state.radius, font: state.font, icons: state.icons, allowUserColors: !!site.allowUserColors }; },
    /* A static CSS override block for sites without JS config */
    toCSS: function () { return ':root{--brand:' + state.brand + ';--brand-2:' + state.brand2 + ';--brand-3:' + state.brand3 + ';--radius-scale:' + state.radius + ';--font-display:' + (FONTS[state.font] || FONTS.sora) + '}'; }
  };

  state = resolve();
  paint(state);
  if (w.matchMedia) w.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (state.mode === 'system') paint(state); });
  w.SRTheme = API;
})(window, document);

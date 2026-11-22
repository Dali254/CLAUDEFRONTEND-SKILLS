/* =====================================================================
   SUNRISE UI BEHAVIOURS  (no framework; works with Alpine/React/Blade/PHP)
   data-sr-drawer-open / data-sr-drawer-close   mobile drawer
   data-sr-pop="id"                              toggles popover #id
   data-sr-theme-toggle                          light/dark
   data-sr-studio-open                           opens Theme Studio (admins)
   data-sr-copy="text"                           copy to clipboard
   SRToast.show({title,text,icon,life})          toast
   SRStudio.mount({saveUrl, csrf, onSave})       admin colour panel
   ===================================================================== */
(function (w, d) {
  'use strict';
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---- drawer ---- */
  function drawer(open) {
    var dr = $('.sr-drawer'), sc = $('.sr-scrim'); if (!dr) return;
    dr.classList.toggle('is-open', open); if (sc) sc.classList.toggle('is-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
    $$('[data-sr-drawer-open]').forEach(function (b) { b.classList.toggle('is-active', open); });
  }

  /* ---- toasts ---- */
  var FI = { 'ph-check-circle': 'checkmark-circle', 'ph-warning': 'warning', 'ph-warning-circle': 'warning', 'ph-copy': 'link', 'ph-code': 'code', 'ph-bell': 'alert', 'ph-bell-ringing': 'alert', 'ph-play-circle': 'video', 'ph-x-circle': 'dismiss-circle' };
  function toIcon(i) { i = i || 'alert'; return FI[i] || i.replace(/^ph-/, ''); }
  var TT = { success: ['Success', 'ph-check'], warning: ['Warning', 'ph-warning'], error: ['Error', 'ph-warning-circle'], info: ['Notice', 'ph-info'] };
  var Toast = {
    /* SRToast.show({ type:'success'|'warning'|'error'|'info', title, text, life (ms, 0 = stay), actions:[{label, variant:'secondary'|'primary'|'danger', onClick}] })
       Older calls with {icon, action, onAction} still work. Always shown top-right (top, full width on phones). */
    show: function (o) {
      o = o || {};
      var type = o.type || (/check|success|done/.test(o.icon || '') ? 'success' : /warn/.test(o.icon || '') ? 'warning' : /error|dismiss|x-circle/.test(o.icon || '') ? 'error' : 'info');
      var t = TT[type] || TT.info, actions = o.actions || (o.action ? [{ label: o.action, variant: 'primary', onClick: o.onAction }] : []);
      var host = $('.sr-toasts'); if (!host) { host = d.createElement('div'); host.className = 'sr-toasts'; host.setAttribute('aria-live', 'polite'); d.body.appendChild(host); }
      var life = o.life === 0 ? 0 : (o.life || (actions.length ? 9000 : 5000)), el = d.createElement('div');
      el.className = 'sr-toast sr-toast--' + type + (life ? '' : ' is-sticky'); el.style.setProperty('--life', life + 'ms');
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      el.innerHTML = '<div class="sr-toast__head"><span class="sr-toast__badge"><i class="ph ' + t[1] + '"></i></span><p class="sr-toast__title">' + esc(o.title || t[0]) + '</p>' +
        '<button class="sr-toast__close" aria-label="Dismiss notification"><i class="ph ph-x"></i></button></div>' +
        (o.text ? '<p class="sr-toast__text">' + esc(o.text) + '</p>' : '') +
        (actions.length ? '<div class="sr-toast__actions">' + actions.map(function (a, k) { return '<button class="sr-btn sr-btn--' + esc(a.variant || 'secondary') + ' sr-btn--square" data-k="' + k + '">' + esc(a.label) + '</button>'; }).join('') + '</div>' : '');
      host.insertBefore(el, host.firstChild);
      var timer, left = life, start;
      var kill = function () { if (el.classList.contains('is-leaving')) return; clearTimeout(timer); el.style.setProperty('--h', el.offsetHeight + 'px'); el.classList.add('is-leaving'); setTimeout(function () { el.remove(); }, 260); };
      var run = function () { if (!life) return; start = Date.now(); timer = setTimeout(kill, left); };
      el.addEventListener('mouseenter', function () { if (!life) return; clearTimeout(timer); left -= Date.now() - start; });
      el.addEventListener('mouseleave', run);
      el.querySelector('.sr-toast__close').onclick = kill;
      el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { var a = actions[+b.dataset.k]; if (a.onClick) a.onClick(); if (a.keepOpen !== true) kill(); }; });
      /* swipe right to dismiss on touch */
      var sx = null; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchmove', function (e) { if (sx === null) return; var dx = e.touches[0].clientX - sx; if (dx > 0) el.style.transform = 'translateX(' + dx + 'px)'; }, { passive: true });
      el.addEventListener('touchend', function (e) { var dx = (e.changedTouches[0].clientX - (sx || 0)); sx = null; if (dx > 90) kill(); else el.style.transform = ''; });
      while (host.children.length > (w.innerWidth <= 640 ? 2 : 4)) host.lastChild.remove();
      run(); return { el: el, close: kill };
    },
    success: function (title, text, o) { return Toast.show(Object.assign({ type: 'success', title: title, text: text }, o)); },
    warning: function (title, text, o) { return Toast.show(Object.assign({ type: 'warning', title: title, text: text }, o)); },
    error: function (title, text, o) { return Toast.show(Object.assign({ type: 'error', title: title, text: text }, o)); },
    info: function (title, text, o) { return Toast.show(Object.assign({ type: 'info', title: title, text: text }, o)); }
  };

  /* ---- Theme Studio (admin) ---- */
  var Studio = {
    opts: {},
    mount: function (opts) {
      this.opts = opts || {};
      if ($('.sr-studio')) return;
      var T = w.SRTheme, P = T.presets, s = T.get(), sw = '', id;
      for (id in P) sw += '<button class="sr-swatch" data-preset="' + id + '" aria-pressed="' + (s.preset === id) + '"><span class="sr-swatch__dot" style="background:linear-gradient(140deg,' + P[id].brand2 + ',' + P[id].brand + ' 55%,' + P[id].brand3 + ')"></span>' + P[id].name + '</button>';
      var el = d.createElement('aside'); el.className = 'sr-studio'; el.setAttribute('aria-label', 'Theme studio');
      el.innerHTML =
        '<div class="sr-studio__head"><span class="sr-panel__icon"><i class="sr-icon" data-icon="paint-brush"></i></span><div class="sr-grow"><p class="sr-panel__title">Theme studio</p><p class="sr-hint">Changes apply live for every page</p></div><button class="sr-icon-btn" data-close aria-label="Close"><i class="ph ph-x"></i></button></div>' +
        '<div class="sr-studio__body">' +
          '<section><h4>Presets</h4><div class="sr-swatches">' + sw + '</div></section>' +
          '<section><h4>Brand colours</h4>' +
            row('brand', 'Primary', s.brand) + row('brand2', 'Dawn (light accent)', s.brand2) + row('brand3', 'Dusk (deep accent)', s.brand3) +
          '</section>' +
          '<section><h4>Appearance</h4><div class="sr-seg" data-mode>' +
            ['light:ph-sun:Light', 'dark:ph-moon:Dark', 'system:ph-desktop:Auto'].map(function (m) { m = m.split(':'); return '<button data-v="' + m[0] + '" aria-pressed="' + (s.mode === m[0]) + '"><i class="ph ' + m[1] + '"></i>' + m[2] + '</button>'; }).join('') +
          '</div></section>' +
          '<section><h4>Dark theme</h4><div class="sr-dt-grid" data-darkset>' + darkCards(s) + '</div>' +
            '<label class="sr-flex sr-hint" style="gap:.5rem;margin-top:.6rem"><input type="checkbox" class="sr-check" data-useaccent' + (!(s.dark && s.dark.useAccent === false) ? ' checked' : '') + '>Use the theme’s accent colour in dark mode</label>' +
            '<div class="sr-aa" data-aa role="status" aria-live="polite"></div></section>' +
          '<section><h4>Icon library</h4><div class="sr-seg sr-seg--wrap" data-iconset>' +
            ['heroicons:Heroicons', 'fluent:Fluent Color', 'lucide:Lucide', 'tabler:Tabler', 'fontawesome:Font Awesome'].map(function (f) { f = f.split(':'); return '<button data-v="' + f[0] + '" aria-pressed="' + ((s.icons || 'heroicons') === f[0]) + '"><i class="sr-icon" data-icon="trophy" data-pack="' + f[0] + '"></i>' + f[1] + '</button>'; }).join('') +
          '</div></section>' +
          '<section><h4>Corner radius</h4><input class="sr-range" type="range" min="0.6" max="1.4" step="0.1" value="' + s.radius + '" data-radius></section>' +
          '<section><h4>Heading font</h4><div class="sr-seg" data-font>' +
            ['sora:Sora', 'jakarta:Jakarta', 'grotesk:Grotesk', 'system:System'].map(function (f) { f = f.split(':'); return '<button data-v="' + f[0] + '" aria-pressed="' + (s.font === f[0]) + '">' + f[1] + '</button>'; }).join('') +
          '</div></section>' +
        '</div>' +
        '<div class="sr-studio__foot"><button class="sr-btn sr-btn--secondary sr-btn--square" data-reset><i class="ph ph-arrow-counter-clockwise"></i>Reset</button><button class="sr-btn sr-btn--secondary sr-btn--square" data-css><i class="ph ph-code"></i>CSS</button><button class="sr-btn sr-btn--primary sr-btn--square sr-grow" data-save><i class="ph ph-check"></i>Publish</button></div>';
      d.body.appendChild(el);
      function darkCards(s) {
        var D = T.darkThemes, h = '', id, cur = s.dark && s.dark.theme;
        for (id in D) h += '<button type="button" class="sr-dt" data-t="' + id + '" data-look="' + D[id].look + '" aria-pressed="' + (cur === id) + '"><span class="sr-dt__art"><span class="sr-dt__card"><span class="sr-dt__h"></span><span class="sr-dt__t"></span></span><span class="sr-dt__btn"></span></span><span class="sr-dt__name">' + D[id].name + '<span class="sr-dt__badge">' + D[id].look.charAt(0).toUpperCase() + D[id].look.slice(1) + '</span></span></button>';
        return h;
      }
      function aa() {
        var box = $('[data-aa]', el); if (!box) return;
        var r = T.audit(), w = r.worst;
        box.className = 'sr-aa ' + (r.ok ? 'is-ok' : 'is-bad');
        box.innerHTML = '<i class="ph ' + (r.ok ? 'ph-check-circle' : 'ph-warning-circle') + '"></i>' + (r.ok ? 'Text readable (AA)' : 'Low contrast: ' + w.name) + (w ? '<small>lowest ' + w.ratio + ':1 (needs ' + w.min + ')</small>' : '');
      }
      function row(k, label, v) { return '<div class="sr-color-row"><label for="sr-c-' + k + '">' + label + '</label><code data-code="' + k + '">' + v + '</code><input id="sr-c-' + k + '" type="color" value="' + v + '" data-color="' + k + '"></div>'; }
      var sync = function () {
        var s = T.get();
        $$('[data-preset]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.preset === b.dataset.preset)); });
        $$('[data-color]', el).forEach(function (i) { i.value = s[i.dataset.color]; $('[data-code="' + i.dataset.color + '"]', el).textContent = s[i.dataset.color]; });
        $$('[data-mode] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.mode === b.dataset.v)); });
        $$('[data-font] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.font === b.dataset.v)); });
        $$('[data-iconset] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String((s.icons || 'heroicons') === b.dataset.v)); });
        $('[data-radius]', el).value = s.radius;
        $$('[data-darkset] .sr-dt', el).forEach(function (b) { b.setAttribute('aria-pressed', String(!!(s.dark && s.dark.theme === b.dataset.t))); });
        aa();
      };
      requestAnimationFrame(aa);
      d.addEventListener('sr:theme', sync);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.preset) T.preset(b.dataset.preset, { scope: 'site' });
        else if (b.closest('[data-darkset]')) { var on = b.getAttribute('aria-pressed') === 'true'; T.darkTheme(on ? null : b.dataset.t, { scope: 'site' }); if (!on && !T.isDark()) T.setMode('dark'); }
        else if (b.closest('[data-mode]')) T.setMode(b.dataset.v);
        else if (b.closest('[data-font]')) T.apply({ font: b.dataset.v }, { scope: 'site' });
        else if (b.closest('[data-iconset]')) T.apply({ icons: b.dataset.v }, { scope: 'site' });
        else if (b.hasAttribute('data-close')) Studio.close();
        else if (b.hasAttribute('data-reset')) T.reset();
        else if (b.hasAttribute('data-css')) { navigator.clipboard && navigator.clipboard.writeText(T.toCSS()); Toast.show({ title: 'CSS copied', text: 'Paste it after sunrise.css', icon: 'ph-code' }); }
        else if (b.hasAttribute('data-save')) Studio.save();
      });
      el.addEventListener('input', function (e) {
        var t = e.target;
        if (t.dataset.color) { var c = {}; c[t.dataset.color] = t.value; c.preset = 'custom'; T.apply(c, { scope: 'site' }); }
        if (t.hasAttribute('data-radius')) T.apply({ radius: +t.value }, { scope: 'site' });
        if (t.hasAttribute('data-useaccent')) { var cur = T.get().dark; if (cur && cur.theme) T.apply({ dark: { theme: cur.theme, useAccent: t.checked } }, { scope: 'site' }); }
      });
    },
    open: function () { var s = $('.sr-studio'); if (!s) { this.mount(this.opts); s = $('.sr-studio'); } requestAnimationFrame(function () { s.classList.add('is-open'); }); },
    close: function () { var s = $('.sr-studio'); if (s) s.classList.remove('is-open'); },
    save: function () {
      var o = this.opts, cfg = w.SRTheme.toJSON();
      if (o.onSave) { o.onSave(cfg); return; }
      if (!o.saveUrl) { Toast.show({ title: 'Theme saved on this device', text: 'Set saveUrl to store it for all users', icon: 'ph-check-circle' }); return; }
      fetch(o.saveUrl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': o.csrf || '' }, body: JSON.stringify(cfg) })
        .then(function (r) { if (!r.ok) throw r; Toast.show({ title: 'Theme published', text: 'Every visitor now sees the new colours', icon: 'ph-check-circle' }); })
        .catch(function () { Toast.show({ title: 'Could not save theme', text: 'Check your connection and try again', icon: 'ph-warning' }); });
    }
  };

  /* ---- global delegation ---- */
  d.addEventListener('click', function (e) {
    var t = e.target.closest('[data-sr-drawer-open],[data-sr-drawer-close],[data-sr-pop],[data-sr-theme-toggle],[data-sr-studio-open],[data-sr-copy]');
    $$('.sr-popover:not([hidden])').forEach(function (p) { if (!p.contains(e.target) && (!t || t.getAttribute('data-sr-pop') !== p.id)) p.hidden = true; });
    if (!t) { if (e.target.classList && e.target.classList.contains('sr-scrim')) drawer(false); return; }
    if (t.hasAttribute('data-sr-drawer-open')) drawer(true);
    else if (t.hasAttribute('data-sr-drawer-close')) drawer(false);
    else if (t.hasAttribute('data-sr-pop')) { var p = d.getElementById(t.getAttribute('data-sr-pop')); if (p) { p.hidden = !p.hidden; t.setAttribute('aria-expanded', String(!p.hidden)); } }
    else if (t.hasAttribute('data-sr-theme-toggle')) w.SRTheme.toggleMode();
    else if (t.hasAttribute('data-sr-studio-open')) Studio.open();
    else if (t.hasAttribute('data-sr-copy')) {
      var txt = t.getAttribute('data-sr-copy');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { Toast.show({ title: 'Copied', text: txt, icon: 'ph-copy', life: 2500 }); }).catch(function () {});
    }
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { drawer(false); Studio.close(); $$('.sr-popover').forEach(function (p) { p.hidden = true; }); } });

  /* theme toggle icon swap */
  function icons() { $$('[data-sr-theme-toggle] i').forEach(function (i) { i.className = 'ph ' + (w.SRTheme.isDark() ? 'ph-sun' : 'ph-moon'); }); }
  d.addEventListener('sr:theme', icons);
  if (d.readyState !== 'loading') icons(); else d.addEventListener('DOMContentLoaded', icons);


  /* ================= MOTION + COMPONENTS ================= */
  var RIPPLE = '.sr-btn,.sr-tile,.sr-nav-link,.sr-reward,.sr-icon-btn,.sr-account,.sr-page-btn,.sr-chip-btn,.sr-tabs__btn,.sr-menu-item,.sr-swatch,[data-sr-ripple]';
  var POP = '.sr-btn,.sr-tab,.sr-nav-link,.sr-quick__item,.sr-icon-btn,.sr-tile,.sr-reward,.sr-chip-btn';
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  d.addEventListener('pointerdown', function (e) {
    if (reduce || e.button > 0) return;
    var el = e.target.closest(RIPPLE); if (!el || el.disabled) return;
    var r = el.getBoundingClientRect(), s = d.createElement('span');
    s.className = 'sr-ripple';
    s.style.setProperty('--d', Math.max(r.width, r.height) * 2.2 + 'px');
    s.style.setProperty('--x', (e.clientX - r.left) + 'px');
    s.style.setProperty('--y', (e.clientY - r.top) + 'px');
    el.appendChild(s); setTimeout(function () { s.remove(); }, 650);
  }, { passive: true });
  d.addEventListener('click', function (e) {
    var el = e.target.closest(POP); if (!el || reduce) return;
    el.classList.remove('is-popping'); void el.offsetWidth; el.classList.add('is-popping');
    setTimeout(function () { el.classList.remove('is-popping'); }, 480);
    if (navigator.vibrate && el.matches('.sr-tab,.sr-btn--primary')) { try { navigator.vibrate(8); } catch (x) {} }
  });

  /* count-up: <span data-sr-count="12480.5" data-decimals="2">0</span> */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-sr-count')) || 0, dec = +(el.getAttribute('data-decimals') || 0), t0 = null, dur = 1100;
    var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (reduce) { el.textContent = fmt(to); return; }
    (function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / dur), e2 = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * e2); if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  /* reveal on scroll + count-up when visible */
  function observe() {
    var els = $$('[data-sr-reveal]:not(.is-in),[data-sr-count]:not([data-counted])');
    if (!('IntersectionObserver' in w)) { els.forEach(function (el) { el.classList.add('is-in'); if (el.hasAttribute('data-sr-count')) countUp(el); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return; var el = en.target; io.unobserve(el);
        var delay = +(el.getAttribute('data-sr-delay') || 0);
        setTimeout(function () { el.classList.add('is-in'); if (el.hasAttribute('data-sr-count')) { el.setAttribute('data-counted', ''); countUp(el); } }, delay);
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* tabs: <div class="sr-tabs" role="tablist"><button class="sr-tabs__btn" role="tab" aria-controls="p1" aria-selected="true">…</button>…<span class="sr-tabs__ink"></span></div> */
  function inkTo(tabs) {
    var on = $('[aria-selected="true"]', tabs), ink = $('.sr-tabs__ink', tabs); if (!on || !ink) return;
    ink.style.width = on.offsetWidth + 'px'; ink.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('.sr-tabs__btn'); if (!b) return;
    var tabs = b.closest('.sr-tabs');
    $$('.sr-tabs__btn', tabs).forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', String(on)); var p = x.getAttribute('aria-controls'); if (p && d.getElementById(p)) d.getElementById(p).hidden = !on; });
    inkTo(tabs); tabs.dispatchEvent(new CustomEvent('sr:tab', { bubbles: true, detail: { value: b.dataset.value } }));
  });
  /* chip filters (single select within .sr-chips) */
  d.addEventListener('click', function (e) {
    var c = e.target.closest('.sr-chips .sr-chip-btn'); if (!c) return;
    $$('.sr-chip-btn', c.parentNode).forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
    c.parentNode.dispatchEvent(new CustomEvent('sr:filter', { bubbles: true, detail: { value: c.dataset.value } }));
  });

  /* modal / bottom sheet: data-sr-modal-open="id", data-sr-modal-close */
  var lastFocus;
  /* R12 · move an overlay to <body> while open (a card's transform/isolation would trap position:fixed under other layers) */
  function portal(el) {
    if (!el || el.parentNode === d.body) return function () {};
    var mark = d.createComment('sr-portal'); el.parentNode.insertBefore(mark, el); d.body.appendChild(el);
    return function restore() { if (mark.parentNode) { mark.parentNode.insertBefore(el, mark); mark.parentNode.removeChild(mark); } };
  }
  function isPhone() { return w.matchMedia('(max-width:640px)').matches; }
  var Modal = {
    open: function (id) { var m = d.getElementById(id); if (!m) return; lastFocus = d.activeElement; if (!m.__srRestore) m.__srRestore = portal(m); m.hidden = false; d.body.style.overflow = 'hidden'; var f = $('input,select,textarea,button:not([data-sr-modal-close])', m); if (f) f.focus({ preventScroll: true }); },  /* synchronous: delayed focus loses keystrokes */
    close: function (m) { m = typeof m === 'string' ? d.getElementById(m) : m; if (!m) return; m.hidden = true; d.body.style.overflow = ''; if (m.__srRestore) { m.__srRestore(); m.__srRestore = null; } if (lastFocus) lastFocus.focus({ preventScroll: true }); }
  };
  d.addEventListener('click', function (e) {
    var o = e.target.closest('[data-sr-modal-open]'); if (o) { Modal.open(o.getAttribute('data-sr-modal-open')); return; }
    var c = e.target.closest('[data-sr-modal-close]'); if (c) { Modal.close(c.closest('.sr-modal')); return; }
    if (e.target.classList && e.target.classList.contains('sr-modal')) Modal.close(e.target);
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.sr-modal:not([hidden])').forEach(Modal.close); });

  /* button async state: SRButton.run(btn, promiseFn) → loading → done ✓ or shake */
  var Btn = {
    run: function (btn, fn) {
      if (btn.classList.contains('is-loading')) return Promise.resolve();
      var html = btn.innerHTML; btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
      return Promise.resolve().then(fn).then(function (r) {
        btn.classList.remove('is-loading'); btn.classList.add('is-done'); btn.innerHTML = '<i class="ph ph-check-circle"></i>Done';
        setTimeout(function () { btn.classList.remove('is-done'); btn.innerHTML = html; btn.removeAttribute('aria-busy'); }, 1600); return r;
      }, function (err) {
        btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); btn.classList.add('is-shake'); setTimeout(function () { btn.classList.remove('is-shake'); }, 450); throw err;
      });
    }
  };

  /* pagination:
     SRPager.mount(el, {total, page, perPage, onChange(page, perPage)})  — renders numbers, ellipsis, prev/next, per-page, mobile "2 / 9"
     SRPager.list(container, items, renderFn, {perPage, pager}) — client-side paging helper */
  function pageList(p, n) {
    if (n <= 7) return Array.from({ length: n }, function (_, i) { return i + 1; });
    var out = [1], a = Math.max(2, p - 1), b = Math.min(n - 1, p + 1);
    if (p <= 3) { a = 2; b = 4; } if (p >= n - 2) { a = n - 3; b = n - 1; }
    if (a > 2) out.push('…'); for (var i = a; i <= b; i++) out.push(i); if (b < n - 1) out.push('…'); out.push(n); return out;
  }
  var Pager = {
    mount: function (el, o) {
      var st = { page: o.page || 1, perPage: o.perPage || 10, total: o.total || 0 };
      function pages() { return Math.max(1, Math.ceil(st.total / st.perPage)); }
      function render() {
        var n = pages(), p = Math.min(st.page, n), from = st.total ? (p - 1) * st.perPage + 1 : 0, to = Math.min(st.total, p * st.perPage);
        el.className = 'sr-pagination'; el.setAttribute('role', 'navigation'); el.setAttribute('aria-label', 'Pagination');
        el.innerHTML = '<p class="sr-pagination__info">Showing <strong>' + from + '–' + to + '</strong> of <strong>' + st.total + '</strong></p>' +
          '<div class="sr-pages"><button class="sr-page-btn" data-go="' + (p - 1) + '" aria-label="Previous page"' + (p <= 1 ? ' disabled' : '') + '><i class="ph ph-caret-left"></i></button>' +
          pageList(p, n).map(function (x) { return x === '…' ? '<span class="sr-page-gap">…</span>' : '<button class="sr-page-btn sr-page-num" data-go="' + x + '"' + (x === p ? ' aria-current="page"' : '') + '>' + x + '</button>'; }).join('') +
          '<span class="sr-page-mobile">' + p + ' / ' + n + '</span>' +
          '<button class="sr-page-btn" data-go="' + (p + 1) + '" aria-label="Next page"' + (p >= n ? ' disabled' : '') + '><i class="ph ph-caret-right"></i></button></div>' +
          '<label class="sr-page-size">Rows <select class="sr-select" data-size>' + [5, 10, 20, 50].concat([st.perPage]).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; }).map(function (s) { return '<option' + (s === st.perPage ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>';
      }
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (!b || b.disabled) return; api.go(+b.getAttribute('data-go')); });
      el.addEventListener('change', function (e) { if (e.target.hasAttribute('data-size')) { st.perPage = +e.target.value; st.page = 1; render(); o.onChange && o.onChange(st.page, st.perPage); } });
      var api = {
        go: function (p) { st.page = Math.max(1, Math.min(pages(), p)); render(); o.onChange && o.onChange(st.page, st.perPage); },
        setTotal: function (t) { st.total = t; st.page = 1; render(); },
        state: function () { return { page: st.page, perPage: st.perPage, total: st.total, pages: pages() }; }
      };
      render(); return api;
    },
    list: function (container, items, renderFn, o) {
      o = o || {}; var data = items.slice(), target = typeof container === 'string' ? $(container) : container;
      function draw(page, per) {
        var start = (page - 1) * per, slice = data.slice(start, start + per);
        target.innerHTML = slice.length ? slice.map(renderFn).join('') : (o.empty || '<div class="sr-empty"><i class="ph ph-tray"></i><p>Nothing to show.</p></div>');
        if (o.scrollTop !== false) { var top = target.getBoundingClientRect().top + w.scrollY - 120; if (w.scrollY > top) w.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' }); }
      }
      var pg = Pager.mount(o.pager, { total: data.length, perPage: o.perPage || 10, onChange: draw });
      draw(1, o.perPage || 10);
      return { pager: pg, set: function (next) { data = next.slice(); pg.setTotal(data.length); draw(1, pg.state().perPage); } };
    }
  };

  function boot() { observe(); $$('.sr-tabs').forEach(inkTo); }
  if (d.readyState !== 'loading') boot(); else d.addEventListener('DOMContentLoaded', boot);
  w.addEventListener('resize', function () { $$('.sr-tabs').forEach(inkTo); });
  w.SRModal = Modal; w.SRButton = Btn; w.SRPager = Pager; w.SRReveal = observe;


  /* password eye: <button type="button" class="sr-pass__eye" data-sr-eye="inputId"> · strength: <div class="sr-strength" data-sr-strength="inputId"><span></span>×4</div> */
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sr-eye]'); if (!b) return;
    var i = d.getElementById(b.getAttribute('data-sr-eye')); if (!i) return;
    var show = i.type === 'password'; i.type = show ? 'text' : 'password';
    b.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); b.setAttribute('aria-pressed', String(show));
    var ic = b.querySelector('i'); if (ic) ic.className = 'ph ' + (show ? 'ph-eye-slash' : 'ph-eye');
  });
  d.addEventListener('input', function (e) {
    var t = e.target; if (!t.id) return;
    $$('[data-sr-strength="' + t.id + '"]').forEach(function (m) {
      var v = t.value, s = 0; if (v.length >= 6) s++; if (v.length >= 10) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
      m.setAttribute('data-level', v ? Math.max(1, s) : 0);
    });
  });


  /* ?sr-debug → outline any element that overflows the viewport, log it to the console */
  if (/[?&]sr-debug/.test(location.search)) w.addEventListener('load', function () {
    var vw = d.documentElement.clientWidth, n = 0;
    $$('body *').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.right > vw + 1 || r.left < -1) { el.classList.add('sr-debug-overflow'); n++; if (w.console) console.warn('[sr-debug] overflow', el); } });
    Toast.show({ type: n ? 'error' : 'success', title: n ? n + ' elements overflow' : 'No overflow', text: n ? 'Outlined in red. See the console.' : 'Layout fits ' + vw + 'px.', life: 0 });
  });
  /* filter selects get an active state when a value is chosen */
  d.addEventListener('change', function (e) { var f = e.target.closest && e.target.closest('.sr-filter'); if (f) f.classList.toggle('is-active', !!e.target.value); });


  /* =================================================================
     COMPONENTS: combo · error summary · upload · bulk select · promo carousel
     All behaviour comes from data attributes. No inline handlers needed.
     ================================================================= */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var uid = 0;

  /* ---- sr-combo: <select data-sr-search="Search countries"> → searchable select in ONE field ---- */
  var Combo = {
    init: function (sel) {
      if (sel.__srCombo) return; sel.__srCombo = true;
      var id = sel.id || (sel.id = 'sr-sel-' + (++uid)), bid = id + '-btn', lid = id + '-list';
      var box = d.createElement('div'); box.className = 'sr-combo';
      box.innerHTML = '<button type="button" class="sr-select sr-combo__btn" id="' + bid + '" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + lid + '"><span class="sr-combo__val"></span><i class="ph ph-caret-down" aria-hidden="true"></i></button>' +
        '<div class="sr-combo__pop" hidden><div class="sr-combo__head"><span class="sr-combo__title"></span><button type="button" class="sr-icon-btn sr-combo__x" aria-label="Close"><i class="ph ph-x"></i></button></div>' +
        '<label class="sr-combo__search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><input type="search" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="' + lid + '"></label>' +
        '<ul class="sr-combo__list" id="' + lid + '" role="listbox"></ul><p class="sr-combo__empty" hidden>No matches</p></div>';
      sel.parentNode.insertBefore(box, sel); box.appendChild(sel);
      sel.classList.add('sr-combo__native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
      var btn = $('.sr-combo__btn', box), pop = $('.sr-combo__pop', box), q = $('input', pop), list = $('.sr-combo__list', pop), empty = $('.sr-combo__empty', pop);
      q.placeholder = sel.getAttribute('data-sr-search') || 'Search';
      q.setAttribute('aria-label', q.placeholder);
      /* label[for=select] → the button */
      $$('label[for="' + id + '"]').forEach(function (l) { l.htmlFor = bid; $('.sr-combo__title', pop).textContent = l.textContent.replace(/\*/g, '').trim(); });
      if (sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));
      var items = [], active = -1, restorePop = null;
      function build() {
        var h = '', n = 0; items = [];
        $$('option,optgroup', sel).forEach(function (o) {
          if (o.tagName === 'OPTGROUP') { h += '<li class="sr-combo__group" role="presentation">' + esc(o.label) + '</li>'; return; }
          if (o.value === '' && o.hidden) return;
          var oid = id + '-o' + (n++);
          items.push({ o: o, id: oid, key: norm(o.textContent + ' ' + o.value) });
          h += '<li role="option" id="' + oid + '" data-v="' + esc(o.value) + '" aria-selected="' + o.selected + '"' + (o.disabled ? ' aria-disabled="true"' : '') + '>' + esc(o.textContent) + '</li>';
        });
        list.innerHTML = h; sync();
      }
      function sync() {
        var o = sel.options[sel.selectedIndex];
        var ph = !o || (o.value === '' );
        $('.sr-combo__val', box).textContent = o ? o.textContent : '';
        btn.classList.toggle('is-placeholder', ph);
        btn.classList.toggle('is-invalid', sel.classList.contains('is-invalid'));
        if (sel.hasAttribute('aria-invalid')) btn.setAttribute('aria-invalid', sel.getAttribute('aria-invalid')); else btn.removeAttribute('aria-invalid');
        btn.disabled = sel.disabled;
        $$('[role=option]', list).forEach(function (li) { li.setAttribute('aria-selected', String(li.getAttribute('data-v') === sel.value)); });
      }
      function visible() { return items.filter(function (it) { var li = d.getElementById(it.id); return li && !li.hidden && !it.o.disabled; }); }
      function setActive(i) {
        var v = visible(); if (!v.length) { active = -1; q.removeAttribute('aria-activedescendant'); return; }
        active = (i + v.length) % v.length;
        $$('[role=option]', list).forEach(function (li) { li.classList.remove('is-active'); });
        var li = d.getElementById(v[active].id); li.classList.add('is-active'); q.setAttribute('aria-activedescendant', li.id);
        li.scrollIntoView({ block: 'nearest' });
      }
      function filter() {
        var t = norm(q.value.trim()), shown = 0;
        items.forEach(function (it) { var li = d.getElementById(it.id); var hit = !t || it.key.indexOf(t) > -1; li.hidden = !hit; if (hit) shown++; });
        $$('.sr-combo__group', list).forEach(function (g) { var n = g.nextElementSibling, any = false; while (n && !n.classList.contains('sr-combo__group')) { if (!n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; });
        empty.hidden = shown > 0; setActive(0);
      }
      function open() {
        if (btn.disabled || !pop.hidden) return;
        if (isPhone()) { restorePop = portal(pop); pop.classList.add('is-sheet'); }
        pop.hidden = false; box.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
        q.value = ''; filter();
        q.focus({ preventScroll: true });                     /* synchronous: no keystroke is lost */
        var v = visible(), cur = v.findIndex(function (it) { return it.o.selected; }); setActive(cur > -1 ? cur : 0);
        if (w.matchMedia('(max-width:640px)').matches) d.body.style.overflow = 'hidden';
      }
      function close(focusBtn) {
        if (pop.hidden) return;
        pop.hidden = true; box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); d.body.style.overflow = '';
        if (restorePop) { restorePop(); restorePop = null; pop.classList.remove('is-sheet'); }
        if (focusBtn) btn.focus({ preventScroll: true });
      }
      function pick(it) {
        if (!it || it.o.disabled) return;
        sel.value = it.o.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
        sync(); close(true);
      }
      btn.addEventListener('click', function () { pop.hidden ? open() : close(true); });
      btn.addEventListener('keydown', function (e) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); open(); } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { open(); q.value = e.key; filter(); e.preventDefault(); } });
      q.addEventListener('input', filter);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter') { e.preventDefault(); pick(visible()[active]); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
        else if (e.key === 'Tab') close(false);
      });
      list.addEventListener('click', function (e) { var li = e.target.closest('[role=option]'); if (li) pick(items.find(function (it) { return it.id === li.id; })); });
      $('.sr-combo__x', pop).addEventListener('click', function () { close(true); });
      pop.addEventListener('click', function (e) { if (e.target === pop) close(true); });   /* sheet backdrop */
      d.addEventListener('pointerdown', function (e) { if (!box.contains(e.target) && !pop.contains(e.target)) close(false); });   /* the sheet may live in <body> */
      sel.addEventListener('change', sync);
      new MutationObserver(function (m) { if (m.some(function (r) { return r.type === 'childList'; })) build(); else sync(); }).observe(sel, { attributes: true, attributeFilter: ['class', 'aria-invalid', 'disabled'], childList: true, subtree: true });
      build();
      sel.__srComboApi = { open: open, close: close, refresh: build, button: btn };
    },
    scan: function (root) { $$('select[data-sr-search]', root || d).forEach(Combo.init); }
  };

  /* ---- multi-step forms + per-field error summary ----
     <form data-sr-steps> … <fieldset data-sr-step="1"> … <div class="sr-error-summary" data-sr-error-summary hidden></div>
     SRForm.validate(form) → true/false (shows every error as "Field — message" with a "Step N ›" button)
     SRForm.showErrors(form, [{ field: 'email', message: 'Already registered' }])   (server errors)  */
  /* checkValidity() fires 'invalid' events; live checks run quietly so they never trigger the submit-time jump */
  var quietCheck = false;
  function quietValid(el) { quietCheck = true; try { return el.checkValidity(); } finally { quietCheck = false; } }
  var Form = {
    steps: function (f) { return $$('[data-sr-step]', f); },
    current: function (f) { var s = Form.steps(f).find(function (x) { return !x.hidden; }); return s ? +s.getAttribute('data-sr-step') : 1; },
    go: function (f, n) {
      var all = Form.steps(f); if (!all.length) return;
      n = Math.max(1, Math.min(all.length, n));
      all.forEach(function (s) { s.hidden = +s.getAttribute('data-sr-step') !== n; });
      $$('.sr-steps .sr-step', f).forEach(function (s, i) { s.className = 'sr-step' + (i + 1 < n ? ' is-done' : i + 1 === n ? ' is-current' : ''); });
      $$('[data-sr-step-label]', f).forEach(function (el) { el.textContent = 'Step ' + n + ' of ' + all.length; });
      $$('[data-sr-prev]', f).forEach(function (b) { b.hidden = n === 1; });
      $$('[data-sr-next]', f).forEach(function (b) { b.hidden = n === all.length; });
      $$('[data-sr-submit]', f).forEach(function (b) { b.hidden = n !== all.length; });
      f.dispatchEvent(new CustomEvent('sr:step', { bubbles: true, detail: { step: n } }));
    },
    label: function (el) {
      var l = el.id && ($('label[for="' + el.id + '"]') || (el.__srComboApi && $('label[for="' + el.__srComboApi.button.id + '"]'))), t = el.getAttribute('data-sr-label') || (l && l.textContent) || (el.closest('fieldset') && $('legend', el.closest('fieldset')) && $('legend', el.closest('fieldset')).textContent) || el.getAttribute('aria-label') || el.name || 'This field';
      return t.replace(/\*/g, '').replace(/^\s*\d+\.\s*/, '').trim();
    },
    message: function (el) {
      var v = el.validity, m = el.getAttribute('data-sr-msg');
      if (m) return m;
      if (v.valueMissing) return el.type === 'file' ? 'Please choose a file' : el.tagName === 'SELECT' || el.type === 'radio' ? 'Please choose an option' : 'Please fill this in';
      if (v.typeMismatch && el.type === 'email') return 'Enter an email like name@example.com';
      if (v.patternMismatch) return el.getAttribute('title') || 'Use the format shown';
      if (v.tooShort) return 'Use at least ' + el.minLength + ' characters';
      return el.validationMessage || 'Check this field';
    },
    mark: function (el, msg) {
      var targets = el.type === 'radio' ? $$('input[name="' + el.name + '"]', el.form) : [el];
      targets.forEach(function (t) { t.classList.toggle('is-invalid', !!msg); if (msg) t.setAttribute('aria-invalid', 'true'); else t.removeAttribute('aria-invalid'); });
      var errId = (el.id || el.name) + '-err', e = d.getElementById(errId);
      if (!e && msg) {                                  /* R15 · create the message under the exact field */
        e = d.createElement('p'); e.className = 'sr-error'; e.id = errId; e.setAttribute('role', 'alert');
        e.innerHTML = '<i class="ph ph-warning-circle" aria-hidden="true"></i><span></span>';
        var anchor = el.closest('.sr-input-group,.sr-combo,.sr-upload,.sr-pills,.sr-check-row') || (el.type === 'radio' || el.type === 'checkbox' ? el.closest('label') || el : el);
        var after = anchor.nextElementSibling; while (after && after.classList && after.classList.contains('sr-hint')) { anchor = after; after = after.nextElementSibling; }
        anchor.parentNode.insertBefore(e, anchor.nextSibling);
      }
      if (e) { if (msg) { var sp = $('span', e); (sp || e).textContent = msg; targets.forEach(function (t) { var db = (t.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); if (db.indexOf(errId) < 0) { db.push(errId); t.setAttribute('aria-describedby', db.join(' ')); } }); } e.hidden = !msg; }
    },
    render: function (f, list) {
      var box = $('[data-sr-error-summary]', f); if (!box) return;
      if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
      box.innerHTML = '<p class="sr-error-summary__title"><i class="ph ph-warning-circle" aria-hidden="true"></i>' + (list.length === 1 ? 'Fix this to continue' : 'Fix these ' + list.length + ' things to continue') + '</p><ul>' +
        list.map(function (x, i) { return '<li><span><strong>' + esc(x.label) + '</strong> — ' + esc(x.message) + '</span>' + (x.step ? '<button type="button" class="sr-error-summary__go" data-i="' + i + '">Step ' + x.step + ' <i class="ph ph-caret-right" aria-hidden="true"></i></button>' : '<button type="button" class="sr-error-summary__go" data-i="' + i + '">Show <i class="ph ph-caret-right" aria-hidden="true"></i></button>') + '</li>'; }).join('') + '</ul>';
      box.hidden = false; box.__list = list;
      box.setAttribute('role', 'alert'); box.tabIndex = -1; box.focus({ preventScroll: false });
    },
    jump: function (f, x) {
      if (x.step) Form.go(f, x.step);
      var el = x.el, target = el && el.__srCombo && el.__srComboApi ? el.__srComboApi.button : el;
      if (target && target.type === 'file') target = target.closest('.sr-upload') || target;
      if (target) { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); (target.focus ? target : el).focus({ preventScroll: true }); }
    },
    validate: function (f) {
      var seen = {}, list = [];
      $$('input,select,textarea', f).forEach(function (el) {
        if (el.disabled || el.type === 'hidden' || el.closest('[data-sr-skip]')) return;
        if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = 1; }
        var ok = quietValid(el), msg = ok ? '' : Form.message(el);
        Form.mark(el, msg);
        if (!ok) { var st = el.closest('[data-sr-step]'); list.push({ el: el, label: Form.label(el), message: msg, step: st ? +st.getAttribute('data-sr-step') : 0 }); }
      });
      Form.render(f, list);
      return !list.length;
    },
    /* validate only the visible step (for the Continue button) */
    validateStep: function (f) {
      var st = Form.steps(f).find(function (x) { return !x.hidden; }); if (!st) return Form.validate(f);
      var seen = {}, list = [];
      $$('input,select,textarea', st).forEach(function (el) {
        if (el.disabled || el.type === 'hidden') return; if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = 1; }
        var ok = quietValid(el), msg = ok ? '' : Form.message(el); Form.mark(el, msg);
        if (!ok) list.push({ el: el, label: Form.label(el), message: msg, step: +st.getAttribute('data-sr-step') });
      });
      Form.render(f, list); return !list.length;
    },
    /* R15 · for forms without a summary: scroll to the first error, focus it, toast naming it */
    report: function (f, list) {
      if (!list.length) return;
      var first = list[0];
      Form.jump(f, first);
      if (w.SRToast) Toast.show({ type: 'error', title: 'Check “' + first.label + '”', text: first.message + (list.length > 1 ? ' (and ' + (list.length - 1) + ' more)' : ''), life: 6000 });
    },
    check: function (f) {
      var seen = {}, list = [];
      $$('input,select,textarea', f).forEach(function (el) {
        if (el.disabled || el.type === 'hidden' || el.type === 'submit' || el.closest('[data-sr-skip]')) return;
        if (el.type === 'radio') { if (seen[el.name]) return; seen[el.name] = 1; }
        var ok = quietValid(el), msg = ok ? '' : Form.message(el); Form.mark(el, msg);
        if (!ok) { var st = el.closest('[data-sr-step]'); list.push({ el: el, label: Form.label(el), message: msg, step: st ? +st.getAttribute('data-sr-step') : 0 }); }
      });
      if ($('[data-sr-error-summary]', f)) Form.render(f, list); else Form.report(f, list);
      return !list.length;
    },
    showErrors: function (f, errs) {
      var list = (errs || []).map(function (x) {
        var el = f.elements[x.field] || d.getElementById(x.field); if (el && el.length && !el.tagName) el = el[0];
        if (el) Form.mark(el, x.message);
        var st = el && el.closest('[data-sr-step]');
        return { el: el, label: x.label || (el ? Form.label(el) : x.field), message: x.message, step: st ? +st.getAttribute('data-sr-step') : 0 };
      });
      if ($('[data-sr-error-summary]', f)) Form.render(f, list); else Form.report(f, list);
    }
  };
  d.addEventListener('click', function (e) {
    var g = e.target.closest('.sr-error-summary__go'); if (g) { var box = g.closest('[data-sr-error-summary]'), f = g.closest('form'); Form.jump(f, box.__list[+g.getAttribute('data-i')]); return; }
    var nx = e.target.closest('[data-sr-next]'); if (nx) { var f1 = nx.closest('form'); if (Form.validateStep(f1)) { Form.render(f1, []); Form.go(f1, Form.current(f1) + 1); } return; }
    var pv = e.target.closest('[data-sr-prev]'); if (pv) { var f2 = pv.closest('form'); Form.go(f2, Form.current(f2) - 1); }
  });
  /* clear a field's error as soon as it becomes valid */
  d.addEventListener('input', function (e) { var el = e.target; if (el.classList && el.classList.contains('is-invalid') && el.checkValidity && quietValid(el)) Form.mark(el, ''); });
  d.addEventListener('change', function (e) { var el = e.target; if (el.type === 'radio' && el.form && quietValid(el)) Form.mark(el, ''); });
  /* forms with data-sr-validate: validate every step on submit, block if invalid */
  d.addEventListener('submit', function (e) { var f = e.target; if (!f.hasAttribute || !f.hasAttribute('data-sr-validate')) return; if (!Form.validate(f)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  /* R15 · novalidate forms get the same field errors (opt out with data-sr-no-validate) */
  d.addEventListener('submit', function (e) { var f = e.target; if (!f.hasAttribute || !f.hasAttribute('novalidate') || f.hasAttribute('data-sr-validate') || f.hasAttribute('data-sr-no-validate')) return; if (!Form.check(f)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  /* forms WITHOUT novalidate: replace the browser bubbles with the same field errors */
  var invalidBatch = null;
  d.addEventListener('invalid', function (e) {
    var el = e.target, f = el.form; if (!f || f.hasAttribute('data-sr-no-validate')) return;
    e.preventDefault();
    if (quietCheck) return;                                   /* our own live checks must never move focus (only a real submit does) */
    if (invalidBatch && invalidBatch.f === f) return;
    invalidBatch = { f: f }; setTimeout(function () { invalidBatch = null; Form.check(f); }, 0);
  }, true);

  /* ---- sr-upload: preview · compression · size check · progress · keeps the file ----
     <label class="sr-upload"><input type="file" accept="image/*" name="photo"><span class="sr-upload__thumb"></span>
       <div><strong>Tap to upload a photo</strong><span>JPG or PNG</span></div><span class="sr-upload__bar"><i></i></span></label>
     <meta name="sr-max-upload" content="5MB"> sets the limit (bytes, KB or MB). */
  function maxUpload() { var m = $('meta[name="sr-max-upload"]'), v = m ? m.getAttribute('content') : '8MB', n = parseFloat(v) || 8; return /mb/i.test(v) ? n * 1048576 : /kb/i.test(v) ? n * 1024 : n; }
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  var Upload = {
    MIN_COMPRESS: 350 * 1024, MAX_DIM: 2000, QUALITY: .82,
    compress: function (file) {
      return new Promise(function (res) {
        if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < Upload.MIN_COMPRESS || !w.createImageBitmap) return res(file);
        createImageBitmap(file).then(function (bmp) {
          var k = Math.min(1, Upload.MAX_DIM / Math.max(bmp.width, bmp.height)), c = d.createElement('canvas');
          c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
          c.toBlob(function (bl) { if (!bl || bl.size >= file.size) return res(file); res(new File([bl], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })); }, 'image/jpeg', Upload.QUALITY);
        }).catch(function () { res(file); });
      });
    },
    set: function (box, state, text) {
      box.classList.remove('is-busy', 'is-done', 'is-error'); if (state) box.classList.add('is-' + state);
      var s = $('strong', box), sub = $(':scope > div > span', box) || $('div span', box);
      if (text) { if (s && text[0] != null) s.textContent = text[0]; if (sub && text[1] != null) sub.textContent = text[1]; }
    },
    handle: function (input) {
      var box = input.closest('.sr-upload'), f = input.files && input.files[0]; if (!box || !f) return;
      if (!box.__orig) { var s0 = $('strong', box), sub0 = $('div span', box); box.__orig = [s0 && s0.textContent, sub0 && sub0.textContent]; }
      Upload.set(box, 'busy', ['Preparing photo…', fmtSize(f.size)]);
      Upload.compress(f).then(function (out) {
        var max = maxUpload();
        if (out.size > max) { input.value = ''; Upload.set(box, 'error', ['File is too large', 'Maximum ' + fmtSize(max) + '. This one is ' + fmtSize(out.size) + '.']); Form.mark(input, 'File is too large'); return; }
        if (out !== f && w.DataTransfer) { try { var dt = new DataTransfer(); dt.items.add(out); input.files = dt.files; } catch (e) {} }
        var t = $('.sr-upload__thumb', box);
        if (t && /^image\//.test(out.type)) { if (box.__url) URL.revokeObjectURL(box.__url); box.__url = URL.createObjectURL(out); t.innerHTML = '<img alt="" src="' + box.__url + '">'; }
        Upload.set(box, 'done', [/^image\//.test(out.type) ? 'Photo received — tap to change' : out.name + ' — tap to change', fmtSize(out.size) + (out !== f ? ' (compressed from ' + fmtSize(f.size) + ')' : '')]);
        Form.mark(input, '');
        input.dispatchEvent(new CustomEvent('sr:upload', { bubbles: true, detail: { file: out, original: f } }));
      });
    },
    /* Send a form with XHR so the page never reloads: a failed field keeps every chosen file.
       SRUpload.send(form, { url, csrf, onProgress }) → Promise<{status, json}> */
    send: function (form, o) {
      o = o || {};
      return new Promise(function (res, rej) {
        var x = new XMLHttpRequest(), bars = $$('.sr-upload__bar', form);
        x.open(form.method || 'POST', o.url || form.action);
        x.setRequestHeader('Accept', 'application/json'); x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        if (o.csrf) x.setRequestHeader('X-CSRF-TOKEN', o.csrf);
        x.upload.onprogress = function (e) { if (!e.lengthComputable) return; var p = Math.round(e.loaded / e.total * 100); bars.forEach(function (b) { b.closest('.sr-upload').classList.add('is-sending'); b.style.setProperty('--p', p + '%'); }); if (o.onProgress) o.onProgress(p); };
        x.onload = function () { bars.forEach(function (b) { b.closest('.sr-upload').classList.remove('is-sending'); }); var j = null; try { j = JSON.parse(x.responseText); } catch (e) {} (x.status < 400 ? res : rej)({ status: x.status, json: j }); };
        x.onerror = function () { rej({ status: 0, json: null }); };
        x.send(new FormData(form));
      });
    }
  };
  d.addEventListener('change', function (e) { if (e.target.type === 'file' && e.target.closest && e.target.closest('.sr-upload')) Upload.handle(e.target); });
  ['dragover', 'dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { var b = e.target.closest && e.target.closest('.sr-upload'); if (!b) return; e.preventDefault(); b.classList.toggle('is-drag', ev === 'dragover'); if (ev === 'drop' && e.dataTransfer.files.length) { var i = $('input[type=file]', b); try { i.files = e.dataTransfer.files; } catch (x) {} Upload.handle(i); } }); });

  /* ---- sr-bulk: "Select all (N on this page)" with indeterminate state ----
     <div class="sr-bulk" data-sr-bulk="users"> <label><input type="checkbox" class="sr-check" data-sr-bulk-all> Select all (<span data-sr-bulk-total></span> on this page)</label>
       <span data-sr-bulk-count></span> <div data-sr-bulk-actions hidden>…</div></div>
     rows: <input type="checkbox" class="sr-check" data-sr-bulk-item="users" value="12">   → fires "sr:bulk" {values} */
  var Bulk = {
    items: function (g) { return $$('input[data-sr-bulk-item="' + g + '"]').filter(function (i) { return !i.disabled; }); },
    update: function (bar) {
      var g = bar.getAttribute('data-sr-bulk'), it = Bulk.items(g), on = it.filter(function (i) { return i.checked; }), all = $('[data-sr-bulk-all]', bar);
      if (all) { all.checked = it.length > 0 && on.length === it.length; all.indeterminate = on.length > 0 && on.length < it.length; all.setAttribute('aria-checked', all.indeterminate ? 'mixed' : String(all.checked)); }
      $$('[data-sr-bulk-total]', bar).forEach(function (t) { t.textContent = it.length; });
      $$('[data-sr-bulk-count]', bar).forEach(function (c) { c.textContent = on.length ? on.length + ' selected' : ''; c.hidden = !on.length; });
      $$('[data-sr-bulk-actions]', bar).forEach(function (a) { a.hidden = !on.length; });
      bar.classList.toggle('has-selection', on.length > 0);
      it.forEach(function (i) { var r = i.closest('tr,.sr-row,li'); if (r) r.classList.toggle('is-selected', i.checked); });
      bar.dispatchEvent(new CustomEvent('sr:bulk', { bubbles: true, detail: { values: on.map(function (i) { return i.value; }) } }));
    },
    scan: function (root) { $$('[data-sr-bulk]', root || d).forEach(Bulk.update); }
  };
  d.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-sr-bulk-all')) { var bar = t.closest('[data-sr-bulk]'); Bulk.items(bar.getAttribute('data-sr-bulk')).forEach(function (i) { i.checked = t.checked; }); Bulk.update(bar); }
    else if (t.hasAttribute && t.hasAttribute('data-sr-bulk-item')) { var b2 = $('[data-sr-bulk="' + t.getAttribute('data-sr-bulk-item') + '"]'); if (b2) Bulk.update(b2); }
  });

  /* ---- sr-promo carousel: swipe, dots, auto-advance (paused on touch/hover/focus, off with reduced motion) ---- */
  var Carousel = {
    init: function (root) {
      if (root.__srCar) return; root.__srCar = true;
      var track = $('.sr-promo-track', root), slides = $$('.sr-promo', track), dots = $('.sr-dots', root); if (!track || !slides.length) return;
      if (dots) dots.innerHTML = slides.map(function (s, i) { s.setAttribute('aria-roledescription', 'slide'); s.setAttribute('aria-label', (i + 1) + ' of ' + slides.length); return '<button type="button" class="sr-dot" aria-label="Show slide ' + (i + 1) + '"></button>'; }).join('');
      var cur = 0, timer = null, paused = false, reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var lock = 0;
      function offsetOf(s) { return s.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - (parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0); }
      var snapT; function unsnap() { track.style.scrollSnapType = 'none'; clearTimeout(snapT); snapT = setTimeout(resnap, 1200); }
      function resnap() { clearTimeout(snapT); track.style.scrollSnapType = ''; }
      function go(i, smooth) { cur = (i + slides.length) % slides.length; lock = Date.now() + 1500; unsnap(); var max = track.scrollWidth - track.clientWidth; track.scrollTo({ left: Math.min(max, Math.max(0, offsetOf(slides[cur]))), behavior: smooth === false || reduce ? 'auto' : 'smooth' }); mark(); }
      function mark() { if (!dots) return; $$('.sr-dot', dots).forEach(function (b, i) { b.setAttribute('aria-current', String(i === cur)); }); }
      function near() { var x = track.scrollLeft, max = track.scrollWidth - track.clientWidth; if (x >= max - 4) return slides.length - 1; var best = 0, bd = 1e9; slides.forEach(function (s, i) { var dd = Math.abs(offsetOf(s) - x); if (dd < bd) { bd = dd; best = i; } }); return best; }
      var st; track.addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(function () { if (Date.now() < lock) return; cur = near(); mark(); }, 80); }, { passive: true });
      track.addEventListener('scrollend', function () { if (track.style.scrollSnapType === 'none') { resnap(); } lock = 0; }, { passive: true });
      track.addEventListener('pointerdown', function () { lock = 0; resnap(); }, { passive: true });
      if (dots) dots.addEventListener('click', function (e) { var b = e.target.closest('.sr-dot'); if (b) { go($$('.sr-dot', dots).indexOf(b)); if (timer) start(); } });   /* a manual pick restarts the timer */
      function start() { stop(); if (reduce || paused || slides.length < 2) return; var ms = +root.getAttribute('data-sr-carousel') || 6000; timer = setInterval(function () { go(cur + 1 >= slides.length || track.scrollLeft >= track.scrollWidth - track.clientWidth - 4 && cur === slides.length - 1 ? 0 : cur + 1); }, ms); }
      function stop() { clearInterval(timer); timer = null; }
      function pause() { paused = true; stop(); } function resume() { paused = false; start(); }
      root.addEventListener('pointerenter', pause); root.addEventListener('pointerleave', resume);
      root.addEventListener('touchstart', pause, { passive: true }); root.addEventListener('touchend', function () { setTimeout(resume, 4000); }, { passive: true });
      root.addEventListener('focusin', pause); root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) resume(); });
      d.addEventListener('visibilitychange', function () { d.hidden ? stop() : start(); });
      mark(); start();
      root.__srCarApi = { go: go, pause: pause, resume: resume };
    },
    scan: function (r) { $$('[data-sr-carousel]', r || d).forEach(Carousel.init); }
  };


  /* ---- dark theme picker: <div data-sr-dark-picker></div> (Theme Studio uses the same cards) ---- */
  var DarkPicker = {
    cards: function () {
      var T = w.SRTheme, D = T.darkThemes, s = T.get(), cur = s.dark && s.dark.theme, h = '', id;
      for (id in D) h += '<button type="button" class="sr-dt" data-t="' + id + '" data-look="' + D[id].look + '" aria-pressed="' + (cur === id) + '"><span class="sr-dt__art"><span class="sr-dt__card"><span class="sr-dt__h"></span><span class="sr-dt__t"></span></span><span class="sr-dt__btn"></span></span><span class="sr-dt__name">' + D[id].name + '<span class="sr-dt__badge">' + D[id].look.charAt(0).toUpperCase() + D[id].look.slice(1) + '</span></span></button>';
      return h;
    },
    aa: function (box) {
      var r = w.SRTheme.audit(), wv = r.worst;
      box.className = 'sr-aa ' + (r.ok ? 'is-ok' : 'is-bad');
      box.innerHTML = '<i class="ph ' + (r.ok ? 'ph-check-circle' : 'ph-warning-circle') + '" aria-hidden="true"></i>' + (r.ok ? 'Text readable (AA)' : 'Low contrast: ' + wv.name) + (wv ? '<small>lowest ' + wv.ratio + ':1 (needs ' + wv.min + ')</small>' : '');
    },
    mount: function (el) {
      if (el.__srDp || !w.SRTheme) return; el.__srDp = 1;
      el.innerHTML = '<div class="sr-dt-grid">' + DarkPicker.cards() + '</div><div class="sr-aa" role="status" aria-live="polite"></div>';
      var aa = $('.sr-aa', el), sync = function () { var s = w.SRTheme.get(); $$('.sr-dt', el).forEach(function (b) { b.setAttribute('aria-pressed', String(!!(s.dark && s.dark.theme === b.dataset.t))); }); DarkPicker.aa(aa); };
      el.addEventListener('click', function (e) { var b = e.target.closest('.sr-dt'); if (!b) return; var on = b.getAttribute('aria-pressed') === 'true'; w.SRTheme.darkTheme(on ? null : b.dataset.t, { scope: el.hasAttribute('data-site') ? 'site' : undefined }); if (!on && !w.SRTheme.isDark()) w.SRTheme.setMode('dark'); });
      d.addEventListener('sr:theme', sync); sync();
    }
  };

  /* =================================================================
     SRStatus: status-check pages (M-Pesa prompts, verification, processing)
     <section class="sr-status" data-sr-status data-state="pending" data-sr-url="/payments/123/status"
              data-sr-timeout="60" data-sr-redirect-delay="1800"> … </section>
     Server answers JSON: { status: "pending"|"success"|"failed"|"cancelled", message?, title?,
                            step?: "sent"|"pin"|"confirm", receipt?: {Label: value, …}, redirect? }
     Or pass a function: SRStatus.mount(el, { check: () => fetch(…).then(r => r.json()) })
     Events on the element: sr:status {state, data}, sr:status-action {action} (resend, change, retry…)
     ================================================================= */
  var Status = {
    FINAL: { success: 1, failed: 1, cancelled: 1 },
    mount: function (el, opt) {
      if (el.__srStatus) return el.__srStatus;
      opt = opt || {};
      var url = opt.url || el.getAttribute('data-sr-url');
      var timeout = (+(opt.timeout || el.getAttribute('data-sr-timeout')) || 60) * 1000;
      var redirectDelay = +(opt.redirectDelay || el.getAttribute('data-sr-redirect-delay') || 1800);
      var check = opt.check || function () {
        return fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin', cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      };
      var t0 = Date.now(), timer = null, tick = null, busy = false, stopped = false, fails = 0, lastState = el.getAttribute('data-state') || 'pending';
      var ring = $('.sr-status-ring', el), live = $('.sr-status__live', el), note = $('[data-sr-status-note]', el), cd = $('[data-sr-countdown]', el);
      var sr = d.createElement('p'); sr.className = 'sr-only'; sr.setAttribute('role', 'status'); sr.setAttribute('aria-live', 'polite'); el.appendChild(sr);
      var orig = { title: ($('[data-sr-status-title]', el) || {}).textContent, text: ($('[data-sr-status-text]', el) || {}).innerHTML, note: note && note.innerHTML,
        steps: $$('.sr-checklist [data-step]', el).map(function (li) { return li.className; }) };
      function interval() { var t = Date.now() - t0; return (t < 20000 ? 2500 : t < 45000 ? 4000 : 6000) + Math.random() * 400; }
      function left() { return Math.max(0, Math.ceil((timeout - (Date.now() - t0)) / 1000)); }
      function setStep(step, failed) {
        var items = $$('.sr-checklist [data-step]', el), idx = items.findIndex(function (li) { return li.getAttribute('data-step') === step; });
        if (idx < 0) return;
        items.forEach(function (li, i) { li.classList.remove('is-done', 'is-current', 'is-failed'); if (i < idx) li.classList.add('is-done'); else if (i === idx) li.classList.add(failed ? 'is-failed' : 'is-current'); });
      }
      function text(sel, v, html) { var n = $(sel, el); if (n && v != null) { if (html) n.innerHTML = v; else n.textContent = v; } }
      function receipt(r) {
        var box = $('[data-sr-receipt]', el); if (!box || !r) return;
        box.innerHTML = Object.keys(r).map(function (k) { return '<div><dt>' + esc(k) + '</dt><dd>' + esc(r[k]) + '</dd></div>'; }).join('');
      }
      function blocks(state) { $$('[data-sr-show]', el).forEach(function (n) { n.hidden = (' ' + n.getAttribute('data-sr-show') + ' ').indexOf(' ' + state + ' ') < 0; }); }
      function set(state, data) {
        data = data || {};
        el.setAttribute('data-state', state); blocks(state);
        if (data.step && state !== 'timeout') setStep(data.step, state === 'failed' || state === 'cancelled');
        if (state === 'success') $$('.sr-checklist [data-step]', el).forEach(function (li) { li.classList.remove('is-current', 'is-failed'); li.classList.add('is-done'); });
        if ((state === 'failed' || state === 'cancelled') && !data.step) { var cur = $('.sr-checklist .is-current', el); if (cur) { cur.classList.remove('is-current'); cur.classList.add('is-failed'); } }
        var title = data.title || el.getAttribute('data-sr-title-' + state);
        if (state === 'pending') title = data.title || orig.title;
        text('[data-sr-status-title]', title);
        var msg = data.message || el.getAttribute('data-sr-text-' + state);
        if (msg) text('[data-sr-status-text]', msg);
        if (data.receipt) receipt(data.receipt);
        if (ring) ring.style.setProperty('--p', state === 'pending' ? String(left() / (timeout / 1000)) : '1');
        if (state !== lastState) { sr.textContent = (title || state) + (msg ? '. ' + msg : ''); lastState = state; }
        el.dispatchEvent(new CustomEvent('sr:status', { bubbles: true, detail: { state: state, data: data } }));
        if (Status.FINAL[state] || state === 'timeout') stop();
        if (state === 'success' && (data.redirect || el.getAttribute('data-sr-redirect'))) {
          var to = data.redirect || el.getAttribute('data-sr-redirect');
          text('[data-sr-status-note]', 'Continuing…');
          setTimeout(function () { w.location.assign(to); }, redirectDelay);
        }
      }
      function countdown() {
        if (stopped) return;
        var s = left();
        if (cd) cd.textContent = s;
        if (ring) ring.style.setProperty('--p', String(s / (timeout / 1000)));
        if (s <= 0) { poll(true); }
      }
      function schedule() { clearTimeout(timer); if (!stopped && !d.hidden) timer = setTimeout(poll, interval()); }
      function poll(final) {
        if (stopped || busy) return;
        if (!navigator.onLine) { offline(); return; }
        busy = true;
        Promise.resolve().then(check).then(function (j) {
          busy = false; fails = 0; if (live) live.classList.remove('is-offline'); if (note && orig.note && !stopped) note.innerHTML = orig.note; cd = $('[data-sr-countdown]', el);
          var st = j && j.status;
          if (st && Status.FINAL[st]) return set(st, j);
          if (j && j.step) setStep(j.step);
          if (final === true || left() <= 0) return set('timeout', j || {});
          schedule();
        }).catch(function () {
          busy = false; fails++;
          if (note) note.textContent = fails > 1 ? 'Connection problem — still checking…' : 'Checking again…';
          if (live) live.classList.add('is-offline');
          if (final === true || left() <= 0) return set('timeout', {});
          schedule();
        });
      }
      function offline() { if (live) live.classList.add('is-offline'); if (note) note.textContent = 'You are offline — we will check as soon as you reconnect.'; }
      function start(reset) {
        if (reset) { t0 = Date.now(); $$('.sr-checklist [data-step]', el).forEach(function (li, i) { li.className = orig.steps[i] || ''; }); text('[data-sr-status-text]', orig.text, true); if (note) note.innerHTML = orig.note; cd = $('[data-sr-countdown]', el); set('pending', {}); }
        stopped = false; clearInterval(tick); tick = setInterval(countdown, 1000); countdown(); schedule();
      }
      function stop() { stopped = true; clearTimeout(timer); clearInterval(tick); }
      function onVis() { if (!d.hidden && !stopped) poll(); else clearTimeout(timer); }
      d.addEventListener('visibilitychange', onVis);
      w.addEventListener('online', function () { if (!stopped) poll(); });
      w.addEventListener('offline', function () { if (!stopped) offline(); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sr-status-action]'); if (!b) return;
        var a = b.getAttribute('data-sr-status-action');
        if (a === 'check') { e.preventDefault(); if (Status.FINAL[lastState]) return; stopped = false; set('pending', { title: 'Checking…' }); t0 = Date.now() - timeout + 15000; start(false); poll(); return; }   /* "I've paid — check again": 15 s grace, never re-charges */
        el.dispatchEvent(new CustomEvent('sr:status-action', { bubbles: true, detail: { action: a, button: b } }));
      });
      var api = { set: set, poll: poll, stop: stop, restart: function () { start(true); }, state: function () { return lastState; } };
      el.__srStatus = api;
      blocks(lastState);
      if (lastState === 'pending') start(false); else set(lastState, {});
      return api;
    },
    scan: function (r) { $$('[data-sr-status]', r || d).forEach(function (el) { if (el.getAttribute('data-sr-url')) Status.mount(el); }); }
  };

  /* =================================================================
     SRLoad: preloader · nav progress · busy · skeletons · offline bar
     ================================================================= */
  var Load = {
    /* first-load splash: <div class="sr-preloader" data-sr-preloader>…</div> right after <body> */
    preloader: function () {
      var p = $('[data-sr-preloader]'); if (!p) return;
      var t0 = (w.performance && performance.now()) || 0, min = 350;
      function hide() { var wait = Math.max(0, min - ((w.performance && performance.now()) - t0)); setTimeout(function () { p.classList.add('is-done'); p.setAttribute('aria-hidden', 'true'); setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 400); }, wait); }
      var fonts = d.fonts && d.fonts.ready ? Promise.race([d.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve();
      if (d.readyState === 'complete') fonts.then(hide); else w.addEventListener('load', function () { fonts.then(hide); });
      setTimeout(hide, 8000);
    },
    /* top progress bar: SRLoad.start() … SRLoad.done(). Automatic for links and forms with <body data-sr-nav-progress> */
    bar: null, trickle: null, pct: 0,
    start: function () {
      if (!Load.bar) { Load.bar = d.createElement('div'); Load.bar.className = 'sr-nav-progress'; Load.bar.setAttribute('role', 'progressbar'); Load.bar.setAttribute('aria-label', 'Loading page'); d.body.appendChild(Load.bar); }
      clearInterval(Load.trickle); Load.pct = 8; Load.bar.classList.add('is-on'); Load.bar.style.width = Load.pct + '%';
      Load.trickle = setInterval(function () { Load.pct += (90 - Load.pct) * .08; Load.bar.style.width = Load.pct + '%'; }, 250);
    },
    done: function () {
      if (!Load.bar) return; clearInterval(Load.trickle); Load.bar.style.width = '100%';
      setTimeout(function () { Load.bar.classList.remove('is-on'); setTimeout(function () { Load.bar.style.width = '0'; }, 300); }, 200);
    },
    /* busy overlay: SRLoad.busy(card, promiseOrFn, { delay: 300, min: 500 }) → same promise result */
    busy: function (el, work, o) {
      o = o || {}; var delay = o.delay == null ? 300 : o.delay, min = o.min == null ? 500 : o.min, shownAt = 0, finished = false;
      el.classList.add('sr-busy-host');
      var t = setTimeout(function () { if (!finished) { el.setAttribute('aria-busy', 'true'); shownAt = Date.now(); } }, delay);
      var p = Promise.resolve(typeof work === 'function' ? work() : work);
      function end() { finished = true; clearTimeout(t); var wait = shownAt ? Math.max(0, min - (Date.now() - shownAt)) : 0; return new Promise(function (r) { setTimeout(function () { el.removeAttribute('aria-busy'); r(); }, wait); }); }
      return p.then(function (v) { return end().then(function () { return v; }); }, function (e) { return end().then(function () { throw e; }); });
    },
    /* skeletons: SRLoad.skeleton(container, 'rows'|'tiles'|'stats'|'table', count) */
    skeleton: function (el, type, n) {
      n = n || 4; var h = '', i, L = function (c) { return '<span class="sr-skel sr-skel--line ' + (c || '') + '"></span>'; };
      for (i = 0; i < n; i++) {
        if (type === 'stats') h += '<span class="sr-skel sr-skel-stat"></span>';
        else if (type === 'tiles') h += '<div class="sr-skel-tile"><span class="sr-skel sr-skel--box"></span><div>' + L('sr-skel--w40') + L('sr-skel--w80') + L('sr-skel--w60') + '</div></div>';
        else if (type === 'table') h += '<div>' + L() + L() + L('sr-skel--w60') + '</div>';
        else h += '<div class="sr-skel-row"><span class="sr-skel sr-skel--circle"></span><div>' + L('sr-skel--w60') + L('sr-skel--w40') + '</div></div>';
      }
      el.innerHTML = '<div class="' + (type === 'table' ? 'sr-skel-table' : 'sr-skel-list') + '" aria-hidden="true">' + h + '</div><span class="sr-only">Loading…</span>';
      el.setAttribute('aria-busy', 'true');
      return function done(html) { el.removeAttribute('aria-busy'); if (html != null) el.innerHTML = html; };
    },
    /* offline bar: automatic */
    offline: function () {
      var bar;
      function show(on) {
        if (!bar) { bar = d.createElement('div'); bar.className = 'sr-offline-bar'; bar.setAttribute('role', 'status'); bar.innerHTML = '<i class="ph ph-wifi-slash" aria-hidden="true"></i><span>You’re offline · reconnecting…</span>'; d.body.appendChild(bar); }
        bar.classList.toggle('is-on', on);
        if (!on && w.SRToast) Toast.show({ type: 'success', title: 'Back online', life: 2500 });
      }
      w.addEventListener('offline', function () { show(true); });
      w.addEventListener('online', function () { if (bar && bar.classList.contains('is-on')) show(false); });
      if (navigator.onLine === false) show(true);
    }
  };
  /* auto progress for same-origin navigation when <body data-sr-nav-progress> */
  d.addEventListener('click', function (e) {
    if (!d.body || !d.body.hasAttribute('data-sr-nav-progress')) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self' || a.hasAttribute('download') || a.hasAttribute('data-no-progress')) return;
    var u = new URL(a.href, location.href); if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
    setTimeout(function () { if (!e.defaultPrevented) Load.start(); }, 0);
  });
  d.addEventListener('submit', function (e) { if (!d.body || !d.body.hasAttribute('data-sr-nav-progress')) return; setTimeout(function () { if (!e.defaultPrevented) Load.start(); }, 0); });
  w.addEventListener('pageshow', function () { Load.done(); });
  Load.preloader();
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', Load.offline); else Load.offline();

  /* =================================================================
     SRChat: bubbles · day separators · unread line · ticks · optimistic send + retry · swipe to reply ·
     long-press sheet · reactions · attachments · search · drafts · typing · polling · AI + human handoff
     Server (default HTTP transport, base = data-sr-chat-url):
       GET  base/messages?after=ID → { messages:[…], typing:bool, peer:{name,status}, ai:bool, handoff:bool }
       POST base/messages (body, reply_to, client_id, file) → { message }   POST base/typing · base/read {up_to}
       POST base/react {id, emoji} → { message }   POST base/delete {id}   POST base/handoff
     Message: { id, client_id, from:'me'|'them'|'ai'|'system', author, body, at, status:'sent'|'delivered'|'read',
                reply_to:{id,author,body}, reactions:{'👍':{n:2,mine:true}}, attachment:{url,name,type,size}, unread, deleted }
     ================================================================= */
  function csrf() { var m = $('meta[name="csrf-token"]'); return m ? m.getAttribute('content') : ''; }
  var Chat = {
    httpTransport: function (base) {
      function post(path, data) {
        var fd = data instanceof FormData ? data : new FormData(); if (!(data instanceof FormData)) Object.keys(data || {}).forEach(function (k) { if (data[k] != null) fd.append(k, data[k]); });
        fd.append('_csrf', csrf());
        return fetch(base + path, { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-Token': csrf() } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      }
      return {
        list: function (after) { return fetch(base + '/messages?after=' + encodeURIComponent(after || 0), { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); },
        send: function (m, file) { var fd = new FormData(); fd.append('body', m.body || ''); fd.append('client_id', m.client_id); if (m.reply_to) fd.append('reply_to', m.reply_to.id); if (file) fd.append('file', file); return post('/messages', fd); },
        typing: function () { return post('/typing', {}); }, read: function (id) { return post('/read', { up_to: id }); },
        react: function (id, e) { return post('/react', { id: id, emoji: e }); }, remove: function (id) { return post('/delete', { id: id }); },
        handoff: function () { return post('/handoff', {}); }
      };
    },
    mount: function (el, opt) {
      if (el.__srChat) return el.__srChat; opt = opt || {};
      var T = opt.transport || Chat.httpTransport(el.getAttribute('data-sr-chat-url'));
      var list = $('[data-sr-chat-list]', el), form = $('[data-sr-chat-form]', el), input = $('[data-sr-chat-input]', el), send = $('button[type=submit],.sr-chat__send', form);
      var replyBox = $('[data-sr-chat-reply]', el), typingEl = $('[data-sr-chat-typing]', el), fileIn = $('[data-sr-chat-file]', el), statusEl = $('[data-sr-chat-status]', el), aiBar = $('[data-sr-chat-ai]', el);
      var key = 'sr-chat-draft:' + (el.getAttribute('data-sr-chat-url') || el.id || 'chat');
      var msgs = [], byKey = {}, lastId = 0, replyTo = null, pollT = null, fails = 0, unreadShown = false, lastTyping = 0, files = {};
      var EMOJI = (el.getAttribute('data-sr-chat-emoji') || '👍 ❤️ 😂 😮 🙏 ✅').split(' ');
      function k(m) { return m.client_id || ('id' + m.id); }
      function fmtTime(s) { var dt = new Date(s); return isNaN(dt) ? '' : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
      function dayLabel(s) { var dt = new Date(s), t = new Date(); t.setHours(0, 0, 0, 0); var x = new Date(dt); x.setHours(0, 0, 0, 0); var diff = (t - x) / 864e5; return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : dt.toLocaleDateString([], { weekday: diff < 7 ? 'long' : undefined, day: 'numeric', month: 'short', year: dt.getFullYear() !== t.getFullYear() ? 'numeric' : undefined }); }
      function linkify(s) { return esc(s).replace(/\bhttps?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>'; }).replace(/\n/g, '<br>'); }
      function tick(m) {
        if (m.from !== 'me') return '';
        var i = m.status === 'sending' ? 'ph-clock' : m.status === 'failed' ? 'ph-warning-circle' : m.status === 'sent' ? 'ph-check' : 'ph-checks';
        var lbl = { sending: 'Sending', failed: 'Not sent', sent: 'Sent', delivered: 'Delivered', read: 'Read' }[m.status] || '';
        return '<span class="sr-tick' + (m.status === 'read' ? ' is-read' : '') + '" title="' + lbl + '"><i class="ph ' + i + '" aria-hidden="true"></i><span class="sr-only">' + lbl + '</span></span>';
      }
      function html(m, prev) {
        if (m.from === 'system') return '<div class="sr-msg is-system" data-k="' + k(m) + '"><div class="sr-msg__bubble">' + esc(m.body) + '</div></div>';
        var cont = prev && prev.from === m.from && prev.author === m.author && (new Date(m.at) - new Date(prev.at)) < 5 * 60e3 && dayLabel(prev.at) === dayLabel(m.at);
        var h = '<div class="sr-msg is-' + m.from + (cont ? ' is-cont' : '') + (m.status === 'failed' ? ' is-failed' : '') + '" data-k="' + k(m) + '" tabindex="0" aria-label="' + esc((m.from === 'me' ? 'You' : (m.author || '')) + ': ' + (m.deleted ? 'deleted message' : (m.body || 'attachment'))) + '">';
        h += '<i class="ph ph-arrow-bend-up-left sr-msg__swipe" aria-hidden="true"></i>';
        if (!cont && m.from !== 'me' && m.author) h += '<span class="sr-msg__author">' + esc(m.author) + (m.from === 'ai' ? ' · AI' : '') + '</span>';
        h += '<div class="sr-msg__bubble">';
        if (m.reply_to) h += '<div class="sr-msg__quote"><b>' + esc(m.reply_to.author || '') + '</b><span>' + esc(m.reply_to.body || 'Attachment') + '</span></div>';
        var a = m.attachment;
        if (a && !m.deleted) h += /^image\//.test(a.type || '') ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener"><img class="sr-msg__img" src="' + esc(a.url) + '" alt="' + esc(a.name || 'Image') + '" loading="lazy"></a>' : '<a class="sr-msg__file" href="' + esc(a.url) + '" target="_blank" rel="noopener"><i class="ph ph-file-text" aria-hidden="true"></i><span>' + esc(a.name || 'File') + '</span></a>';
        h += '<div class="sr-msg__body">' + (m.deleted ? '<i>This message was deleted</i>' : linkify(m.body || '')) + '</div>';
        h += '<div class="sr-msg__meta">' + fmtTime(m.at) + tick(m) + '</div></div>';
        var r = m.reactions || {}, rk = Object.keys(r).filter(function (e) { return r[e] && r[e].n; });
        if (rk.length) h += '<div class="sr-msg__reacts">' + rk.map(function (e) { return '<button type="button" data-react="' + e + '" class="' + (r[e].mine ? 'is-mine' : '') + '" aria-label="' + e + ' ' + r[e].n + '">' + e + ' ' + r[e].n + '</button>'; }).join('') + '</div>';
        if (m.status === 'failed') h += '<button type="button" class="sr-msg__retry" data-retry><i class="ph ph-arrow-clockwise" aria-hidden="true"></i>Not sent · tap to retry</button>';
        return h + '</div>';
      }
      function nearBottom() { return list.scrollHeight - list.scrollTop - list.clientHeight < 120; }
      function toBottom(smooth) { list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); hideNew(); }
      var newPill;
      function showNew() { if (!newPill) { newPill = d.createElement('button'); newPill.type = 'button'; newPill.className = 'sr-chat__new'; newPill.textContent = 'New messages ↓'; newPill.addEventListener('click', function () { toBottom(true); }); el.appendChild(newPill); } newPill.hidden = false; }
      function hideNew() { if (newPill) newPill.hidden = true; }
      list.addEventListener('scroll', function () { if (nearBottom()) hideNew(); }, { passive: true });
      function render() {
        var h = '', prev = null, firstUnread = msgs.findIndex(function (m) { return m.unread && m.from !== 'me'; });
        msgs.forEach(function (m, i) {
          if (!prev || dayLabel(prev.at) !== dayLabel(m.at)) { h += '<div class="sr-chat__day" role="separator">' + esc(dayLabel(m.at)) + '</div>'; prev = null; }
          if (i === firstUnread) h += '<div class="sr-chat__unread" role="separator">Unread messages</div>';
          h += html(m, prev); prev = m;
        });
        list.innerHTML = h;
        if (firstUnread > -1 && !unreadShown) { unreadShown = true; var u = $('.sr-chat__unread', list); if (u) list.scrollTop = u.offsetTop - 40; }
      }
      function upsert(arr, initial) {
        var stick = nearBottom(), added = 0;
        arr.forEach(function (m) {
          var key = byKey[m.client_id] ? m.client_id : (byKey['id' + m.id] ? 'id' + m.id : null);
          if (key) { Object.assign(byKey[key], m); if (key !== k(byKey[key])) { byKey[k(byKey[key])] = byKey[key]; } }
          else { msgs.push(m); byKey[k(m)] = m; added++; }
          if (m.id && m.id > lastId) lastId = m.id;
        });
        msgs.sort(function (a, b) { return new Date(a.at) - new Date(b.at); });
        render();
        if (initial) { if (!$('.sr-chat__unread', list)) toBottom(false); }
        else if (stick) toBottom(true); else if (added) showNew();
        var lastThem = msgs.filter(function (m) { return m.from !== 'me' && m.id; }).pop();
        if (lastThem && !d.hidden && T.read) T.read(lastThem.id).catch(function () {});
      }
      function apply(res, initial) {
        if (!res) return;
        if (res.messages) upsert(res.messages, initial);
        if (typingEl) typingEl.hidden = !res.typing;
        if (statusEl && res.peer) { statusEl.textContent = res.typing ? 'typing…' : (res.peer.status || ''); statusEl.classList.toggle('is-online', /online/i.test(res.peer.status || '')); }
        if (aiBar && 'ai' in res) { aiBar.hidden = !res.ai; var hb = $('[data-sr-chat-handoff]', aiBar), note = $('[data-sr-chat-ai-text]', aiBar); if (res.handoff) { if (hb) hb.hidden = true; if (note) note.textContent = 'A person will join this chat shortly.'; } }
      }
      function poll() {
        clearTimeout(pollT);
        T.list(lastId).then(function (res) { fails = 0; apply(res); }).catch(function () { fails++; }).then(function () {
          if (!d.hidden) pollT = setTimeout(poll, Math.min(15000, 3000 * Math.pow(1.6, fails)));
        });
      }
      d.addEventListener('visibilitychange', function () { if (!d.hidden) poll(); else clearTimeout(pollT); });
      /* composer */
      function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 144) + 'px'; send.disabled = !input.value.trim() && !(fileIn && fileIn.files && fileIn.files.length); }
      function setReply(m) {
        replyTo = m; if (!replyBox) return;
        if (!m) { replyBox.hidden = true; return; }
        replyBox.innerHTML = '<i class="ph ph-arrow-bend-up-left" aria-hidden="true"></i><div><b>Replying to ' + esc(m.from === 'me' ? 'yourself' : (m.author || '')) + '</b><span>' + esc(m.body || 'Attachment') + '</span></div><button type="button" class="sr-icon-btn" data-reply-cancel aria-label="Cancel reply"><i class="ph ph-x"></i></button>';
        replyBox.hidden = false; input.focus({ preventScroll: true });
      }
      function doSend(m, file) {
        m.status = 'sending'; upsert([m]); toBottom(true);
        T.send(m, file).then(function (res) { var s = res && res.message || {}; s.client_id = m.client_id; if (!s.status) s.status = 'sent'; delete files[m.client_id]; upsert([s]); })
          .catch(function () { m.status = 'failed'; upsert([m]); });
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var body = input.value.trim(), file = fileIn && fileIn.files && fileIn.files[0];
        if (!body && !file) return;
        var m = { client_id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: 'me', body: body, at: new Date().toISOString(), reply_to: replyTo ? { id: replyTo.id, author: replyTo.from === 'me' ? 'You' : replyTo.author, body: replyTo.body } : null };
        if (file) { m.attachment = { url: URL.createObjectURL(file), name: file.name, type: file.type, size: file.size }; files[m.client_id] = file; fileIn.value = ''; }
        input.value = ''; try { localStorage.removeItem(key); } catch (x) {}
        setReply(null); autosize(); doSend(m, file);
      });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !isPhone()) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); } });
      input.addEventListener('input', function () {
        autosize(); try { input.value ? localStorage.setItem(key, input.value) : localStorage.removeItem(key); } catch (x) {}
        if (T.typing && Date.now() - lastTyping > 3000 && input.value) { lastTyping = Date.now(); T.typing().catch(function () {}); }
      });
      var attach = $('[data-sr-chat-attach]', el); if (attach && fileIn) { attach.addEventListener('click', function () { fileIn.click(); }); fileIn.addEventListener('change', function () { autosize(); if (fileIn.files[0]) form.requestSubmit ? form.requestSubmit() : null; }); }
      try { var dr = localStorage.getItem(key); if (dr) input.value = dr; } catch (x) {}
      autosize();
      /* bubbles: retry · reactions · reply cancel */
      el.addEventListener('click', function (e) {
        var mEl = e.target.closest('.sr-msg'), m = mEl && byKey[mEl.getAttribute('data-k')];
        if (e.target.closest('[data-retry]') && m) { doSend(m, files[m.client_id]); return; }
        var rb = e.target.closest('[data-react]'); if (rb && m) { react(m, rb.getAttribute('data-react')); return; }
        if (e.target.closest('[data-reply-cancel]')) { setReply(null); return; }
        if (e.target.closest('[data-sr-chat-handoff]')) { var b = e.target.closest('[data-sr-chat-handoff]'); b.disabled = true; T.handoff().then(apply).catch(function () { b.disabled = false; }); return; }
        if (e.target.closest('[data-sr-chat-search-toggle]')) { var sb = $('.sr-chat__search', el); if (sb) { sb.hidden = !sb.hidden; if (!sb.hidden) $('input', sb).focus({ preventScroll: true }); else search(''); } }
      });
      function react(m, emo) {
        m.reactions = m.reactions || {}; var r = m.reactions[emo] || { n: 0, mine: false };
        r.mine ? (r.n--, r.mine = false) : (r.n++, r.mine = true); m.reactions[emo] = r; upsert([m]);
        if (T.react && m.id) T.react(m.id, emo).then(function (res) { if (res && res.message) upsert([res.message]); }).catch(function () {});
      }
      /* long-press / right-click / context-menu key → action sheet (in <body>) */
      function sheet(m) {
        if (!m || m.from === 'system') return;
        var s = d.createElement('div'); s.className = 'sr-chat-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', 'Message actions');
        s.innerHTML = '<div class="sr-chat-sheet__card"><div class="sr-chat-sheet__emoji">' + EMOJI.map(function (x) { return '<button type="button" data-e="' + x + '" aria-label="React ' + x + '">' + x + '</button>'; }).join('') + '</div>' +
          '<button type="button" class="sr-chat-sheet__item" data-a="reply"><i class="ph ph-arrow-bend-up-left"></i>Reply</button>' +
          (m.body ? '<button type="button" class="sr-chat-sheet__item" data-a="copy"><i class="ph ph-copy"></i>Copy text</button>' : '') +
          (m.from === 'me' && m.id && !m.deleted ? '<button type="button" class="sr-chat-sheet__item is-danger" data-a="delete"><i class="ph ph-trash"></i>Delete for everyone</button>' : '') + '</div>';
        d.body.appendChild(s);
        var first = $('button', s); if (first) first.focus({ preventScroll: true });
        function close() { s.remove(); d.removeEventListener('keydown', esc1); }
        function esc1(e) { if (e.key === 'Escape') close(); }
        d.addEventListener('keydown', esc1);
        s.addEventListener('click', function (e) {
          if (e.target === s) return close();
          var em = e.target.closest('[data-e]'); if (em) { react(m, em.getAttribute('data-e')); return close(); }
          var a = e.target.closest('[data-a]'); if (!a) return; a = a.getAttribute('data-a');
          if (a === 'reply') setReply(m);
          if (a === 'copy' && navigator.clipboard) navigator.clipboard.writeText(m.body).then(function () { if (w.SRToast) Toast.show({ type: 'success', title: 'Copied', life: 1500 }); });
          if (a === 'delete') { m.deleted = true; m.body = ''; upsert([m]); T.remove && T.remove(m.id).catch(function () {}); }
          close();
        });
      }
      var lp = null, sx = 0, sy = 0, dx = 0, swiping = null;
      list.addEventListener('pointerdown', function (e) {
        var mEl = e.target.closest('.sr-msg'); if (!mEl || e.target.closest('a,button')) return;
        sx = e.clientX; sy = e.clientY; dx = 0; swiping = mEl;
        lp = setTimeout(function () { lp = null; swiping = null; if (navigator.vibrate) navigator.vibrate(10); sheet(byKey[mEl.getAttribute('data-k')]); }, 480);
      });
      list.addEventListener('pointermove', function (e) {
        if (!swiping) return; dx = e.clientX - sx; var dy = Math.abs(e.clientY - sy);
        if (Math.abs(dx) > 8 || dy > 8) { clearTimeout(lp); lp = null; }
        if (dy > 24) { reset(); return; }
        var dir = swiping.classList.contains('is-me') ? -1 : 1, v = Math.max(0, Math.min(70, dx * dir));
        $('.sr-msg__bubble', swiping).style.transform = 'translateX(' + (v * dir) + 'px)'; $('.sr-msg__swipe', swiping).style.opacity = v / 60;
      });
      function reset() { if (swiping) { var b = $('.sr-msg__bubble', swiping); if (b) b.style.transform = ''; var i = $('.sr-msg__swipe', swiping); if (i) i.style.opacity = 0; } swiping = null; }
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { list.addEventListener(ev, function () { clearTimeout(lp); lp = null; if (swiping) { var dir = swiping.classList.contains('is-me') ? -1 : 1; if (dx * dir > 55) setReply(byKey[swiping.getAttribute('data-k')]); } reset(); }); });
      list.addEventListener('contextmenu', function (e) { var mEl = e.target.closest('.sr-msg'); if (!mEl || e.target.closest('a')) return; e.preventDefault(); sheet(byKey[mEl.getAttribute('data-k')]); });
      list.addEventListener('keydown', function (e) { var mEl = e.target.closest && e.target.closest('.sr-msg'); if (!mEl) return; if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10') || e.key === 'Enter') { e.preventDefault(); sheet(byKey[mEl.getAttribute('data-k')]); } });
      /* search */
      var sIn = $('[data-sr-chat-search]', el), hits = $('[data-sr-chat-hits]', el), hitList = [], hitIdx = 0;
      function search(q) {
        q = norm(q.trim()); $$('.sr-msg__body', list).forEach(function (b) { b.innerHTML = b.innerHTML.replace(/<\/?mark>/g, ''); });
        hitList = []; if (!q) { if (hits) hits.textContent = ''; return; }
        $$('.sr-msg', list).forEach(function (mEl) { var m = byKey[mEl.getAttribute('data-k')]; if (m && m.body && norm(m.body).indexOf(q) > -1) { hitList.push(mEl); var b = $('.sr-msg__body', mEl); var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'); b.innerHTML = b.innerHTML.replace(re, '<mark>$1</mark>'); } });
        hitIdx = hitList.length - 1; if (hits) hits.textContent = hitList.length ? hitList.length + ' found' : 'No matches';
        if (hitList[hitIdx]) hitList[hitIdx].scrollIntoView({ block: 'center' });
      }
      if (sIn) { sIn.addEventListener('input', function () { search(sIn.value); }); sIn.addEventListener('keydown', function (e) { if (e.key === 'Enter' && hitList.length) { e.preventDefault(); hitIdx = (hitIdx - 1 + hitList.length) % hitList.length; hitList[hitIdx].scrollIntoView({ block: 'center' }); hitList[hitIdx].focus({ preventScroll: true }); } }); }
      /* go */
      T.list(0).then(function (res) { apply(res, true); }).catch(function () { list.innerHTML = '<div class="sr-msg is-system"><div class="sr-msg__bubble">Could not load messages. Retrying…</div></div>'; }).then(function () { pollT = setTimeout(poll, 3000); });
      var api = { add: function (m) { upsert([m]); }, apply: apply, poll: poll, reply: setReply, messages: function () { return msgs; } };
      el.__srChat = api; return api;
    },
    scan: function (r) { $$('[data-sr-chat][data-sr-chat-url]', r || d).forEach(function (el) { Chat.mount(el); }); }
  };
  /* R13 · measured heights for full-screen layouts (chat): --sr-app-h on <html>, --sr-fill-h on [data-sr-fill] */
  var Viewport = {
    update: function () {
      var vv = w.visualViewport, h = Math.round(vv ? vv.height : w.innerHeight);
      d.documentElement.style.setProperty('--sr-app-h', h + 'px');
      $$('[data-sr-fill]').forEach(function (el) {
        var top = el.getBoundingClientRect().top + (w.scrollY || 0), bottom = 0, tb = $('.sr-tabbar');
        if (tb && getComputedStyle(tb).display !== 'none' && !el.hasAttribute('data-sr-fill-over-tabbar')) bottom = tb.getBoundingClientRect().height + 12;
        bottom += +(el.getAttribute('data-sr-fill-offset') || 0);
        el.style.setProperty('--sr-fill-h', Math.max(240, h - top - bottom) + 'px');
      });
    }
  };
  var vpT; function vpLater() { clearTimeout(vpT); vpT = setTimeout(Viewport.update, 60); }
  w.addEventListener('resize', vpLater); if (w.visualViewport) w.visualViewport.addEventListener('resize', vpLater);
  w.addEventListener('orientationchange', vpLater); w.addEventListener('load', Viewport.update);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(Viewport.update);

  function scanAll(root) { Viewport.update(); Combo.scan(root); Bulk.scan(root); Carousel.scan(root); Status.scan(root); Chat.scan(root); $$('[data-sr-dark-picker]', root || d).forEach(DarkPicker.mount); $$('form[data-sr-steps]', root || d).forEach(function (f) { if (!f.__srSteps) { f.__srSteps = 1; Form.go(f, 1); } }); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { scanAll(); }); else scanAll();
  w.SRCombo = Combo; w.SRForm = Form; w.SRUpload = Upload; w.SRBulk = Bulk; w.SRCarousel = Carousel; w.SRDarkPicker = DarkPicker; w.SRStatus = Status; w.SRLoad = Load; w.SRViewport = Viewport; w.SRChat = Chat; w.SRPortal = portal; w.SRScan = scanAll;

  w.SRToast = Toast; w.SRStudio = Studio;
})(window, document);

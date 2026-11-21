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
      function row(k, label, v) { return '<div class="sr-color-row"><label for="sr-c-' + k + '">' + label + '</label><code data-code="' + k + '">' + v + '</code><input id="sr-c-' + k + '" type="color" value="' + v + '" data-color="' + k + '"></div>'; }
      var sync = function () {
        var s = T.get();
        $$('[data-preset]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.preset === b.dataset.preset)); });
        $$('[data-color]', el).forEach(function (i) { i.value = s[i.dataset.color]; $('[data-code="' + i.dataset.color + '"]', el).textContent = s[i.dataset.color]; });
        $$('[data-mode] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.mode === b.dataset.v)); });
        $$('[data-font] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String(s.font === b.dataset.v)); });
        $$('[data-iconset] button', el).forEach(function (b) { b.setAttribute('aria-pressed', String((s.icons || 'heroicons') === b.dataset.v)); });
        $('[data-radius]', el).value = s.radius;
      };
      d.addEventListener('sr:theme', sync);
      el.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.dataset.preset) T.preset(b.dataset.preset, { scope: 'site' });
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


  /* ================= v2: MOTION + COMPONENTS ================= */
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
  var Modal = {
    open: function (id) { var m = d.getElementById(id); if (!m) return; lastFocus = d.activeElement; m.hidden = false; d.body.style.overflow = 'hidden'; var f = $('input,select,textarea,button:not([data-sr-modal-close])', m); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 50); },
    close: function (m) { m = typeof m === 'string' ? d.getElementById(m) : m; if (!m) return; m.hidden = true; d.body.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); }
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

  w.SRToast = Toast; w.SRStudio = Studio;
})(window, document);

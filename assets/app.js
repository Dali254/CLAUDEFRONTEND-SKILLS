/* App script (CSP-safe: no inline code). Flash messages arrive as a JSON data island and show as kit toasts. */
(function () {
  var f = document.getElementById('sr-flash');
  if (f && window.SRToast) { try { JSON.parse(f.textContent).forEach(function (t) { SRToast.show({ type: t.type, title: t.title, text: t.text }); }); } catch (e) {} }
  /* confirm dangerous buttons: <button data-confirm="Delete this user?"> (uses a kit modal-free confirm sheet) */
  document.addEventListener('submit', function (e) {
    var b = e.submitter || e.target.querySelector('[data-confirm]'); var msg = (b && b.getAttribute && b.getAttribute('data-confirm')) || e.target.getAttribute('data-confirm');
    if (msg && !e.target.__confirmed && !window.confirm(msg)) { e.preventDefault(); }
  });
  /* <form data-sr-busy="Sending…">: after validation passes, the submit button shows the kit loader and cannot be pressed twice */
  document.addEventListener('submit', function (e) {
    var f = e.target, txt = f.getAttribute && f.getAttribute('data-sr-busy'); if (!txt) return;
    setTimeout(function () {
      if (e.defaultPrevented) return;
      var b = e.submitter || f.querySelector('button:not([type=button])'); if (!b) return;
      b.classList.add('is-loading'); b.setAttribute('aria-busy', 'true'); b.disabled = true; b.textContent = txt;
    }, 0);
  });
  /* <b data-sr-eta data-sr-eta-s="540">: live "9 min" / "45 s" countdown on waiting screens */
  document.querySelectorAll('[data-sr-eta-s]').forEach(function (n) {
    var end = Date.now() + (+n.getAttribute('data-sr-eta-s')) * 1000;
    (function tick() { var s = Math.max(0, Math.round((end - Date.now()) / 1000)); n.textContent = s >= 90 ? Math.ceil(s / 60) + ' min' : s > 0 ? s + ' s' : 'a moment'; if (s > 0) setTimeout(tick, 1000); })();
  });
  /* share panel: <section data-sr-share data-base data-code data-text> with [data-share-path] select, [data-share-to=wa|fb|tg|x] links, [data-share-native] */
  document.querySelectorAll('[data-sr-share]').forEach(function (box) {
    var base = box.getAttribute('data-base').replace(/\/$/, ''), code = box.getAttribute('data-code'), text = box.getAttribute('data-text') || '';
    var sel = box.querySelector('[data-share-path]'), out = box.querySelector('[data-share-link]'), copy = box.querySelector('[data-share-copy]'), nat = box.querySelector('[data-share-native]');
    var to = { wa: function (u) { return 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + u); }, fb: function (u) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u); },
               tg: function (u) { return 'https://t.me/share/url?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(text); }, x: function (u) { return 'https://x.com/intent/post?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(text); } };
    function link() { var p = (sel && sel.value) || '/'; return base + p + (p.indexOf('?') < 0 ? '?' : '&') + 'ref=' + encodeURIComponent(code); }
    function update() { var u = link(); if (out) out.value = u; if (copy) copy.setAttribute('data-sr-copy', u); box.querySelectorAll('[data-share-to]').forEach(function (a) { a.href = to[a.getAttribute('data-share-to')](u); }); }
    if (sel) sel.addEventListener('change', update); update();
    if (nat && navigator.share) { nat.hidden = false; nat.addEventListener('click', function () { navigator.share({ title: document.title, text: text, url: link() }).catch(function () {}); }); }
  });
  /* dependent selects: <select data-sr-depends="country_id" data-sr-source="/geo/provinces/"> reloads when the parent changes (JSON {id: name}) */
  document.querySelectorAll('select[data-sr-depends]').forEach(function (sel) {
    var form = sel.form || document, parent = form.querySelector('[name="' + sel.getAttribute('data-sr-depends') + '"]'), src = sel.getAttribute('data-sr-source');
    if (!parent) return;
    function load() {
      var keep = sel.value, first = sel.querySelector('option[value=""]');
      sel.innerHTML = ''; if (first) sel.appendChild(first);
      sel.disabled = !parent.value;
      var done = function () { if (sel.__srComboApi) sel.__srComboApi.refresh(); };
      if (!parent.value) return done();
      fetch(src + encodeURIComponent(parent.value), { headers: { Accept: 'application/json' }, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (o) {
        Object.keys(o).sort(function (a, b) { return o[a].localeCompare(o[b]); }).forEach(function (k) { var op = document.createElement('option'); op.value = k; op.textContent = o[k]; if (k === keep) op.selected = true; sel.appendChild(op); });
        done();
      }).catch(done);
    }
    parent.addEventListener('change', load); if (!sel.options.length || sel.options.length < 2) load();
  });
  /* PWA: register the service worker, push opt-in buttons [data-sr-push], install prompt [data-sr-install] */
  var vapid = document.querySelector('meta[name="sr-vapid"]'), base = (document.querySelector('meta[name="sr-base"]') || { content: '' }).content || '';
  if (vapid && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(base + '/sw.js', { scope: base + '/' }).catch(function () {});
    var canPush = 'PushManager' in window && 'Notification' in window;
    function key(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var raw = atob(s + '==='.slice((s.length + 3) % 4)), a = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a; }
    function csrf() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.content : ''; }
    function subscribe(btn) {
      return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(vapid.content) }); })
        .then(function (sub) { return fetch(base + '/push/subscribe', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() }, body: JSON.stringify(sub) }); })
        .then(function (r) { if (!r.ok) throw new Error(); if (window.SRToast) SRToast.show({ type: 'success', title: 'Notifications on', text: 'You will get alerts on this device.' }); document.querySelectorAll('[data-sr-push-card]').forEach(function (c) { c.hidden = true; }); });
    }
    if (canPush && Notification.permission !== 'denied') navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (s) { if (!s) document.querySelectorAll('[data-sr-push-card]').forEach(function (c) { c.hidden = false; }); }).catch(function () {});
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sr-push]'); if (!b) return;
      if (!canPush) { if (window.SRToast) SRToast.show({ type: 'warning', title: 'Not supported here', text: 'On iPhone, add the app to your home screen first.' }); return; }
      var run = function () { return Notification.requestPermission().then(function (p) { if (p !== 'granted') throw new Error('denied'); return subscribe(b); }); };
      (window.SRButton ? SRButton.run(b, run) : run()).catch(function () { if (window.SRToast) SRToast.show({ type: 'warning', title: 'Notifications are blocked', text: 'Allow them in your browser settings for this site.' }); });
    });
  }
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; document.querySelectorAll('[data-sr-install-card]').forEach(function (c) { c.hidden = false; }); });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-sr-install]'); if (!b || !deferred) return; deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; document.querySelectorAll('[data-sr-install-card]').forEach(function (c) { c.hidden = true; }); }); });
  /* offline page: reload when back online */
  if (document.querySelector('[data-sr-reload]')) window.addEventListener('online', function () { location.reload(); });
})();

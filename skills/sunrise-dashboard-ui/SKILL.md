---
name: sunrise-dashboard-ui
description: Build any website, dashboard, member area or admin panel in the Sunrise UI style (clean white cards, Heroicons, gradient stat cards, pay sheets, pagination, mobile tab bar) with admin-changeable theme colours and dark mode.
---

# Sunrise Dashboard UI · v4

A premium, framework-free design system for dashboards, member areas and admin panels:
**clean white cards with high-contrast text**, glass only on the top bar / tab bar / sheets,
**Heroicons** (5 switchable icon libraries), floating sidebar, ticket-style
balance card, gradient stat cards, feature tiles with ghost icons and hover shine, coin
reward cards, data tables that turn into cards on phones, **pagination**, tabs with a
sliding indicator, modals that become **bottom sheets** on phones, skeleton loaders,
progress rings, toasts, and a floating mobile tab bar. Every click has feedback (ripple,
icon pop, press scale, loading → done states).

**Every brand colour comes from three CSS variables** (`--brand`, `--brand-2`, `--brand-3`).
Admins change them live in the **Theme Studio**; the choice is saved server-side.

Files (this repo): `kit/sunrise.css`, `kit/sunrise-theme.js`, `kit/sunrise-icons.js`, `kit/sunrise-ui.js`;
icon builder `tools/build-icons.py`;
reference pages `demo/dashboard.html`, `demo/transactions.html`, `demo/pages.html`.

---

## 0. Non-negotiable rules

1. **Use the kit files verbatim.** Copy the four `kit/` files unchanged into the project
   (e.g. `public/assets/sunrise/`). Project-specific CSS goes in a separate `app.css` loaded after.
2. **One shell, every page.** Every page uses the shell from `demo/dashboard.html`
   (rail + topbar + `sr-main > sr-page` + tab bar + drawer + toasts). Put it in ONE layout
   file and the nav in ONE array so sidebar, drawer and tab bar never drift.
3. **Always responsive — on every page, every component, no exceptions** (Section 3).
4. **Class prefix `sr-`.** New components follow `sr-block`, `sr-block__part`,
   `sr-block--variant`, state `is-*`. Never invent un-prefixed component classes.
5. **No hard-coded brand colours.** Use `--brand`, `--brand-fg`, `--brand-soft`,
   `--grad-brand`, `--grad-sunrise`, `--grad-horizon`, and neutrals `--paper`, `--surface`,
   `--surface-2`, `--sunken`, `--line`, `--line-strong`, `--heading`, `--text`, `--muted`, `--faint`.
6. **Colour per feature = `tone-*` class**: `tone-brand | tone-violet | tone-indigo | tone-cyan
   | tone-sky | tone-amber | tone-rose | tone-success | tone-danger | tone-neutral`.
   Neighbouring cards and sidebar links get different tones.
7. **Icons: real colour icons for features, Phosphor regular for small controls** (Section 4).
   Never emoji, never AI-drawn/hand-made SVG icons, never other icon sets.
8a. **No tilted or rotated UI.** Icons, buttons, tabs and cards never rotate or flip — motion is
   scale/translate/opacity only. Hover effects only apply on real pointers (`@media (hover:hover)`).
8. **Every interactive element gives feedback** (Section 5). Async buttons use `SRButton.run`.
9. **Every list longer than ~10 items is paginated** (or "Load more") — Section 6.
10. **Every data view has 4 states:** loading (skeleton), empty (`sr-empty`), error
    (`sr-alert tone-danger` + retry), and content.
11. **Both light and dark must work**; test one extra preset (e.g. `SRTheme.preset('ocean')`).
12. **Honest UI.** Toasts, counters and notifications come from real backend data. Never
    build fake "someone just withdrew" tickers, fake counters or fake reviews.
13. **Accessibility:** `aria-label` on icon-only buttons, `aria-current="page"` on active nav,
    `role="tablist"/"tab"` + `aria-selected`, `role="dialog"` + `aria-modal` on modals, labels
    on all inputs, text contrast ≥ 4.5:1, focus visible (kit provides), honours reduced motion (kit provides).

---

## 1. Install (head of every page — order matters)

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#fbf8f5">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="/assets/sunrise/sunrise.css">
<link rel="stylesheet" href="/assets/app.css"><!-- optional project overrides -->
<script>window.SR_THEME = {"preset":"ember","brand":"#ff5b14","brand2":"#ffb21e","brand3":"#f0306e","radius":1,"font":"sora","allowUserColors":false};</script>
<script src="/assets/sunrise/sunrise-theme.js"></script>
```
End of `<body>`, in this order:
```html
<script src="/assets/sunrise/sunrise-icons.js"></script>
<script src="/assets/sunrise/sunrise-ui.js"></script>
```
`sunrise-icons.js` bundles the colour icons as inline SVG (no CDN, works offline). For self-hosting
Phosphor, download `@phosphor-icons/web` from npm and serve `src/regular/style.css` + `Phosphor.woff2`.

---

## 2. Theming (admin-changeable)

Inputs: `--brand` (main), `--brand-2` (dawn, lighter accent), `--brand-3` (dusk, deeper accent).
Everything else (hover, soft tints, gradients, tinted neutrals, shadows, dark variants) is derived.
Presets: `ember` (default), `ocean`, `emerald`, `royal`, `rose`, `cobalt`, `gold`, `graphite`.

- **Theme Studio:** any `[data-sr-studio-open]` opens a panel (presets, 3 colour pickers,
  light/dark/auto, corner radius, heading font). "Publish" POSTs `SRTheme.toJSON()`:
  `SRStudio.mount({ saveUrl:'/admin/theme', csrf })` or `SRStudio.mount({ onSave: cfg => … })`.
  Render the trigger for admins only.
- **Server config:** store the JSON, print it into `window.SR_THEME` before `sunrise-theme.js`.
- **Static CSS:** `:root{--brand:#2563eb;--brand-2:#38bdf8;--brand-3:#7c3aed}` after `sunrise.css`.
- **API:** `SRTheme.apply({...})`, `.preset(id)`, `.setMode('light'|'dark'|'system')`,
  `.toggleMode()`, `.isDark()`, `.get()`, `.reset()`, `.toJSON()`, `.toCSS()`; event `sr:theme`.
- Light/dark is always the user's choice; colours are site-wide unless `allowUserColors: true`.

---

## 3. Responsive rules (mandatory on every page)

Breakpoints: **≤640 phone · 641–767 large phone · ≥768 tablet (rail appears) · ≥1024 laptop
(2-column layouts) · ≥1280 wide**. Design phone-first, then widen.

- Always test at **360, 390, 768, 1024, 1440 px**. No horizontal scroll at any width
  (except inside `.sr-table-wrap` / `.sr-chips` / `.sr-tabs`, which scroll on purpose).
- Use the kit's grids: `sr-top`, `sr-stats`, `sr-tile-grid`, `sr-reward-grid`, `sr-media-grid`,
  `sr-split` (main + side, stacks under 1024), `sr-grid` (auto-fit, `style="--min:18rem"`).
  Never set fixed pixel widths on cards; use `minmax(0,1fr)` and `min-width:0` on flex children.
- Navigation: rail ≥768; phones get `sr-tabbar` (max 5 items, centre = main action
  `sr-tab--cta`) + `sr-drawer` cloned from the rail. Phone-only shortcuts: `sr-quick`.
- Tables: always `sr-table` inside `sr-table-wrap`, with `data-label` on every `<td>` and
  `class="is-main"` on the first cell — it becomes a stacked card under 640px.
- Modals: `sr-modal` automatically becomes a bottom sheet under 640px.
- Pagination collapses to `‹ 2 / 9 ›` on phones.
- Touch targets ≥ 44px on phones (kit sizes already comply). Inputs ≥ 16px font on phones
  are not needed because the kit uses 15px+ height-3rem inputs; keep `inputmode` correct
  (`decimal`, `tel`, `email`, `numeric`).
- Long text: `overflow:hidden;text-overflow:ellipsis;white-space:nowrap` on titles in
  rows/tiles (kit classes already do this); never let a name push buttons off-screen.
- Safe areas: kit uses `env(safe-area-inset-*)` for top bar, tab bar, drawer and sheets — keep `viewport-fit=cover`.
- Hide/show helpers: `sr-hide-sm` (hidden <640), `sr-hide-mobile`, `sr-only-mobile`,
  `sr-hide-md`, `sr-show-md`.

---

## 4. Icons — real colour icons + glass tiles

**Five icon libraries are bundled; the admin picks one** (Theme Studio → Icon library, or
`window.SR_THEME = {icons:'tabler'}`, or `SRTheme.apply({icons:'lucide'})`). Markup never changes —
`<i class="sr-icon" data-icon="trophy">` renders in whichever library is active:

| `icons` value | Library | Look | License |
|---|---|---|---|
| `heroicons` (**default**) | Heroicons (Tailwind Labs) | 1.5px outline; tinted tiles, white on solid gradient tiles | MIT |
| `fluent` | Microsoft Fluent UI System Color | real multi-colour icons in white glass tiles | MIT |
| `lucide` | Lucide | 2px line icons tinted with the card's tone | ISC |
| `tabler` | Tabler Icons | line icons for dashboards, tinted | MIT |
| `fontawesome` | Font Awesome Free (solid) | bold filled glyphs, tinted | CC BY 4.0 |

Single-colour libraries are coloured automatically by the container's `tone-*`. One element can force
a library with `data-pack="lucide"`. Each semantic name in `tools/icon_map.py` maps to all five; to add
icons, extend that map and run `tools/build-icons.py` (see its header for the npm packages).
Font Awesome Free icons require attribution (CC BY 4.0) — keep the README credit if you choose it.


**Optional colour set = Microsoft Fluent UI System Color Icons** (MIT, free for commercial use,
196 icons bundled in `kit/sunrise-icons.js`). They are professionally designed, multi-colour,
and keep their own colours in every theme.

```html
<i class="sr-icon" data-icon="trophy"></i>          <!-- hydrated to inline SVG automatically -->
<i class="sr-icon sr-icon--lg" data-icon="savings" aria-label="Wallet"></i>
```
- Use them for: nav links, tab bar, feature tiles (`sr-glyph`), stats (`sr-stat__icon`), quick actions,
  reward coins, panel heads, list/table row icons, alerts, toasts, empty states, unlock cards.
- Always place them inside a **glass icon tile** container: `sr-nav-link__icon`, `sr-glyph`,
  `sr-stat__icon`, `sr-quick__icon`, `sr-reward__coin`, `sr-panel__icon`, `sr-row__icon`, `sr-ic`
  (+ `sr-ic--lg`), `sr-lock__icon`, `sr-toast__icon`, `sr-tab__icon`. The tile's glow ring takes the
  `tone-*` colour of its parent, so give each card/link a tone.
- Sizes: `sr-icon--xs|sm|md|lg|xl`; decorative ghost: `<i class="sr-icon sr-tile__ghost" data-icon="star" aria-hidden="true">`.
- Tab bar: idle icons are muted; the active tab gets a gradient tile with a white icon; the centre CTA is a gradient tile with a white icon and a ring.
- Friendly aliases work: `home, wallet, transactions, users, referrals, store, video, ai, course, chat, walk,
  theme, bell, chart, trading, verified, medal, lock, goal, check, bank, mobile, send, loans, tips, user, admin,
  menu, search, docs, pro, location` … List all names in the console: `SRIcons.names()`.
- Core names: `home savings coin-multiple receipt history people people-add people-community people-team
  building building-store building-government clipboard-task poll video bot-sparkle book-open-lightbulb
  chat-multiple sport paint-brush add-starburst alert data-trending data-bar-vertical-ascending data-pie
  shield-checkmark certificate ribbon-star trophy gift lock-closed gauge checkmark-circle warning error-circle
  question-circle phone send calendar calendar-checkmark vault lightbulb person person-key settings apps
  search-sparkle document-text premium location-ripple mail heart star camera globe headset wrench-screwdriver`.
- Need an icon that is not bundled? Run `python3 tools/build-icons.py package/icons.json kit/sunrise-icons.js`
  after `npm pack @iconify-json/fluent-color && tar xzf *.tgz`. For production you may bundle only the
  icons you use: add a comma list as the 3rd argument (smaller file).
- Dynamic HTML is hydrated automatically (MutationObserver); call `SRIcons.hydrate(el)` if needed.

**Small control glyphs = Phosphor regular** (`<i class="ph ph-x"></i>`): close, carets, arrows inside
buttons/links, chip and button leading icons, input-group icons, pagination arrows. Keep them neutral
(currentColor) — never put colour icons inside buttons.

## 4b. Clean white (default) and optional glass

**Default = clean white:** solid white cards (`--surface:#fff`), high-contrast text
(`--heading:#16100d`, `--text:#352c27`, `--muted:#6b5f58`), a very faint brand mesh behind the page, soft
tone-tinted shadows. Glass (blur) is used only on chrome: top bar, tab bar, popovers, modals, drawer, toasts.
Text must always be clearly readable — never put body text on translucent or busy backgrounds, never use
`--faint` for anything that must be read.

**Optional glass cards:** add `class="sr-glass"` to `<html>` to make cards translucent with backdrop blur.
Only use it if the client explicitly asks for glass.

### Glass details (when `html.sr-glass` is on)

- The page sits on a fixed, blurred brand-colour mesh (`body::before`) — keep it; glass needs colour behind it.
- `--surface` is translucent white (dark: translucent slate). Cards, panels, tiles, rewards, media, rail,
  top bar, tab bar, alerts and toasts use `backdrop-filter: var(--glass-blur)` and `--glass-edge` borders
  with an inner highlight (`--glass-hl`). Popovers, modals, drawer and Theme Studio use `--glass-strong`.
- Need opaque? use `--surface-solid`. Need a new glass block? `background:var(--surface);
  backdrop-filter:var(--glass-blur);border:1px solid var(--glass-edge);box-shadow:var(--glass-hl),var(--sh-sm)`.
- Performance: blur only cards and chrome, never every table row or list item; keep < ~30 blurred
  elements on screen.

## 5. Motion & feedback (built in — just use the classes)

- **Ripple** on press for `.sr-btn, .sr-tile, .sr-nav-link, .sr-reward, .sr-icon-btn,
  .sr-account, .sr-page-btn, .sr-chip-btn, .sr-tabs__btn, .sr-menu-item` and any `[data-sr-ripple]`.
- **Icon pop** on click (scale only), **tab-bar bounce** on the active tab, **press scale** `:active` on
  buttons, **hover lift + shine sweep** on tiles, rewards, media — hover effects are switched off on
  touch devices so nothing stays stuck. Never rotate, skew or flip elements.
- **Count-up numbers:** `<span data-sr-count="12480.5" data-decimals="2">12,480.50</span>`
  (keep the real value as the initial text for no-JS/SEO).
- **Scroll reveal:** `data-sr-reveal` (+ `data-sr-delay="60"` to stagger cards). Call
  `SRReveal()` after inserting new content.
- **Async buttons:** `SRButton.run(btn, () => fetch(...))` → spinner → green "Done ✓" → restore;
  on rejection the button shakes. Validation errors: add `is-invalid` to the input, unhide
  `.sr-error`, shake the submit button.
- **Page entrance:** children of `.sr-page` rise in with a stagger automatically.
- Keep durations 150–600ms with `var(--ease)`. Never animate layout-heavy properties in loops.
  `prefers-reduced-motion` disables all motion automatically.

---

## 6. Data components

**Toolbar (search + segmented tabs + filter chips)**
```html
<div class="sr-toolbar">
  <div class="sr-input-group"><i class="ph-duotone ph-magnifying-glass"></i><input class="sr-input" type="search" placeholder="Search" aria-label="Search"></div>
  <div class="sr-tabs" role="tablist" id="dir"><button class="sr-tabs__btn" role="tab" aria-selected="true" data-value="all">All</button><button class="sr-tabs__btn" role="tab" aria-selected="false" data-value="in">In</button><span class="sr-tabs__ink"></span></div>
</div>
<div class="sr-chips" id="types"><button class="sr-chip-btn" aria-pressed="true" data-value="">All</button><button class="sr-chip-btn" aria-pressed="false" data-value="Review"><i class="ph-duotone ph-star"></i>Reviews <span class="sr-chip-btn__n">12</span></button></div>
```
Events: tabs fire `sr:tab` (`e.detail.value`), chips fire `sr:filter`. Tabs that switch panels:
add `aria-controls="panelId"` and `<div class="sr-tabpanel" id="panelId">`.

**Responsive table**
```html
<section class="sr-panel">
  <div class="sr-table-wrap"><table class="sr-table">
    <thead><tr><th>Transaction</th><th>Type</th><th>Status</th><th class="is-num">Amount</th></tr></thead>
    <tbody id="rows">
      <tr><td class="is-main"><div class="sr-cell"><span class="sr-row__icon tone-indigo"><i class="ph-duotone ph-star"></i></span><div style="min-width:0"><p class="sr-cell__title">App review approved</p><p class="sr-cell__meta">Nov 21, 14:12 · TX332708</p></div></div></td>
        <td data-label="Type">Review</td><td data-label="Status"><span class="sr-badge sr-badge--dot tone-success">Completed</span></td>
        <td data-label="Amount" class="is-num"><span class="sr-amount is-in">+KES 150.00</span></td></tr>
    </tbody></table></div>
  <nav id="pager"></nav>
</section>
```

**Pagination**
- Client-side list: `const list = SRPager.list('#rows', items, renderRowFn, { perPage: 10, pager: document.getElementById('pager'), empty: '<tr><td colspan="4"><div class="sr-empty">…</div></td></tr>' }); list.set(filteredItems);`
- Server-side: `const pg = SRPager.mount(navEl, { total, page, perPage, onChange: (page, perPage) => load(page, perPage) }); pg.setTotal(n); pg.go(3);`
- Renders "Showing 11–20 of 46", prev/next, numbers with `…`, rows-per-page select;
  phones get `‹ 2 / 5 ›`. The current page uses `aria-current="page"`.
- Server rendered (Laravel/PHP) markup must match: `<nav class="sr-pagination">` with
  `.sr-pagination__info`, `.sr-pages` of `.sr-page-btn` (`.sr-page-num` on numbers,
  `.sr-page-gap` for …, `.sr-page-mobile` for "2 / 9"), `.sr-page-size`.
- Feeds/cards may use "Load more" instead: `<div class="sr-loadmore"><button class="sr-btn sr-btn--secondary">Load more</button></div>`.

**Modal → bottom sheet**
```html
<button class="sr-btn sr-btn--primary" data-sr-modal-open="withdraw">Withdraw</button>
<div class="sr-modal" id="withdraw" hidden role="dialog" aria-modal="true" aria-labelledby="wd-t">
  <form class="sr-modal__box"><span class="sr-sheet-grab"></span>
    <div class="sr-modal__head"><span class="sr-ic sr-ic--solid tone-brand"><i class="ph-duotone ph-wallet"></i></span><div class="sr-grow"><h2 class="sr-panel__title" id="wd-t">Withdraw</h2><p class="sr-hint">Subtitle</p></div><button type="button" class="sr-icon-btn" data-sr-modal-close aria-label="Close"><i class="ph-duotone ph-x"></i></button></div>
    <div class="sr-modal__body">…fields…</div>
    <div class="sr-modal__foot"><button type="button" class="sr-btn sr-btn--secondary sr-btn--square" data-sr-modal-close>Cancel</button><button class="sr-btn sr-btn--primary sr-btn--square">Confirm</button></div>
  </form>
</div>
```
JS: `SRModal.open(id)`, `SRModal.close(id)`; Esc and backdrop click close it.

**Form extras:** `sr-select`, `sr-check` (checkbox/radio), `sr-choice` (selectable card row with
a radio), `sr-amount-chips` (quick amounts using `sr-chip-btn`), `sr-steps` with
`sr-step is-done|is-current`, `sr-error` (+`hidden`), `sr-input.is-invalid`, `sr-switch`.

**Feedback & status:** `sr-alert tone-amber|success|danger|sky` with `sr-alert__icon/__title/__text`;
`sr-progress` (`<span style="--v:72%">`) with `sr-progress-row`; `sr-ring` (`style="--v:68"`);
skeletons `sr-skel sr-skel--line|--title|--circle`; `sr-empty`; `sr-badge sr-badge--dot tone-*`;
`sr-avatars` group.

**Notifications (toasts): always top-right** (full-width at the top on phones; max 4 on desktop, 2 on phones;
newest on top). White card: tinted icon tile + title + ✕, message, optional buttons, coloured countdown bar
at the bottom (pauses on hover; swipe right to dismiss on touch).
```js
SRToast.success('Payout sent', 'KES 1,250 is on its way to your M-Pesa.');
SRToast.warning('Verify your number', 'Confirm your M-Pesa number before your first cash-out.',
  { life: 0, actions: [{ label: 'Verify now', onClick: () => location.href = '/profile' }] });
SRToast.error('Payment failed', 'M-Pesa did not confirm the payment. You were not charged.',
  { life: 0, actions: [{ label: 'Dismiss' }, { label: 'Try again', variant: 'danger', onClick: retry }] });
SRToast.info('New lesson', 'Spreadsheet basics is ready.');
// full form: SRToast.show({ type, title, text, life /* ms, 0 = stays */, actions: [{ label, variant: 'secondary'|'primary'|'danger', onClick, keepOpen }] })
```
Success after saves/payouts, warning for things the user should do, error for failures (with a retry action),
info for neutral news. Errors use `role="alert"`. Only real events; never fake activity tickers.

---


## 6b. Mobile patterns (learned from the reference app — always use these on phones)

- **Top bar:** logo + one grouped pill (bell · theme · avatar). No breadcrumb on phones.
- **Balance ticket:** two equal, tall buttons (`flex:1`, 50/50), dashed tear line with notches, huge amount.
- **Stats:** full-width stacked gradient cards — glass icon tile · label + big value · glass pill on the right.
- **Quick actions:** 5 round-square gradient tiles with labels under them.
- **Rewards:** 2 roomy columns, centred coin, label, big value, sub-text.
- **Drawer:** profile card first, then the nav with 40px icon chips and 16px labels.
- **Tab bar:** 5 items, raised gradient CTA in the middle.
- **Text sizes on phones:** body 15px, row titles 16px, card titles 17–20px, numbers 28–44px. Touch targets ≥ 44px.
- Everything else is one column; nothing smaller than 12px except uppercase kickers.

## 6c. Payment / unlock sheet (gradient hero + summary ticket)

Open from any button: `<button data-sr-unlock data-kind="Unlock video" data-title="Spotting fake job offers" data-fee="100" data-earn="500" data-icon="video">`.
The sheet (markup in `demo/dashboard.html`, id `unlock`) has: gradient hero with dot pattern (`sr-sheet-hero`, glass
close button, glass icon tile, uppercase kicker, big white title, description) → overlapping summary ticket
(`sr-summary` with `sr-summary__row--head` big fee, `sr-summary__row--cut` dashed tear line, "You earn" in
`sr-plus` green, payment method) → `sr-field-label` "M-PESA NUMBER" + `sr-input sr-input--lg` with phone icon →
`sr-btn sr-btn--primary sr-btn--xl sr-btn--block` "Pay KES 100 via M-Pesa" → `sr-howto` numbered steps
(1 Tap pay · 2 Enter your PIN · 3 Done). Validate Kenyan numbers `/^(\+?254|0)(7|1)\d{8}$/`; after the STK push
request succeeds show a toast "Check your phone". Never claim a payment succeeded before your callback confirms it.

## 6d. Task cards

```html
<article class="sr-task">
  <div class="sr-task__top"><span class="sr-ic tone-violet"><i class="sr-icon" data-icon="bot-sparkle"></i></span>
    <div><p class="sr-task__cat">Safety</p><p class="sr-task__time"><i class="ph ph-clock"></i>~20s</p></div>
    <span class="sr-reward-pill">+KES 500</span></div>
  <h3 class="sr-task__title">Catch the fake loan text</h3>
  <p class="sr-task__text">The AI judged an SMS loan offer. Did it get it right?</p>
  <button class="sr-btn sr-btn--outline sr-btn--square sr-btn--block sr-btn--lg" data-sr-unlock …><i class="ph ph-lock-simple"></i>Unlock task · KES 150</button>
</article>
```
Grid: `sr-task-list` (1 column phones, 2 columns ≥900px).

## 6e. Page hero, earnings card, levels (in-app feature pages)

- **Page hero:** `<header class="sr-page-hero tone-violet">` → `sr-page-hero__top` (`sr-glyph` icon + `sr-page-hero__kicker` + `sr-page-hero__title`) + `sr-page-hero__text` + optional large faint `sr-page-hero__art` icon. Start every feature page with one.
- **Gradient earnings card:** `sr-earn-card` → `sr-earn-card__top` (label, `sr-earn-card__value`, `sr-glass-pill`) + `sr-linkbox` (truncated `sr-linkbox__url`, white Copy button with `data-sr-copy`, glass share icon button).
- **Level cards:** `sr-level-grid > sr-level tone-*` with `__k` (Level 1), `__v` (count), `__s` (active · amount).
- Then a search `sr-input-group` and a `sr-panel` list with a count on the right, paginated.


## 6f. Cash out / withdrawal page (form pattern)

1. `sr-page-hero tone-amber` with kicker "Wallet", title "Cash Out" and a full-width secondary "History" button.
2. Balance card: `sr-bal-card__head` (`sr-ic sr-ic--solid` + `sr-field-label` "Available balance"),
   `sr-bal-card__amount`, then `<dl class="sr-split-stats">` with Min amount / Max payout.
3. Form card: label → `sr-affix` input (`sr-affix__pre` "KES", `sr-affix__post` MAX button) →
   `sr-pct-chips` (25% · 50% · 75%) → `sr-label-row` with label + `sr-verified` → read-only `sr-input[readonly]`
   phone → `sr-receipt` rows (Amount to receive · Estimated fee · Arrives/Total with `is-total`) →
   `sr-btn--primary sr-btn--xl sr-btn--block`.
4. Recalculate the receipt live on input; validate min/max; use `SRButton.run` on submit.
Two columns on desktop (`sr-split`), one column on phones. Full markup: `demo/transactions.html`.

## 6g. Auth pages — login · register · forgot password

Reference: `demo/login.html`, `demo/register.html`, `demo/forgot.html`. Every project gets all three.
- Layout `sr-auth`: theme toggle top-right (`sr-auth__theme`), centred logo, one big white card
  (`sr-auth__card`, radius 2rem) with optional gradient icon badge (`sr-auth__badge`), huge bold title
  (`sr-auth__title`, e.g. "Welcome back" / "Create your account"), muted subtitle (`sr-auth__sub`), form, divider
  (`sr-divider` "New to APP?"), soft secondary block button, and a muted footer line (`sr-auth__foot`).
- On ≥1024px a gradient brand panel (`sr-auth__aside`) with headline, text and 3 benefit rows sits on the left.
- Inputs: `sr-input sr-input--soft` inside `sr-input-group` with a leading Phosphor icon (user, lock, device-mobile, gift);
  phone numbers add `sr-input--mono`. Passwords: wrap in `sr-pass` + eye button `data-sr-eye="inputId"`;
  register adds `<div class="sr-strength" data-sr-strength="inputId"><span></span>×4</div>`.
- Label row with right-aligned `sr-link` ("Forgot password? →"). Helper text `sr-hint` under the field.
- Errors: `sr-input.is-invalid` + `<span class="sr-error" id="FIELD-err">` under the field; shake the submit button.
- Primary action: `sr-btn sr-btn--primary sr-btn--xl sr-btn--block sr-btn--arrow` with `ph-arrow-right`; run it with `SRButton.run`.
- Register: username (3–32 chars `[A-Za-z0-9._-]`), M-Pesa phone, password (min 6) + strength, optional referral
  code (prefill from `?ref=`), terms checkbox. Forgot: steps Phone → Code → New password with `sr-steps`.
- Correct `autocomplete` values (`username`, `current-password`, `new-password`, `tel`, `one-time-code`) and `inputmode`.
- Never reveal whether an account exists on the forgot page; rate-limit login and reset on the server.
- **Must fit one phone screen with no scrolling** at 412×760 and 360×640 (measured). How: logo left + theme button
  on one row, badge hidden on phones, card padding 1.375rem, inputs 3.125rem, helper text only on focus
  (`sr-hint--focus`), optional fields collapsed behind a link (e.g. "Have a referral code?"), a one-line
  `sr-legal` consent text instead of a checkbox, footer hidden on phones, and on register the bottom
  divider + button replaced by one `sr-auth__alt` line (`sr-auth--compact-alt`).
- **General compactness rule for every page:** primary action visible without scrolling on a 412×760 screen;
  forms ≤ 5 visible fields on phones (collapse optional ones); use `hidden` (the kit forces `[hidden]{display:none}`).

## 6h. EXACT card markup — copy, never invent (v5)

AI tools broke real sites by writing their own card markup. **Use these blocks exactly. Do not write custom CSS for cards.**

**Stat strip** (DreamWork "Today / Withdrawn / Lifetime"; also admin counters). One horizontal row on every screen: glass icon on the left, label and value in the middle, pill on the right. **The icon is never above the label.**
```html
<section class="sr-stats sr-stats--row">
  <div class="sr-stat tone-sky">
    <span class="sr-stat__icon"><i class="sr-icon" data-icon="people"></i></span>
    <div class="sr-stat__body"><p class="sr-stat__label">Candidates</p><p class="sr-stat__value"><small>KES</small>117,500</p></div>
    <span class="sr-stat__hint">+4 this week</span>
    <span class="sr-stat__spark">✦</span>
  </div>
</section>
```
**Reward card** (2-column grid: coin with halo, centred label, value, sub): see `.sr-reward-grid` in `demo/dashboard.html`.
**Module row** (admin modules, categories; replaces big tiles in admin panels):
```html
<div class="sr-modules"><a href="#" class="sr-module tone-violet"><span class="sr-glyph"><i class="sr-icon" data-icon="person-key"></i></span>
  <div><p class="sr-module__k">Officers, roles</p><p class="sr-module__t">Staff &amp; roles</p><p class="sr-module__s">5 active staff</p></div>
  <span class="sr-module__go"><i class="ph ph-caret-right"></i></span></a></div>
```
**Page head with buttons** (never put buttons inside the title row yourself):
```html
<header class="sr-page-head tone-rose"><span class="sr-glyph"><i class="sr-icon" data-icon="people-community"></i></span>
  <div><p class="sr-page-head__kicker">Partners</p><h1 class="sr-page-head__title">Partners &amp; commissions</h1></div>
  <p class="sr-page-head__text">One-line description.</p>
  <div class="sr-page-head__actions"><button class="sr-btn sr-btn--primary sr-btn--square">Add partner</button><button class="sr-btn sr-btn--secondary sr-btn--square">Rules</button></div></header>
```
**Numbers grid** (2×2 on phones, 4 across on desktop; numbers never wrap): `.sr-metrics.sr-metrics--4 > .sr-metric > .sr-metric__k + .sr-metric__v(<small>KES</small>3,950)`.
**Callout with action**: `.sr-callout.tone-amber > .sr-ic + .sr-callout__t + .sr-callout__s + a.sr-btn.sr-callout__a`.
**Public (logged-out) header**: `.sr-site-head > .sr-site-head__bar` with logo, `.sr-site-head__nav`, `.sr-site-head__right` (theme toggle, `.sr-site-head__signin`, `.sr-site-head__cta`, `.sr-site-head__burger`). See `demo/public.html`.
**Search + filters**: `.sr-search` (stacked on phones, one bar on desktop) followed by `.sr-filter-row > label.sr-filter > select + i.ph-caret-down` (scrolls sideways on phones, never cut off).
**Forms**: Yes/No choices use `.sr-pills > label.sr-pill > input[type=radio] + span`. File uploads use `label.sr-upload` (input, `.sr-upload__thumb`, text; preview is automatic). Multi-step forms end with `.sr-step-foot` (Back · Step 2 of 4 · Continue).

## 6i. Known pitfalls (these caused real bugs — never do them)
- Never set `position:relative` on every child of a button or card. It drags the tap ripple into the layout and cards jump on click. The kit already handles stacking.
- Never write `.sr-stat{flex-direction:column}` or put the icon box above the stat label.
- Never put huge background icons behind text. `.sr-tile__ghost` is pinned bottom-right at 7% opacity; leave it there.
- Never put two buttons in the same flex row as a long title. Use `.sr-page-head__actions`, which drops below the title on phones.
- Money and numbers (`KES 3,950`) must never break across lines. Use `.sr-stat__value`, `.sr-metric__v` or `.sr-money`, which are already nowrap.
- Every flex or grid child that holds text needs `min-width:0`. Use `.sr-grow`.
- Never make the topbar or tabbar more see-through than the kit's defaults.
- Rows of selects or chips must scroll (`.sr-filter-row`) or wrap. They must never sit at fixed widths.
- Test: open any page with `?sr-debug` in the URL. Anything wider than the screen is outlined red and a toast reports the count. Fix every one.

## 6j. Account menu — Log out is COMPULSORY (every signed-in page)
The top-right avatar pill opens the account menu. Every signed-in page must have it, and it must end with **Log out**. Never put this menu inside an element with `overflow:hidden`; the kit keeps the top bar `overflow:visible` for this.
```html
<button class="sr-account" data-sr-pop="pop-account" aria-label="Account menu" aria-expanded="false"><span class="sr-avatar sr-avatar--sm">DA</span><span class="sr-account__name">dalitech</span><i class="ph ph-caret-down sr-muted"></i></button>
<div class="sr-popover sr-popover--account" id="pop-account" hidden>
  <div class="sr-menu-head"><span class="sr-menu-head__avatar">DA</span><span class="sr-grow"><span class="sr-menu-head__name">dalitech</span><span class="sr-menu-head__meta">+254718308478</span></span></div>
  <div class="sr-menu-sep"></div>
  <a href="/profile" class="sr-menu-item"><i class="ph ph-user"></i>Profile &amp; security</a>
  <a href="#" class="sr-menu-item" data-install><i class="ph ph-download-simple"></i>Install app</a>
  <div class="sr-menu-sep"></div>
  <form method="post" action="/logout"><button class="sr-menu-item sr-menu-item--danger"><i class="ph ph-sign-out"></i>Log out</button></form>
</div>
```
Log out must be a POST (with your CSRF token) that ends the session server-side, then redirects to the login page.

## 6k. DreamWork phone type scale (exact; do not enlarge)
These sizes were measured from dreamwork.co.ke on a 412 px-wide phone and are built into `sunrise.css` (sections 62–64). Use the kit classes; never override font sizes on phones.
| Text | px | Text | px |
|---|---|---|---|
| Top bar brand | 14 | Greeting / page title | 20 |
| Greeting date, labels, hints | 12.5 | Balance amount | 34 |
| Stat strip label / value | 15 / 23.5 | Task card kicker / title / sub | 9 / 15 / 11 |
| Reward card label / value / sub | 12.5 / 18 / 11 | Menu, drawer and list rows | 13 |
| Panel titles | 14.5 | Bottom bar labels | 9.5 |
| Login title / subtitle / labels | 25.5 / 13 / 11.5 | Inputs and buttons | 14.5 |
Element sizes: top bar 51, icon tiles 44, stat icon 36, bottom bar 55, drawer 240 wide with 40 px rows, inputs 41, auth buttons 43.
**Verify:** `python3 tools/dw_measure.py <demo folder>` checks 65 measurements, and `python3 tools/qa.py <folder> <pages>` checks overflow, overlapping or cut-off text, and size changes on tap at 360/390/412/768/1440 px. Both must report 0.

## 7. Layout components (see demo pages for full markup)

Greeting `sr-greet` · balance ticket `sr-balance` (+ sun SVG) · solid stats `sr-stats > sr-stat tone-*`
· phone shortcuts `sr-quick` · section head `sr-head` with `sr-kicker` + `sr-title` + `sr-pill-link`
· feature tiles `sr-tile-grid > sr-tile tone-*` (ghost icon, `sr-glyph`, tag/name/desc, `sr-tile__foot`, `sr-go`)
· reward coins `sr-reward-grid > sr-reward tone-*` · panels `sr-panel` with `sr-panel__head/__body` and `sr-row`
· KPI strip `sr-kpis > sr-kpi` · media cards `sr-media-grid > sr-media` (thumb, lock, chips, body, button)
· unlock card `sr-lock` + `sr-fee` · profile `sr-profile`, `sr-copybox`, `sr-dl`
· forms `sr-field`, `sr-label`, `sr-input`, `sr-input-group`, `sr-hint`.
Money: `<p class="sr-money"><small>KES</small>12,480.50</p>`; ledger amounts `sr-amount is-in|is-out` (mono).
Buttons: `sr-btn` + `--primary | --soft | --outline | --secondary | --ghost | --danger`, `--sm | --lg`,
`--square` (forms/cards) vs pill (hero actions), `--block`, `--icon`.

---

## 8. Premium frontend standards (apply on every project)

- **Typography:** Sora 700–800 for headings/numbers (negative tracking), Inter body, JetBrains
  Mono for ledgers/codes. Small caps labels: uppercase 0.62–0.7rem, 700, 0.12–0.16em tracking.
- **Spacing rhythm:** sections `gap:1.75rem` (kit `sr-page`), cards padding 1–1.25rem, inner gaps .5/.75/1rem.
- **Hierarchy per screen:** one primary action (gradient button), secondary actions soft/outline.
- **Content:** realistic copy and numbers, `tabular-nums`, consistent currency, relative + absolute dates.
- **Performance:** preconnect fonts; `loading="lazy"` + `width/height` on images; `aspect-ratio` on
  media; defer non-critical JS; no layout shift (skeletons match final size); compress images (WebP/AVIF).
- **SEO & meta:** unique `<title>` and `<meta name="description">` per page, Open Graph tags,
  favicon + `apple-touch-icon`, `theme-color`, semantic landmarks (`header`, `nav`, `main`, `section`, `aside`).
- **PWA (optional):** manifest + install toast via `SRToast.info('Install the app', 'Open it from your home screen.', {life:0, actions:[{label:'Install', variant:'primary', onClick: install}]})`.
- **Forms:** inline validation on blur/submit, clear error text, disable double submit (`SRButton.run`),
  correct `autocomplete` and `inputmode`, success toast after save.
- **States:** loading skeleton, empty with icon + next action, error alert with retry, success toast.
- **Security:** escape all user content in templates; JSON-encode server data into scripts; CSRF tokens on POST.
- **Consistency:** reuse existing classes before writing new CSS; if new CSS is needed, use kit tokens only.

---

## 9. Saving the admin theme (backend)

Validate `brand|brand2|brand3` as `/^#[0-9a-f]{6}$/i`, `radius` 0.6–1.4, `font` in
`sora|jakarta|grotesk|system`. Store one JSON value, print into `window.SR_THEME`.

*Laravel*
```php
Route::post('/admin/theme', function (Illuminate\Http\Request $r) {
  $d = $r->validate(['brand'=>['regex:/^#[0-9a-fA-F]{6}$/'],'brand2'=>['regex:/^#[0-9a-fA-F]{6}$/'],'brand3'=>['regex:/^#[0-9a-fA-F]{6}$/'],
    'radius'=>'numeric|between:0.6,1.4','font'=>'in:sora,jakarta,grotesk,system','preset'=>'string|max:20','allowUserColors'=>'boolean']);
  \DB::table('settings')->updateOrInsert(['key'=>'theme'],['value'=>json_encode($d)]); cache()->forget('theme');
  return response()->noContent();
})->middleware(['auth','can:admin']);
// layout.blade.php
<script>window.SR_THEME = {!! cache()->rememberForever('theme', fn() => \DB::table('settings')->where('key','theme')->value('value') ?? '{}') !!};</script>
```
*Plain PHP:* `file_put_contents('theme.json', json_encode($clean));` →
`<script>window.SR_THEME=<?= @file_get_contents('theme.json') ?: '{}' ?>;</script>`.
*Node/Express:* `app.post('/admin/theme', requireAdmin, (q,s)=>{ db.set('theme', clean(q.body)); s.sendStatus(204) })`
→ `window.SR_THEME = <%- JSON.stringify(theme) %>`.

---

## 10. Delivery checklist
- [ ] Top-right avatar menu with **Log out** on every signed-in page (§6j)
- [ ] Phone text sizes untouched from the kit scale (§6k); `dw_measure.py` → OFF: 0
- [ ] Stat cards use the exact 6h markup (horizontal strip, never icon-on-top)
- [ ] Page opened with `?sr-debug` at 360 px shows "No overflow"
- [ ] Tapping any card or button does not change its size

- [ ] Head order correct; duotone icon CSS loaded; `sunrise-ui.js` at end of body.
- [ ] Same shell on every page, active nav + tab bar item set, breadcrumb title updated.
- [ ] Checked at 360 / 390 / 768 / 1024 / 1440 px — no horizontal scroll, nothing clipped.
- [ ] Light + dark + one other preset look right.
- [ ] Feature icons are `sr-icon` colour icons in glass tiles; small controls use `ph`; nothing rotated; sidebar links have tones.
- [ ] Login, register and forgot-password pages exist and match `demo/`.
- [ ] Clean white cards with clearly readable text in light; dark mode checked; glass only on chrome unless `sr-glass` was requested.
- [ ] Every button/tile gives feedback; async actions use `SRButton.run`.
- [ ] Lists paginated; tables have `data-label`; loading/empty/error states exist.
- [ ] Modals become bottom sheets on phones and close with Esc/backdrop.
- [ ] Theme Studio wired for admins (`saveUrl`) and validated server-side.
- [ ] Notifications/toasts use real data only.

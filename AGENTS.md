# AGENTS.md — Sunrise UI Kit (instructions for any AI coding tool)

This repository is the owner's **house UI style**. Every website, dashboard, member area or admin panel you
build for this owner must use it. Read **`SKILL.md` in full** before writing any UI code — it is the source of truth.

## Do this every time
1. Copy these four files **unchanged** into the project (e.g. `public/assets/sunrise/`):
   `kit/sunrise.css`, `kit/sunrise-theme.js`, `kit/sunrise-icons.js`, `kit/sunrise-ui.js`.
   Project-specific CSS goes in a separate `app.css` loaded after `sunrise.css`, using kit tokens only.
2. Load in this order: Google Fonts (Inter, Sora, JetBrains Mono) → Phosphor regular CSS → `sunrise.css` →
   `window.SR_THEME = {...}` → `sunrise-theme.js` in `<head>`; `sunrise-icons.js` then `sunrise-ui.js` at the end of `<body>`.
3. Build every page from the shell in `demo/dashboard.html` (sidebar rail, top bar, `sr-main > sr-page`,
   mobile tab bar, drawer, toasts). One layout file, one nav array.
4. Copy component markup from the demos, do not invent new styles:
   - `demo/dashboard.html` — greeting, balance ticket, stat cards, quick actions, feature tiles, rewards,
     activity list, withdraw sheet, **pay/unlock sheet**.
   - `demo/transactions.html` — **cash out form**, search, filter chips, tabs, responsive table, **pagination**.
   - `demo/pages.html` — media cards, **task cards**, **referral page hero + earnings card + levels**,
     unlock card, profile and security form.
   - `demo/login.html`, `demo/register.html`, `demo/forgot.html` — **auth pages** (every project needs them).
5. Icons: `<i class="sr-icon" data-icon="NAME"></i>` (default library **Heroicons**; admins can switch).
   Small control glyphs only: `<i class="ph ph-x"></i>`. Never emoji, never hand-drawn SVG icons.

## Non-negotiable rules
- **Responsive on every page**: test 360 / 390 / 412 / 768 / 1024 / 1440 px. No horizontal scroll.
  Phones: stacked full-width stat cards, 50/50 action buttons, 2-column rewards, bottom tab bar, bottom sheets.
- **Compact on phones**: the primary action is visible without scrolling on a 412×760 screen; auth pages fit one screen with no scrolling.
- **Clean white by default** with clearly readable, high-contrast text. Glass only on top bar, tab bar, sheets.
- **Never hard-code brand colours.** Use `--brand`, `--brand-2`, `--brand-3` and derived tokens; per-feature
  colour with `tone-*` classes. Admins change the theme in the Theme Studio (`data-sr-studio-open`).
- Light and dark mode must both work.
- Every click gives feedback (kit does ripple/press); async buttons use `SRButton.run(btn, fn)`.
- Lists longer than ~10 items are paginated (`SRPager`). Every data view has loading, empty, error states.
- Nothing rotates, tilts or flips.
- Accessibility: labels on inputs, `aria-label` on icon buttons, `aria-current="page"` on active nav.
- Notifications: always `SRToast.success|warning|error|info(...)`: top-right stack with icon, title, ✕, message, optional buttons and a countdown bar.
- Honest UI: toasts/counters/notifications come from real data only — never fake "someone just withdrew" tickers.
- Escape user content; JSON-encode server data printed into scripts; CSRF on POST.

## Finish checklist
See section 10 of `SKILL.md`. Look at `screenshots/` to match the intended look.


## Hard rules learned from real sites (v5) — break none of these
- Stat cards = the exact `.sr-stat` strip markup in SKILL.md §6h (icon LEFT, label+value, pill RIGHT). Never icon-on-top, never custom card CSS.
- Admin module lists = `.sr-modules > .sr-module`. Headers with buttons = `.sr-page-head` + `.sr-page-head__actions`.
- Numbers/money never wrap (`.sr-stat__value`, `.sr-metric__v`, `.sr-money`). Text children of flex/grid get `min-width:0` (`.sr-grow`).
- Never add `position:relative` to all children of buttons/cards (breaks tap ripple → cards jump on click).
- Filter selects go in `.sr-filter-row`; public pages use `.sr-site-head`.
- Before finishing: open each page with `?sr-debug` at 360 px wide → must report "No overflow". See SKILL.md §6i.

- Every signed-in page has the top-right avatar menu ending in **Log out** (SKILL.md §6j). Compulsory.
- Phone text sizes are DreamWork-exact (SKILL.md §6k). Never enlarge fonts or paddings on phones; run tools/dw_measure.py → "OFF: 0".

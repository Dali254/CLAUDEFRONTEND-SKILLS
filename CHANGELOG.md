# Changelog

## v7.0 — 2026-11-22
The same rules in every AI tool, rules that can be tested, one command that runs every test, and a PHP + MySQL backend kit.

### Rules in every AI tool
- **`RULES.md` is the single source.** It has 33 numbered MUST / MUST NOT rules, and each names the check that proves it.
- **`tools/sync-rules` generates thin entry files** that repeat the top 10 rules plus the start-of-task and end-of-task text:
  - `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`;
  - `.cursor/rules/project.mdc` (`alwaysApply: true`), which replaces `sunrise-ui.mdc`;
  - the rules block at the top of `SKILL.md`.
  - `--check` fails on drift.
- **Start of task:** read RULES.md, restate the 5 most relevant rules, ask before breaking one.
- **End of task:** run `tools/check-all` and paste the result. Never say "done" while it fails.

### One command: `tools/check-all`
- **Fast checks:**
  - rules and kit copy in sync;
  - `php -l` on every PHP file, `node --check` on every JS file;
  - no `.php` in any link, form, redirect, `url()` or route;
  - no inline handlers, and a nonce on every inline script;
  - every icon name exists;
  - full-height and number-font greps (R13, R14);
  - no request data in SQL strings;
  - "stage" wording, never "fee";
  - no secrets in committed files;
  - the release zip is built and scanned.
- **Full run adds:**
  - kit demos at 360/390/412/768/1366 px in light and dark: contrast, overflow, console errors, CSP;
  - every dark theme at 390 px;
  - DreamWork sizes;
  - **backend browser QA** (`tools/qa/check_backend.py`):
    - every page reachable as guest, member and admin, at 5 widths plus large text (html 20px);
    - checks for sideways scroll, clipped text, cut-off placeholders, textareas under 60px, covered buttons/links/fields, console and page errors, CSP, unknown icons;
    - every searchable select is opened on a phone and an option picked;
    - Log out in the avatar menu;
    - field errors (client and server);
  - **security tests** (`check_security.py`, 58 checks): headers, private folders → 403, `.php` URLs, auth, IDOR, CSRF, dangerous uploads, rate limits, lockout, M-Pesa callback token;
  - **upgrade test** (`check_upgrade.py`): an old database plus the new code, with 5 concurrent first requests. Every migration applies exactly once, with no errors. `SR_UPGRADE_DUMP=live.sql` runs it on a copy of a live database.
- **Isolation:** tests run on a throw-away instance (`tools/qa/instance.py`) with its own `sr_ci_*` database, storage and config (`SR_CONFIG`, `SR_STORAGE`), so real data is never touched.
- **Enforcement:**
  - `.githooks/pre-commit` runs the fast checks (`SR_HOOK_FULL=1` for everything); turn it on with `tools/install-hooks`;
  - `.github/workflows/check.yml` runs the full suite with MariaDB 10.11 on every push and pull request;
  - `tools/release` builds `dist/sunrise-backend-<version>.zip`: no `app/config.php`, no dev router, no runtime files, no keys, with all `storage/*/.htaccess` guards;
  - `.gitignore` keeps config and runtime data out of git.

### PHP + MySQL backend kit (`backend/`, new)
- **Core:**
  - one `index.php` front controller with `.htaccess` and clean regex routes; every route declares its access (`public | guest | member | perm:x`);
  - PDO helpers;
  - automatic migrations (signature file per database + `GET_LOCK`);
  - libsodium-encrypted settings;
  - CSRF, a CSP nonce per request, security headers, rate limits, lockout with admin alerts, re-auth for dangerous actions;
  - roles and permissions;
  - sign-in-as with a return bar;
  - safe uploads (content check, image re-encode, random names, served by `/files/{id}` after a permission check);
  - notifications by in-app, email (SMTP presets), SMS, WhatsApp and push, through an outbox sent after the response, with editable templates and a preview;
  - audit and activity logs; backups; maintenance mode; cron; installer;
  - `after_response()` for slow work.
- **Generic admin CRUD** (`crud_routes()`): search, paging, field errors, delete with re-auth and audit, bulk add.
- **CLI:** `cron | migrate | backup | make-admin | module list|NAME on|off | demo`.
- **Modules, all OFF by default:**
  - **members**: sign-up form builder (text, list, date, yes/no, country → province), approvals, filters, CSV export with formula-injection guard;
  - **jobs**: search and filters, apply, my applications, admin board, **CSV import** with a check on every row and update by `ref`;
  - **payments**:
    - M-Pesa STK push in simulate, sandbox or live mode, with encrypted keys;
    - callback secured by a URL token, a CheckoutRequestID and amount match, and an STK query before success;
    - live status page;
    - **staged payments** approved straight away, by staff, or automatically after N minutes/hours/days;
    - waiting screen with an ETA countdown, approvals queue, staff alerts;
  - **documents**: document types, phone upload, staff review with "send back" notes, private files;
  - **partners**:
    - `?ref=CODE` on any page with a 30-day cookie;
    - opens counted once per visitor per day, link-preview bots ignored;
    - sign-ups land on the page they were invited to;
    - share panel (WhatsApp, Facebook, Telegram, X, copy, native share);
    - commission on paid stages; withdrawals with an M-Pesa code;
  - **chat**: member ↔ staff on the kit's `SRChat` contract, with an AI assistant (FAQ matcher with no key, Anthropic or OpenAI). It answers from your FAQs and hands over to a person. Staff inbox and alerts;
  - **geo**: countries and provinces/counties manager with add/edit/delete and bulk add; records store ids, so a rename shows everywhere; delete is blocked while the item is in use;
  - **content**: FAQs, pages (`/p/{slug}`), promo banners;
  - **pwa**: manifest, service worker with offline page, install prompt, Web Push with VAPID keys generated for you (no library, no payload encryption needed).
- `backend/README.md` covers starting a project in 5 lines (example brief → what it produces), install, file map, how to add a page or a module, and the hooks.

### UI lessons → rules + kit fixes
- Large phone text wraps instead of clipping or overlapping (R8; buttons wrap, the error summary wraps, status titles use a 2-line clamp).
- Textareas are at least 6.5rem tall (R9). Placeholders never wrap and end with "…" (the input itself now has `text-overflow:ellipsis`, which Chrome needs).
- Sheets, popovers, combos and modals are portaled to `<body>` on phones (`SRPortal`, R12). The topbar fades into the page.
- Full height is measured by JS (`--sr-app-h`, `data-sr-fill`, R13). Amounts and codes use the body font with tabular numbers, never mono (R14).
- Field errors (R15):
  - red box, message under the field, `aria-describedby`;
  - jump to the first error, plus a toast naming it;
  - works on `novalidate` forms and clears when fixed;
  - file names end with an ellipsis; inline status dots.
- **Fix:** live field checks no longer steal focus while you type. `checkValidity()` fired `invalid`, which triggered the submit-time jump.
- Chat recipe (§6s) and email recipe (§6t). Chat timestamps are full white or `--muted` with no opacity, so they pass 4.5:1 (R16).
- Member wording says "stages", never "fees" (R19). The SKILL examples were updated.
- **New icon aliases:** `payment`, `delete`, `device-mobile`, `envelope-simple`, `megaphone`, `upload`, `share`, `download`, `color`. Unknown names used to render empty tiles, and now fail `check-all`.
- The sidebar marks only one item as current (the longest matching path).
- The breadcrumb stacks section and title (the demo's inline styles moved into the kit).
- `initials()` helper.

## v6.1 — 2026-11-22
- **Status-check pages** (`.sr-status` + `SRStatus`):
  - five states: pending, success, failed, cancelled, timeout;
  - a countdown ring, a step checklist and a receipt;
  - polling with backoff that pauses while hidden and survives going offline;
  - "I've paid — check again" with no re-charge;
  - screen-reader announcements.
  - Demo: `demo/status.html`.
- **Loading** (`SRLoad`):
  - a first-load preloader that self-hides, with a CSS failsafe;
  - an automatic page-change progress bar (`data-sr-nav-progress`);
  - skeleton presets for rows, stats, tiles and tables;
  - busy overlays with a 300 ms delay and a 500 ms minimum;
  - spinners and loading dots;
  - an automatic offline pill and "Back online" toast.
- **Page states** (`.sr-state`): loading, empty, error (with a reference code) and offline. Demo: `demo/loading.html`.
- SKILL.md §6q and §6r, plus new checklist items.

## v6 — 2026-11-22
Prevents the frontend bugs hit on a real production site. Grouped as in the upgrade spec.

### A. Housekeeping
- Root `SKILL.md` is the single source; `tools/sync_skill.py` copies it to `skills/sunrise-dashboard-ui/` (`--check` for CI).
- Title bumped to v6; this changelog added.

### B. Kit fixes
- Dark `--faint` raised to `#859195` (≥ 4.68:1 on paper/surface/surface-2/sunken; was 3.6:1). Light `--faint` raised to `#756861` (was 2.4:1).
- `.sr-btn--danger` is `#e11d48` (hover `#be123c`): 4.7:1 with white. It was `#f43f5e`, at 3.7:1. The toast danger action is `#dc2626`.
- `.sr-logo__word>span` uses `--brand-fg` in dark mode.
- `--brand-fg` is computed by `sunrise-theme.js` for **any** brand: blended with white (dark) or black (light) until ≥ 4.5:1 on every background of the mode, including the brand tint.
- The brand-gradient stops (`--sr-g1..3`) are darkened until white text passes 4.5:1 at every stop. `--grad-brand` uses them.
- `[hidden]{display:none!important}` is global.
- `SR_THEME.dark = { theme, useAccent }`. Config can also come from `<meta name="sr-theme" content='{…}'>`, which needs no inline script.
- **10 dark themes**: midnight, ocean, forest, purple, wine, teal, coffee, steel, rose, oled. Each comes in a solid, gradient or glass look. Selectors are `html.dark[data-sr-dark=…]:not(#sr-x)`, with no `!important` on neutrals.
- The Theme Studio has a dark-theme picker: cards with a mini preview, a look badge, a "use accent" switch and a live **Text readable (AA)** check (`SRTheme.audit()`). The same picker works anywhere with `<div data-sr-dark-picker>`.
- Contrast bugs found by the new QA tool and fixed:
  - the selected filter chip showed white text on white;
  - tone text on tinted cards was below AA (now 58% tone mixed with black);
  - `.sr-module__count`;
  - `.sr-amount.is-in` and `.sr-plus`;
  - the referral Copy button;
  - links on the brand tint in dark mode.
- Status text has dark variants (`#4ade80` / `#fb7185`); new `.sr-text-ok` / `.sr-text-bad` and `.sr-req`.
- Modal focus is synchronous; it was `setTimeout`.

### C. New components
- `sr-combo`: `<select data-sr-search>` becomes a searchable select in one field.
  - Search lives inside the list and matches label and value, ignoring accents.
  - Arrows, Enter and Esc work; focus is synchronous.
  - It is a bottom sheet at ≤ 640 px, mirrors `is-invalid`, and moves `label[for]` to the button.
- `sr-error-summary` + multi-step forms (`data-sr-steps`, `data-sr-validate`):
  - every error shows as "Field — message" with a **Step N ›** jump;
  - `SRForm.showErrors()` shows server errors.
- `sr-upload` upgrade:
  - canvas compression (≥ 350 KB, max 2000 px, JPEG 0.82);
  - a `<meta name="sr-max-upload">` size check;
  - a "Photo received — tap to change" state;
  - `SRUpload.send()` posts by XHR with a progress bar, so files survive a failed submit.
- `sr-bulk`: "Select all (N on this page)" with an indeterminate state, a count and actions; event `sr:bulk`.
- `sr-promo`: a deep brand banner with globe and flight-path art.
  - The "Featured" eyebrow and white pill CTA sit on the banner.
  - It swipes as a carousel with dots: 90% slides on phones, 2 across from 900 px.
  - Auto-advance pauses on touch, hover or focus, and is off with reduced motion.
- New demo: `demo/components.html`.

### D. Rules (SKILL.md §6i)
- No inline handlers.
- A CSP nonce on every inline script.
- No CDNs: fonts and Phosphor are self-hosted in `kit/fonts/` and `kit/vendor/phosphor/`.
- Null-check every lookup.
- No delayed focus.
- Dark-mode status colours.
- White text only on ≥ 4.5:1 colours, including gradient ends.
- The demos now run under a strict CSP. Their page code moved to `demo/js/` and every element lookup is null-checked.

### E. QA
- New `tools/qa_all.py`. One run covers pages × 360/412/1280 px × light, classic dark and all 10 dark themes. It checks:
  - overflow;
  - real text contrast, compositing rgba backgrounds and counting the body glow at its brightest;
  - white text on every gradient stop;
  - console and page errors;
  - CSP violations;
  - that login really succeeded.
  `--reset-cmd` / `--reset-url` reset rate limits. It exits 1 on any failure.
- `qa.py` and `dw_measure.py` take a folder **or** a URL and default to `demo/`. `SR_CHROME` optionally sets the browser.

### F. Checklist
- §10 adds:
  - `qa_all.py` must report zeros;
  - signed-in pages are tested while signed in;
  - every dark theme passes contrast;
  - forms show a per-field error summary and keep uploads;
  - no inline handlers, no CDNs, a nonce on every inline script.

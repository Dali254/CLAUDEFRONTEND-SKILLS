# RULES — Sunrise UI + PHP kit (single source of truth)

Every AI tool and every person follows these rules. Entry files (AGENTS.md, CLAUDE.md, SKILL.md, .cursor,
Copilot, Gemini, Windsurf, Cline) are **generated** from this file by `tools/sync-rules`. Edit only this file.
Each rule names the check that proves it (`check-all` runs all of them). "MUST" = required, "MUST NOT" = forbidden.

## Start and end of every task
- **R1** At the start of a task you MUST read RULES.md fully before writing code, restate the 5 rules most
  relevant to the task, and, if a rule conflicts with the request, ask before breaking it.
- **R2** At the end of a task you MUST run `tools/check-all` and paste its result. You MUST NOT say "done"
  while any check fails. *(check: the result itself)*
- **R3** You MUST NOT edit generated entry files. Change RULES.md, then run `tools/sync-rules`. *(check: `sync-rules --check`)*
- **R4** New project: you MUST first ask "Backend: PHP + MySQL (cPanel-ready) / frontend only / other?" (skip if already
  stated), then at most 3 questions: name + brand colour, modules to switch on, payment provider.

## Frontend (Sunrise UI kit)
- **R5** You MUST use the kit's markup and classes from SKILL.md. You MUST NOT edit files in `kit/` inside a project;
  overrides go in one `app.css`. *(check: kit hash)*
- **R6** You MUST NOT load anything from a third-party CDN (fonts, icons, libraries, QR code). Self-host it. *(check: csp)*
- **R7** You MUST NOT use inline event handlers (`onclick`, `onsubmit`…). Every inline `<script>` MUST carry the CSP nonce.
  Pages MUST load with zero console errors and zero CSP violations. *(check: csp, crawl)*
- **R8** Every page MUST have no sideways scroll, no clipped text and no overlapping text at 360, 390, 412, 768 and 1366 px,
  and again with large text (html font-size 20px). *(check: layout)*
- **R9** Buttons with long labels MUST be allowed to wrap. Placeholders MUST be short (≤ 28 characters) and MUST NOT
  wrap inside one-line inputs. Textareas MUST be at least 60px tall (kit: 6.5rem). *(check: layout)*
- **R10** Phone sizes come from the kit's DreamWork scale. You MUST NOT enlarge fonts, paddings or icons on phones. *(check: dw_measure)*
- **R11** Searchable selects MUST be `<select data-sr-search>`. You MUST NOT build a separate search box + select.
  On a phone the list MUST open and an option MUST be clickable (nothing on top of it). *(check: combo)*
- **R12** Bottom sheets, popovers and modals MUST be moved to `<body>` when opened on phones (the kit does this).
  You MUST NOT put fixed overlays inside cards that use transform/isolation without the kit's portal. *(check: combo)*
- **R13** Full-height screens (chat) MUST use the kit's measured height (`--sr-app-h`). You MUST NOT use `calc(100dvh - …rem)`. *(check: grep)*
- **R14** Amounts and codes MUST use the body font with tabular numbers. You MUST NOT use a monospace web font for them
  (code blocks only). *(check: grep)*
- **R15** Field errors MUST show under the exact field with a red box, scroll to the first error, raise a toast that names
  it, work for `novalidate` forms, and clear when fixed. Multi-step forms MUST list every error (§6m). *(check: forms)*
- **R16** Text MUST meet WCAG AA (4.5:1, large text 3:1) in light mode and every dark theme; white text MUST pass at
  every stop of a gradient. *(check: qa_all)*
- **R17** You MUST NOT show a blank wait: skeletons for known layouts, busy overlays for card saves, progress bar for
  page changes. Payment/verification flows MUST use `.sr-status`; "timeout" MUST NOT be shown as "failed". *(check: review)*
- **R18** Every signed-in page MUST have the top-right avatar menu ending in **Log out** (POST + CSRF). *(check: crawl)*
- **R19** Member-facing screens MUST describe payments as service stages ("Stage 2 of 3 · Work Permit Processing").
  They MUST NOT use the words "fee" or "fees". *(check: wording)*

## Backend (PHP + MySQL kit)
- **R20** URLs MUST be clean. There MUST NOT be ".php" in any href, form action, redirect, route or JS URL. All requests go
  through `index.php` + `.htaccess`; pages live in `app/pages`, views in `app/views`. *(check: php-urls, crawl)*
- **R21** All SQL MUST go through the PDO helpers with bound parameters. You MUST NOT put request data into SQL strings. *(check: sql)*
- **R22** Every POST MUST verify the CSRF token. Anything that changes data MUST be a POST. *(check: security)*
- **R23** Every route MUST declare who can open it (guest / member / permission). Every record lookup by id MUST check that
  the user owns it or has the permission (no IDOR). *(check: security)*
- **R24** Uploads MUST be checked by content type and size, saved with random names under `storage/` (deny-all
  `.htaccess`), and served only through a route that checks permission. *(check: security, release)*
- **R25** Schema changes MUST be new numbered files in `app/migrations`. They MUST apply automatically on the first request
  (signature + `GET_LOCK`) and MUST run cleanly on a copy of the live database. You MUST NOT edit an old migration. *(check: upgrade)*
- **R26** Secrets MUST live in `app/config.php` (never committed, never zipped) or encrypted settings. You MUST NOT
  hard-code keys. *(check: release)*
- **R27** Every response MUST send the security headers and a per-request CSP nonce. Login, OTP, password reset and
  payments MUST be rate-limited, with lockout and a security alert. *(check: security)*
- **R28** Dangerous actions (delete, role change, payouts, settings, sign-in-as) MUST require re-authentication within the
  last 10 minutes and MUST be written to the audit log. *(check: security)*
- **R29** Payments MUST verify the provider's webhook signature, take status only from the server, use an idempotency key,
  and MUST NOT retry a charge automatically. *(check: security)*
- **R30** Optional modules MUST be OFF by default and switched on in settings. *(check: upgrade)*
- **R31** Every PHP file MUST pass `php -l`; every JS file MUST pass `node --check`. *(check: lint)*

## Release
- **R32** A release zip MUST NOT contain `app/config.php`, `.env`, `tools/devrouter.php` or anything that looks like a real
  key (`pfx_`, `sk-`, `sk_live_`, `AKIA`, private keys). It MUST contain every `storage/*/.htaccess` guard. *(check: release)*
- **R33** `tools/check-all` MUST pass before a commit (pre-commit hook) and on every push (GitHub Actions). *(check: ci)*

## Top 10 (repeated in every entry file)
R1 · R2 · R7 · R8 · R15 · R20 · R22 · R23 · R25 · R32

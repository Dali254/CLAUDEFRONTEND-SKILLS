<?php /* signed-in shell. R18: avatar menu ends with Log out (POST + CSRF). */
$u = user(); $imp = impersonator(); $initials = strtoupper(mb_substr(preg_replace('/\s+/', ' ', trim($u['name'] ?? '?')), 0, 1) . mb_substr((string)strrchr(' ' . trim($u['name'] ?? ''), ' '), 1, 1));
$unread = $u ? unread_count((int)$u['id']) : 0; $word = config('app_name'); $half = (int)ceil(mb_strlen($word) / 2); ?>
<!doctype html>
<html lang="en">
<head><?= partial('partials/head', ['title' => $title ?? '']) ?></head>
<body data-sr-nav-progress>
<?php if ($imp): ?>
<form class="sr-return-bar" method="post" action="<?= url('/return-to-admin') ?>"><?= csrf_field() ?><i class="ph ph-user-switch" aria-hidden="true"></i><span>You are signed in as <b><?= e($u['name']) ?></b></span><button class="sr-btn sr-btn--sm sr-btn--secondary">Return to <?= e($imp['name']) ?></button></form>
<?php endif; ?>
<div class="sr-app">
  <aside class="sr-rail">
    <div class="sr-rail__brand"><a href="<?= url('/dashboard') ?>" class="sr-logo"><span class="sr-logo__mark" aria-hidden="true"><?= partial('partials/logo-mark') ?></span><span class="sr-logo__word"><?= e(mb_substr($word, 0, $half)) ?><span><?= e(mb_substr($word, $half)) ?></span></span></a></div>
    <nav class="sr-rail__body" aria-label="Main"><?= partial('partials/nav') ?></nav>
    <div class="sr-rail__foot"><a href="<?= url('/account') ?>" class="sr-side-profile"><span class="sr-avatar"><?= e($initials) ?></span><span class="sr-grow"><span class="sr-side-profile__name"><?= e($u['name']) ?></span><span class="sr-side-profile__meta"><?= e($u['phone'] ?: $u['email']) ?></span></span></a></div>
  </aside>
  <div class="sr-main-col">
    <header class="sr-topbar">
      <div class="sr-topbar__bar">
        <a href="<?= url('/dashboard') ?>" class="sr-logo sr-topbar__brand" aria-label="<?= e($word) ?> home"><span class="sr-logo__mark" aria-hidden="true"><?= partial('partials/logo-mark') ?></span><span class="sr-logo__word"><?= e(mb_substr($word, 0, $half)) ?><span><?= e(mb_substr($word, $half)) ?></span></span></a>
        <nav class="sr-crumb" aria-label="Breadcrumb"><span class="sr-crumb__mark" aria-hidden="true"></span><span><span class="sr-crumb__root"><?= e($section ?? 'Workspace') ?></span><span class="sr-crumb__here"><?= e($title ?? '') ?></span></span></nav>
        <div class="sr-topbar__actions">
          <a class="sr-icon-btn" href="<?= url('/notifications') ?>" aria-label="Notifications<?= $unread ? " ($unread unread)" : '' ?>"><i class="ph ph-bell"></i><?php if ($unread): ?><span class="sr-icon-btn__dot"></span><?php endif; ?></a>
          <button class="sr-icon-btn" data-sr-theme-toggle aria-label="Toggle dark mode"><i class="ph ph-moon"></i></button>
          <span class="sr-topbar__div" aria-hidden="true"></span>
          <div class="sr-rel">
            <button class="sr-account" data-sr-pop="pop-account" aria-label="Account menu" aria-expanded="false"><span class="sr-avatar sr-avatar--sm"><?= e($initials) ?></span><span class="sr-account__name"><?= e($u['name']) ?></span><i class="ph ph-caret-down sr-muted"></i></button>
            <div class="sr-popover sr-popover--account" id="pop-account" hidden>
              <div class="sr-menu-head"><span class="sr-menu-head__avatar"><?= e($initials) ?></span><span class="sr-grow"><span class="sr-menu-head__name"><?= e($u['name']) ?></span><span class="sr-menu-head__meta"><?= e($u['phone'] ? '+' . $u['phone'] : $u['email']) ?></span></span></div>
              <div class="sr-menu-sep"></div>
              <a href="<?= url('/account') ?>" class="sr-menu-item"><i class="ph ph-user"></i>Profile &amp; security</a>
              <?php if (module_on('pwa')): ?><button type="button" class="sr-menu-item" data-sr-install hidden><i class="ph ph-download-simple"></i>Install app</button><?php endif; ?>
              <div class="sr-menu-sep"></div>
              <form method="post" action="<?= url('/logout') ?>"><?= csrf_field() ?><button class="sr-menu-item sr-menu-item--danger"><i class="ph ph-sign-out"></i>Log out</button></form>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="sr-main" id="main"><?= $content ?></main>
  </div>
</div>
<nav class="sr-tabbar" aria-label="Primary">
  <?php $tabs = array_slice(menu('tabbar'), 0, 4); $cur = nav_active(array_column($tabs, 'path')); foreach ($tabs as $i => $t): $on = $t['path'] === $cur; ?>
    <?php if ($i === 2 && ($cta = menu('tabbar_cta')[0] ?? null)): ?><a href="<?= url($cta['path']) ?>" class="sr-tab sr-tab--cta"><span class="sr-tab__icon"><?= icon($cta['icon']) ?></span><?= e($cta['label']) ?></a><?php endif; ?>
    <a href="<?= url($t['path']) ?>" class="sr-tab<?= $on ? ' is-active' : '' ?>"<?= $on ? ' aria-current="page"' : '' ?>><span class="sr-tab__icon"><?= icon($t['icon']) ?></span><?= e($t['label']) ?></a>
  <?php endforeach; ?>
  <button class="sr-tab" data-sr-drawer-open><span class="sr-tab__icon"><?= icon('apps') ?></span>Menu</button>
</nav>
<div class="sr-scrim"></div>
<aside class="sr-drawer" aria-label="Menu">
  <div class="sr-rail__brand"><a href="<?= url('/dashboard') ?>" class="sr-logo"><span class="sr-logo__mark" aria-hidden="true"><?= partial('partials/logo-mark') ?></span><span class="sr-logo__word"><?= e(mb_substr($word, 0, $half)) ?><span><?= e(mb_substr($word, $half)) ?></span></span></a><button class="sr-icon-btn sr-ml-auto" data-sr-drawer-close aria-label="Close menu"><i class="ph ph-x"></i></button></div>
  <a href="<?= url('/account') ?>" class="sr-side-profile"><span class="sr-avatar"><?= e($initials) ?></span><span class="sr-grow"><span class="sr-side-profile__name"><?= e($u['name']) ?></span><span class="sr-side-profile__meta"><?= e($u['phone'] ? '+' . $u['phone'] : $u['email']) ?></span></span><i class="ph ph-arrow-right sr-muted"></i></a>
  <nav class="sr-rail__body" aria-label="Menu"><?= partial('partials/nav') ?></nav>
</aside>
<?= partial('partials/flash') ?>
<script src="<?= asset('sunrise/sunrise-icons.js') ?>"></script>
<script src="<?= asset('sunrise/sunrise-ui.js') ?>"></script>
<script src="<?= asset('app.js') ?>"></script>
</body>
</html>

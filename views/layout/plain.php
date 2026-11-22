<?php $word = config('app_name') ?: 'App'; $half = (int)ceil(mb_strlen($word) / 2);
$logo = '<span class="sr-logo__mark" aria-hidden="true">' . partial('partials/logo-mark') . '</span><span class="sr-logo__word">' . e(mb_substr($word, 0, $half)) . '<span>' . e(mb_substr($word, $half)) . '</span></span>'; ?>
<!doctype html>
<html lang="en">
<head><?= partial('partials/head', ['title' => $title ?? '']) ?></head>
<body>
<div class="sr-auth">
  <aside class="sr-auth__aside" aria-hidden="true">
    <a href="<?= url('/') ?>" class="sr-logo" tabindex="-1"><?= $logo ?></a>
    <div><h2><?= e(setting('site.tagline', 'Welcome back.')) ?></h2><p><?= e(setting('site.pitch', '')) ?></p></div>
    <p class="sr-auth__fine">© <?= gmdate('Y') ?> <?= e($word) ?></p>
  </aside>
  <main class="sr-auth__main">
    <button class="sr-auth__theme" data-sr-theme-toggle aria-label="Toggle dark mode"><i class="ph ph-moon"></i></button>
    <a href="<?= url('/') ?>" class="sr-logo sr-auth__logo" aria-label="<?= e($word) ?> home"><?= $logo ?></a>
    <?= $content ?>
    <p class="sr-auth__foot">© <?= gmdate('Y') ?> <?= e($word) ?></p>
  </main>
</div>
<?= partial('partials/flash') ?>
<script src="<?= asset('sunrise/sunrise-icons.js') ?>"></script>
<script src="<?= asset('sunrise/sunrise-ui.js') ?>"></script>
<script src="<?= asset('app.js') ?>"></script>
</body>
</html>

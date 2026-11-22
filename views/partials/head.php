<?php /* shared <head> (R6: everything self-hosted; R7: theme config via meta, no inline script) */
$theme = (array)setting('theme', ['preset' => 'ember']); $title = ($title ?? '') !== '' ? $title . ' · ' . config('app_name') : config('app_name'); ?>
<meta charset="utf-8">
<meta name="sr-base" content="<?= e(base_path()) ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e($title) ?></title>
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<meta name="sr-theme" content="<?= e(json_encode($theme, JSON_UNESCAPED_SLASHES)) ?>">
<meta name="sr-max-upload" content="<?= (int)setting('uploads.max_bytes', 8388608) ?>">
<?php if (module_on('pwa')): ?><link rel="manifest" href="<?= url('/manifest.webmanifest') ?>"><?php endif; ?>
<?= implode('', fire('page.head')) ?>
<link rel="icon" href="<?= asset('icon.svg') ?>">
<link rel="stylesheet" href="<?= asset('sunrise/sunrise-fonts.css') ?>">
<link rel="stylesheet" href="<?= asset('sunrise/vendor/phosphor/phosphor.css') ?>">
<link rel="stylesheet" href="<?= asset('sunrise/sunrise.css') ?>">
<link rel="stylesheet" href="<?= asset('app.css') ?>">
<script src="<?= asset('sunrise/sunrise-theme.js') ?>"></script>

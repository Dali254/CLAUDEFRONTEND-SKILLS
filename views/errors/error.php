<div class="sr-page"><div class="sr-state sr-state--page tone-<?= $code >= 500 ? 'danger' : ($code === 403 ? 'amber' : 'neutral') ?>">
  <span class="sr-state__icon"><i class="ph <?= $code === 404 ? 'ph-compass' : ($code === 403 ? 'ph-lock' : ($code === 429 ? 'ph-hourglass-medium' : ($code === 503 ? 'ph-wrench' : 'ph-warning-octagon'))) ?>"></i></span>
  <h1 class="sr-state__title"><?= e($message) ?></h1>
  <p class="sr-state__text"><?= $code === 404 ? 'The link may be old or mistyped.' : ($code >= 500 ? 'We have been told about it. Please try again in a minute.' : '') ?></p>
  <div class="sr-state__actions"><a class="sr-btn sr-btn--primary sr-btn--square sr-btn--sm" href="<?= url(user() ? '/dashboard' : '/') ?>">Go home</a></div>
  <span class="sr-state__code">Error <?= (int)$code ?><?= !empty($ref) ? ' · ref ' . e($ref) : '' ?></span>
</div></div>

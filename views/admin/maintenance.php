<div class="sr-page" style="max-width:48rem;width:100%;margin:0 auto">
  <header class="sr-page-head tone-success"><span class="sr-glyph"><?= icon('wrench') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Maintenance</h1></div>
    <p class="sr-page-head__text">Version <?= e(APP_VERSION) ?> · cron <?= $cron ? 'ran ' . e(ago(gmdate('Y-m-d H:i:s', $cron))) : 'has not run yet' ?></p></header>
  <form class="sr-callout tone-<?= setting('maintenance.on', false) ? 'amber' : 'neutral' ?>" method="post" action="<?= url('/admin/maintenance') ?>"><?= csrf_field() ?><input type="hidden" name="action" value="maintenance"><span class="sr-ic"><?= icon('wrench') ?></span>
    <p class="sr-callout__t">Maintenance mode is <?= setting('maintenance.on', false) ? 'ON' : 'off' ?></p><p class="sr-callout__s">While on, members see a "back soon" page.</p><button class="sr-btn sr-btn--secondary sr-btn--sm sr-callout__a"><?= setting('maintenance.on', false) ? 'Switch off' : 'Switch on' ?></button></form>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('database') ?></span><h2 class="sr-panel__title">Backups</h2>
      <form class="sr-ml-auto" method="post" action="<?= url('/admin/maintenance') ?>"><?= csrf_field() ?><input type="hidden" name="action" value="backup"><button class="sr-btn sr-btn--primary sr-btn--sm">Back up now</button></form></div>
    <?php foreach ($files as $f): $n = basename($f); ?><div class="sr-row"><div class="sr-grow"><p class="sr-row__title"><?= e($n) ?></p><p class="sr-row__meta"><?= e(round(filesize($f) / 1024)) ?> KB · <?= e(gmdate('j M Y H:i', filemtime($f))) ?> UTC</p></div><a class="sr-pill-link" href="<?= url('/admin/backups/' . $n) ?>">Download</a></div><?php endforeach; ?>
    <?php if (!$files): ?><div class="sr-empty"><p>No backups yet.</p></div><?php endif; ?>
    <form class="sr-panel__body sr-form-foot" method="post" action="<?= url('/admin/maintenance') ?>"><?= csrf_field() ?><input type="hidden" name="action" value="auto">
      <?= field(['name' => 'days', 'label' => 'Automatic backup every … days (0 = off)', 'type' => 'number', 'value' => (string)setting('backup.auto_days', 1)]) ?><button class="sr-btn sr-btn--secondary sr-btn--sm">Save</button></form></section>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('history') ?></span><h2 class="sr-panel__title">Database updates (migrations)</h2></div>
    <?php foreach ($migs as $m): ?><div class="sr-row"><div class="sr-grow"><p class="sr-row__title"><?= e($m['name']) ?></p><p class="sr-row__meta">applied <?= e(ago($m['ran_at'])) ?></p></div></div><?php endforeach; ?></section>
</div>

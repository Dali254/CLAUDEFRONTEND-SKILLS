<div class="sr-page">
  <?php if (!$cron || time() - $cron > 600): ?>
  <div class="sr-callout tone-amber"><span class="sr-ic"><?= icon('clock') ?></span><p class="sr-callout__t">Cron has not run <?= $cron ? 'since ' . e(gmdate('j M H:i', $cron)) . ' UTC' : 'yet' ?></p>
    <p class="sr-callout__s">Emails, SMS and auto-approvals wait for it. In cPanel → Cron Jobs add: <code>* * * * * php <?= e(ROOT) ?>/app/cli.php cron</code></p></div>
  <?php endif; ?>
  <section class="sr-stats sr-stats--row">
    <?php foreach ($stats as [$label, $value, $ic, $tone, $hint]): ?>
    <div class="sr-stat tone-<?= e($tone) ?>"><span class="sr-stat__icon"><?= icon($ic) ?></span><div class="sr-stat__body"><p class="sr-stat__label"><?= e($label) ?></p><p class="sr-stat__value"><?= e(is_numeric($value) ? number_format((float)$value) : (string)$value) ?></p></div><span class="sr-stat__hint"><?= e($hint) ?></span></div>
    <?php endforeach; ?>
  </section>
  <section><div class="sr-head"><div><p class="sr-kicker">Control center</p><h2 class="sr-title">Admin</h2></div></div>
    <div class="sr-modules"><?php foreach ($links as $l): if ($l['path'] === '/admin') continue; ?>
      <a href="<?= url($l['path']) ?>" class="sr-module tone-<?= e($l['tone'] ?? 'brand') ?>"><span class="sr-glyph"><?= icon($l['icon']) ?></span><div><p class="sr-module__t"><?= e($l['label']) ?></p></div><span class="sr-module__go"><i class="ph ph-caret-right"></i></span></a>
    <?php endforeach; ?></div></section>
</div>

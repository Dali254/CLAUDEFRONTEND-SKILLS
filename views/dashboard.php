<?php $h = (int)gmdate('G') + 3; $greet = $h % 24 < 12 ? 'Good morning' : ($h % 24 < 17 ? 'Good afternoon' : 'Good evening'); ?>
<div class="sr-page">
  <header class="sr-greet"><span class="sr-avatar sr-avatar--ring sr-greet__avatar"><?= e(mb_strtoupper(mb_substr($u['name'], 0, 1))) ?></span>
    <div class="sr-grow"><p class="sr-greet__date"><?= e(gmdate('l, j F')) ?></p><h1 class="sr-greet__hello"><?= e($greet) ?>, <span><?= e(explode(' ', $u['name'])[0]) ?></span></h1></div></header>
  <?php foreach ($cards as $c) echo $c; ?>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('history') ?></span><h2 class="sr-panel__title">Recent activity</h2></div>
    <?php if (!$recent): ?><div class="sr-empty"><p>Nothing yet.</p></div><?php endif; ?>
    <?php foreach ($recent as $r): ?><div class="sr-row"><span class="sr-row__icon tone-neutral"><?= icon('history') ?></span><div class="sr-grow"><p class="sr-row__title"><?= e($r['what']) ?></p><p class="sr-row__meta"><?= e(ago($r['created_at'])) ?></p></div></div><?php endforeach; ?>
  </section>
</div>

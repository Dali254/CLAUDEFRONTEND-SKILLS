<div class="sr-page" style="max-width:44rem;width:100%;margin:0 auto">
<?= implode("", fire("notifications.top")) ?>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('alert') ?></span><h1 class="sr-panel__title">Notifications</h1>
    <form class="sr-ml-auto" method="post" action="<?= url('/notifications/read') ?>"><?= csrf_field() ?><button class="sr-pill-link">Mark all read</button></form></div>
    <?php if (!$p['rows']): ?><div class="sr-empty"><span class="sr-ic sr-ic--lg tone-neutral"><?= icon('alert') ?></span><p>No notifications yet.</p></div><?php endif; ?>
    <?php foreach ($p['rows'] as $n): ?>
      <a class="sr-row<?= $n['read_at'] ? '' : ' is-unread' ?>" href="<?= e(url($n['url'] ?: '/notifications')) ?>"><span class="sr-row__icon tone-<?= $n['read_at'] ? 'neutral' : 'brand' ?>"><?= icon('alert') ?></span>
        <div class="sr-grow"><p class="sr-row__title"><?= e($n['title']) ?></p><p class="sr-row__meta"><?= e($n['body']) ?> · <?= e(ago($n['created_at'])) ?></p></div></a>
    <?php endforeach; ?>
    <?= partial('partials/pager', ['p' => $p]) ?>
  </section>
</div>

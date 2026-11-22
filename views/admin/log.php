<div class="sr-page">
  <header class="sr-page-head tone-<?= $kind === 'audit' ? 'cyan' : 'danger' ?>"><span class="sr-glyph"><?= icon($kind === 'audit' ? 'clipboard-task' : 'shield-checkmark') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title"><?= e($title) ?></h1></div></header>
  <?php if ($types): ?><div class="sr-filter-row"><a class="sr-chip-btn" aria-pressed="<?= $type === '' ? 'true' : 'false' ?>" href="<?= url('/admin/security') ?>">All</a><?php foreach ($types as $t): ?><a class="sr-chip-btn" aria-pressed="<?= $type === $t ? 'true' : 'false' ?>" href="<?= url('/admin/security', ['type' => $t]) ?>"><?= e(str_replace('_', ' ', $t)) ?></a><?php endforeach; ?></div><?php endif; ?>
  <section class="sr-panel">
    <?php if (!$p['rows']): ?><div class="sr-empty"><p>Nothing recorded yet.</p></div><?php endif; ?>
    <?php foreach ($p['rows'] as $r): ?><div class="sr-row"><div class="sr-grow">
      <p class="sr-row__title"><?= e($kind === 'audit' ? $r['action'] . ($r['target_type'] ? ' · ' . $r['target_type'] . ' #' . $r['target_id'] : '') : str_replace('_', ' ', $r['type'])) ?></p>
      <p class="sr-row__meta"><?= e(($r['name'] ?? 'Guest') . (!empty($r['imp']) ? ' (by ' . $r['imp'] . ')' : '') . ' · ' . ($r['ip'] ?? '') . ' · ' . ago($r['created_at'])) ?><?= $kind === 'security' && $r['detail'] ? ' · ' . e($r['detail']) : '' ?></p></div></div><?php endforeach; ?>
    <?= partial('partials/pager', ['p' => $p]) ?>
  </section>
</div>

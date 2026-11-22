<div class="sr-page">
  <header class="sr-page-head tone-<?= e($d['tone']) ?>"><span class="sr-glyph"><?= icon($d['icon']) ?></span><div><p class="sr-page-head__kicker"><?= e($d['kicker'] ?? 'Admin') ?></p><h1 class="sr-page-head__title"><?= e($d['title']) ?></h1></div>
    <p class="sr-page-head__text"><?= (int)$p['total'] ?> total<?= !empty($d['help']) ? ' · ' . e($d['help']) : '' ?></p>
    <div class="sr-page-head__actions"><?php foreach ($d['actions'] ?? [] as [$al, $au, $ai]): ?><a class="sr-btn sr-btn--secondary sr-btn--square" href="<?= url($au) ?>"><i class="ph ph-<?= e($ai) ?>"></i><?= e($al) ?></a><?php endforeach; ?><a class="sr-btn sr-btn--primary sr-btn--square" href="<?= url($d['path'] . '/new') ?>"><i class="ph ph-plus"></i>Add <?= e(mb_strtolower($d['singular'])) ?></a></div></header>
  <?php if ($d['search']): ?><form class="sr-search" method="get" action="<?= url($d['path']) ?>" role="search" data-sr-no-validate><label class="sr-search__field"><i class="ph ph-magnifying-glass"></i><input type="search" name="q" value="<?= e($q) ?>" placeholder="Search" aria-label="Search"></label><button class="sr-btn sr-btn--primary sr-btn--square sr-search__go">Search</button></form><?php endif; ?>
  <section class="sr-panel">
    <?php if (!$p['rows']): ?><div class="sr-empty"><span class="sr-ic sr-ic--lg tone-neutral"><?= icon($d['icon']) ?></span><p>Nothing here yet.</p><a class="sr-btn sr-btn--soft sr-btn--sm" href="<?= url($d['path'] . '/new') ?>">Add the first one</a></div><?php else: ?>
    <div class="sr-table-wrap"><table class="sr-table"><thead><tr><?php foreach ($d['list'] as $c): ?><th><?= e($d['fields'][$c]['label'] ?? ucfirst($c)) ?></th><?php endforeach; ?><th><span class="sr-only">Edit</span></th></tr></thead><tbody>
    <?php foreach ($p['rows'] as $r): ?><tr><?php foreach ($d['list'] as $i => $c): $f = $d['fields'][$c] ?? []; $v = $r[$c] ?? '';
        $txt = ($f['type'] ?? '') === 'checkbox' ? ($v ? 'Yes' : 'No') : (isset($f['options']) ? ($f['options'][$v] ?? $v) : (isset($d['format'][$c]) ? $d['format'][$c]($r) : $v)); ?>
      <td data-label="<?= e($f['label'] ?? $c) ?>"><?= $i === 0 ? '<a class="sr-cell__title" href="' . url($d['path'] . '/' . $r['id']) . '">' . e(mb_strimwidth((string)$txt, 0, 80, '…')) . '</a>' : e(mb_strimwidth((string)$txt, 0, 60, '…')) ?></td><?php endforeach; ?>
      <td><span class="sr-flex" style="gap:.35rem;justify-content:flex-end"><?php if (!empty($d['row_link'])): ?><a class="sr-pill-link" href="<?= url(str_replace('{id}', (string)$r['id'], $d['row_link'][1])) ?>"><?= e($d['row_link'][0]) ?></a><?php endif; ?><a class="sr-pill-link" href="<?= url($d['path'] . '/' . $r['id']) ?>">Edit</a></span></td></tr><?php endforeach; ?>
    </tbody></table></div><?php endif; ?>
    <?= partial('partials/pager', ['p' => $p]) ?>
  </section>
  <?php if (!empty($d['bulk'])): ?>
  <form class="sr-panel" method="post" action="<?= url($d['path'] . '/bulk') ?>" novalidate><?= csrf_field() ?>
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('add-circle') ?></span><div class="sr-grow"><h2 class="sr-panel__title">Bulk add</h2><p class="sr-hint">One per line. Existing names are skipped.</p></div></div>
    <div class="sr-panel__body sr-stack"><div class="sr-field"><label class="sr-label" for="bulk-lines">Names</label><textarea id="bulk-lines" class="sr-input" name="lines" rows="5" required></textarea></div>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--secondary sr-btn--square">Add all</button></div></div></form>
  <?php endif; ?>
</div>

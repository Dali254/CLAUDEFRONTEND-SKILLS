<div class="sr-page" style="max-width:46rem;width:100%;margin:0 auto">
  <a class="sr-pill-link" href="<?= url($d['path']) ?>"><i class="ph ph-arrow-left"></i><?= e($d['title']) ?></a>
  <form class="sr-panel" method="post" action="<?= url($d['path'] . '/' . ($row['id'] ?? 'new')) ?>" novalidate><?= csrf_field() ?>
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon($d['icon']) ?></span><h1 class="sr-panel__title"><?= e($title) ?></h1></div>
    <div class="sr-panel__body sr-stack">
      <?php foreach ($d['fields'] as $k => $f): $val = old($k, (string)($row[$k] ?? ($f['default'] ?? ''))); ?>
        <?php if (($f['type'] ?? '') === 'checkbox'): ?>
          <label class="sr-flex sr-hint"><input type="checkbox" class="sr-check" name="<?= e($k) ?>" value="1"<?= ($row ? !empty($row[$k]) : !empty($f['default'])) ? ' checked' : '' ?>><?= e($f['label']) ?></label>
        <?php elseif (!empty($f['readonly'])): ?>
          <div class="sr-field"><span class="sr-label"><?= e($f['label']) ?></span><input class="sr-input" readonly value="<?= e($val) ?>" aria-label="<?= e($f['label']) ?>"></div>
        <?php else: echo field(['name' => $k, 'value' => $val] + $f + ['label' => $k]); endif; ?>
      <?php endforeach; ?>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square">Save</button></div>
    </div></form>
  <?php if ($row): ?><form class="sr-callout tone-danger" method="post" action="<?= url($d['path'] . '/' . $row['id']) ?>"><?= csrf_field() ?><input type="hidden" name="_action" value="delete"><span class="sr-ic"><?= icon('delete') ?></span>
    <p class="sr-callout__t">Delete this <?= e(mb_strtolower($d['singular'])) ?></p><p class="sr-callout__s">This asks for your password and is recorded in the audit log.</p><button class="sr-btn sr-btn--danger sr-btn--sm sr-callout__a">Delete</button></form><?php endif; ?>
</div>

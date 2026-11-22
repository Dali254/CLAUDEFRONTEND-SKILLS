<div class="sr-page">
  <header class="sr-page-head tone-amber"><span class="sr-glyph"><?= icon('apps-list') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Modules</h1></div>
    <p class="sr-page-head__text">Every module is off until you switch it on. Its tables are already created, so switching on needs no database step.</p></header>
  <form method="post" action="<?= url('/admin/modules') ?>" novalidate><?= csrf_field() ?>
    <div class="sr-modules"><?php foreach ($meta as $name => $m): ?>
      <label class="sr-module tone-<?= e($m['tone'] ?? 'brand') ?>"><span class="sr-glyph"><?= icon($m['icon'] ?? 'apps') ?></span>
        <div><p class="sr-module__t"><?= e($m['title']) ?></p><p class="sr-module__s"><?= e($m['summary'] ?? '') ?></p></div>
        <input type="checkbox" class="sr-switch" name="on[]" value="<?= e($name) ?>"<?= module_on($name) ? ' checked' : '' ?><?= !empty($m['core']) ? ' disabled' : '' ?> aria-label="<?= e($m['title']) ?>"></label>
    <?php endforeach; ?></div>
    <div class="sr-form-foot"><span class="sr-hint">Saving asks for your password.</span><button class="sr-btn sr-btn--primary sr-btn--square">Save modules</button></div>
  </form>
</div>

<div class="sr-page">
  <header class="sr-page-head tone-violet"><span class="sr-glyph"><?= icon('person-key') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Roles &amp; permissions</h1></div>
    <p class="sr-page-head__text">Saving a role asks for your password and is written to the audit log.</p></header>
  <?php foreach (array_merge($roles, [['id' => 0, 'name' => '', 'slug' => 'new', 'permissions' => '[]', 'members' => 0]]) as $r): $mine = json_decode($r['permissions'], true) ?: []; ?>
  <form class="sr-panel" method="post" action="<?= url('/admin/roles') ?>" novalidate><?= csrf_field() ?><input type="hidden" name="role_id" value="<?= (int)$r['id'] ?>">
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon($r['id'] ? 'person-key' : 'add-circle') ?></span><div class="sr-grow"><h2 class="sr-panel__title"><?= $r['id'] ? e($r['name']) : 'New role' ?></h2><?php if ($r['id']): ?><p class="sr-hint"><?= (int)$r['members'] ?> people</p><?php endif; ?></div></div>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'name', 'label' => 'Role name', 'value' => $r['name'], 'id' => 'role-name-' . $r['id'], 'required' => !$r['id']]) ?>
      <?php if ($r['slug'] === 'super-admin'): ?><p class="sr-hint">Super admins always have every permission.</p><?php else: ?>
      <div class="sr-perm-grid"><?php foreach ($perms as $k => $label): ?><label class="sr-choice sr-choice--sm"><input class="sr-check" type="checkbox" name="perms[]" value="<?= e($k) ?>"<?= in_array($k, $mine, true) ? ' checked' : '' ?>><span class="sr-grow"><strong><?= e($label) ?></strong><span class="sr-hint"><?= e($k) ?></span></span></label><?php endforeach; ?></div>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square"><?= $r['id'] ? 'Save role' : 'Create role' ?></button></div><?php endif; ?>
    </div></form>
  <?php endforeach; ?>
</div>

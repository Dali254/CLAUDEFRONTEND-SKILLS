<div class="sr-page" style="max-width:48rem;width:100%;margin:0 auto">
  <header class="sr-page-head tone-sky"><span class="sr-glyph"><?= icon('person') ?></span><div><p class="sr-page-head__kicker">User #<?= (int)$t['id'] ?></p><h1 class="sr-page-head__title"><?= e($t['name']) ?></h1></div>
    <div class="sr-page-head__actions">
      <?php if (can('users.impersonate') && (int)$t['id'] !== (int)user()['id']): ?><form method="post" action="<?= url('/admin/users/' . $t['id'] . '/sign-in-as') ?>"><?= csrf_field() ?><button class="sr-btn sr-btn--secondary sr-btn--square"><i class="ph ph-user-switch"></i>Sign in as</button></form><?php endif; ?>
    </div></header>
  <form class="sr-panel" method="post" action="<?= url('/admin/users/' . $t['id']) ?>" novalidate><?= csrf_field() ?>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'name', 'label' => 'Name', 'required' => true, 'value' => old('name', $t['name'])]) ?>
      <?= field(['name' => 'email', 'label' => 'Email', 'type' => 'email', 'value' => old('email', (string)$t['email'])]) ?>
      <?= field(['name' => 'phone', 'label' => 'Phone', 'type' => 'tel', 'value' => old('phone', (string)$t['phone'])]) ?>
      <?= field(['name' => 'role_id', 'label' => 'Role', 'type' => 'select', 'options' => $roles, 'value' => old('role_id', (string)$t['role_id']), 'required' => true]) ?>
      <?= field(['name' => 'status', 'label' => 'Status', 'type' => 'select', 'options' => ['active' => 'Active', 'pending' => 'Waiting for approval', 'suspended' => 'Suspended'], 'value' => old('status', $t['status'])]) ?>
      <div class="sr-form-foot"><span class="sr-hint">Changing the role or status asks for your password.</span><button class="sr-btn sr-btn--primary sr-btn--square">Save</button></div>
    </div></form>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('history') ?></span><h2 class="sr-panel__title">Activity</h2></div>
    <?php foreach ($activity as $a): ?><div class="sr-row"><div class="sr-grow"><p class="sr-row__title"><?= e($a['what']) ?></p><p class="sr-row__meta"><?= e(ago($a['created_at'])) ?></p></div></div><?php endforeach; ?>
    <?php if (!$activity): ?><div class="sr-empty"><p>No activity yet.</p></div><?php endif; ?></section>
  <?php if ((int)$t['id'] !== (int)user()['id']): ?>
  <form class="sr-callout tone-danger" method="post" action="<?= url('/admin/users/' . $t['id'] . '/delete') ?>"><?= csrf_field() ?><span class="sr-ic"><?= icon('delete') ?></span><p class="sr-callout__t">Delete this user</p><p class="sr-callout__s">Their account is removed. Payments and audit records are kept.</p><button class="sr-btn sr-btn--danger sr-btn--sm sr-callout__a">Delete user</button></form>
  <?php endif; ?>
</div>

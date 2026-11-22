<div class="sr-page" style="max-width:44rem;width:100%;margin:0 auto">
  <header class="sr-page-head tone-sky"><span class="sr-glyph"><?= icon('person') ?></span><div><p class="sr-page-head__kicker">Account</p><h1 class="sr-page-head__title">Profile &amp; security</h1></div></header>
  <form class="sr-panel" method="post" action="<?= url('/account') ?>" novalidate><?= csrf_field() ?><input type="hidden" name="action" value="profile">
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('person') ?></span><h2 class="sr-panel__title">Profile</h2></div>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'name', 'label' => 'Full name', 'required' => true, 'value' => old('name', $u['name']), 'autocomplete' => 'name']) ?>
      <?= field(['name' => 'email', 'label' => 'Email', 'type' => 'email', 'value' => old('email', (string)$u['email']), 'autocomplete' => 'email']) ?>
      <div class="sr-field"><span class="sr-label">Phone</span><input class="sr-input" value="<?= e($u['phone'] ? '+' . $u['phone'] : '') ?>" readonly aria-label="Phone"><span class="sr-hint">Contact support to change your phone number.</span></div>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square">Save profile</button></div>
    </div></form>
  <form class="sr-panel" method="post" action="<?= url('/account') ?>" novalidate><?= csrf_field() ?><input type="hidden" name="action" value="password">
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('lock-closed') ?></span><h2 class="sr-panel__title">Change password</h2></div>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'current', 'label' => 'Current password', 'type' => 'password', 'required' => true, 'autocomplete' => 'current-password']) ?>
      <?= field(['name' => 'new', 'label' => 'New password', 'type' => 'password', 'required' => true, 'autocomplete' => 'new-password', 'minlength' => 8, 'placeholder' => '8+ characters']) ?>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square">Change password</button></div>
    </div></form>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('shield-checkmark') ?></span><h2 class="sr-panel__title">Recent security events</h2></div>
    <?php if (!$events): ?><div class="sr-empty"><p>No events.</p></div><?php endif; ?>
    <?php foreach ($events as $ev): ?><div class="sr-row"><span class="sr-row__icon tone-<?= str_contains($ev['type'], 'fail') ? 'rose' : 'neutral' ?>"><?= icon('shield-checkmark') ?></span><div class="sr-grow"><p class="sr-row__title"><?= e(ucfirst(str_replace('_', ' ', $ev['type']))) ?></p><p class="sr-row__meta"><?= e($ev['ip']) ?> · <?= e(ago($ev['created_at'])) ?></p></div></div><?php endforeach; ?>
  </section>
</div>

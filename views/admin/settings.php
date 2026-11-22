<div class="sr-page" style="max-width:48rem;width:100%;margin:0 auto">
  <header class="sr-page-head tone-neutral"><span class="sr-glyph"><?= icon('settings') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Settings</h1></div></header>
  <form method="post" action="<?= url('/admin/settings') ?>" class="sr-stack" novalidate><?= csrf_field() ?>
    <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('color') ?></span><h2 class="sr-panel__title">Look</h2></div><div class="sr-panel__body sr-stack">
      <?= field(['name' => 'preset', 'label' => 'Colour preset', 'type' => 'select', 'options' => $presets, 'value' => old('preset', $theme['preset'] ?? 'ember')]) ?>
      <?= field(['name' => 'brand', 'label' => 'Brand colour (optional)', 'value' => old('brand', $theme['brand'] ?? ''), 'placeholder' => '#2563eb', 'hint' => 'Overrides the preset. Text contrast is adjusted automatically.']) ?>
      <?= field(['name' => 'dark', 'label' => 'Dark theme', 'type' => 'select', 'options' => $darks, 'value' => old('dark', $theme['dark']['theme'] ?? '')]) ?>
      <label class="sr-flex sr-hint"><input type="checkbox" class="sr-check" name="dark_accent" value="1"<?= !empty($theme['dark']['useAccent']) || empty($theme['dark']) ? ' checked' : '' ?>>Use the dark theme’s accent colour</label>
      <?= field(['name' => 'site_tagline', 'label' => 'Tagline on the sign-in page', 'value' => old('site_tagline', (string)setting('site.tagline', ''))]) ?>
      <?= field(['name' => 'site_pitch', 'label' => 'Short pitch', 'type' => 'textarea', 'rows' => 3, 'value' => old('site_pitch', (string)setting('site.pitch', ''))]) ?>
    </div></section>
    <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('people') ?></span><h2 class="sr-panel__title">Accounts</h2></div><div class="sr-panel__body sr-stack">
      <label class="sr-flex sr-hint"><input type="checkbox" class="sr-check" name="auth_registration" value="1"<?= setting('auth.registration', true) ? ' checked' : '' ?>>Anyone can create an account</label>
      <label class="sr-flex sr-hint"><input type="checkbox" class="sr-check" name="auth_approve_new" value="1"<?= setting('auth.approve_new', false) ? ' checked' : '' ?>>New accounts wait for staff approval</label>
      <?= field(['name' => 'auth_login_sub', 'label' => 'Sign-in subtitle', 'value' => old('auth_login_sub', (string)setting('auth.login_sub', ''))]) ?>
      <?= field(['name' => 'auth_register_sub', 'label' => 'Sign-up subtitle', 'value' => old('auth_register_sub', (string)setting('auth.register_sub', ''))]) ?>
    </div></section>
    <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('shield-checkmark') ?></span><h2 class="sr-panel__title">Security &amp; uploads</h2></div><div class="sr-panel__body sr-stack">
      <?= field(['name' => 'max_failed', 'label' => 'Failed sign-ins before lockout', 'type' => 'number', 'value' => old('max_failed', (string)setting('security.max_failed_logins', 5))]) ?>
      <?= field(['name' => 'lockout_min', 'label' => 'Lockout minutes', 'type' => 'number', 'value' => old('lockout_min', (string)setting('security.lockout_minutes', 15))]) ?>
      <?= field(['name' => 'upload_mb', 'label' => 'Largest upload (MB)', 'type' => 'number', 'value' => old('upload_mb', (string)round(setting('uploads.max_bytes', 8388608) / 1048576, 1))]) ?>
    </div></section>
    <div class="sr-form-foot"><span class="sr-hint">Saving asks for your password.</span><button class="sr-btn sr-btn--primary sr-btn--square">Save settings</button></div>
  </form>
</div>

<section class="sr-auth__card">
  <span class="sr-auth__badge" aria-hidden="true"><i class="ph ph-user-plus"></i></span>
  <h1 class="sr-auth__title">Create your account</h1>
  <p class="sr-auth__sub"><?= e(setting('auth.register_sub', 'It takes a minute.')) ?></p>
  <form class="sr-auth__form" method="post" action="<?= url('/register') ?>" novalidate>
    <?= csrf_field() ?>
    <?= field(['name' => 'name', 'label' => 'Full name', 'icon' => 'user', 'soft' => true, 'required' => true, 'autocomplete' => 'name', 'placeholder' => 'e.g. Amina Kariuki', 'minlength' => 2, 'msg' => 'Enter your full name.']) ?>
    <?= field(['name' => 'phone', 'label' => 'Phone number', 'type' => 'tel', 'icon' => 'phone', 'soft' => true, 'required' => true, 'autocomplete' => 'tel', 'inputmode' => 'tel', 'placeholder' => 'e.g. 0712 345 678', 'hint' => 'Used to sign in and for M-Pesa.', 'msg' => 'Enter a phone number like 0712 345 678.']) ?>
    <?= field(['name' => 'email', 'label' => 'Email (optional)', 'type' => 'email', 'icon' => 'envelope-simple', 'soft' => true, 'autocomplete' => 'email', 'placeholder' => 'name@example.com']) ?>
    <?php foreach ($extra as $f) echo field($f + ['soft' => true]); ?>
    <?= field(['name' => 'password', 'label' => 'Password', 'type' => 'password', 'soft' => true, 'required' => true, 'autocomplete' => 'new-password', 'placeholder' => '8+ characters', 'minlength' => 8, 'msg' => 'Use at least 8 characters.']) ?>
    <button type="submit" class="sr-btn sr-btn--primary sr-btn--xl sr-btn--block sr-btn--arrow">Create account <i class="ph ph-arrow-right"></i></button>
  </form>
  <div class="sr-divider">Already have an account?</div>
  <a href="<?= url('/login') ?>" class="sr-btn sr-btn--soft sr-btn--xl sr-btn--block"><i class="ph ph-lock-simple"></i>Sign in</a>
</section>

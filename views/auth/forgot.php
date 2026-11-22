<section class="sr-auth__card">
  <span class="sr-auth__badge" aria-hidden="true"><i class="ph ph-key"></i></span>
  <h1 class="sr-auth__title">Reset your password</h1>
  <p class="sr-auth__sub">We will send a reset link to your email or phone.</p>
  <form class="sr-auth__form" method="post" action="<?= url('/forgot-password') ?>" novalidate>
    <?= csrf_field() ?>
    <?= field(['name' => 'login', 'label' => 'Phone number or email', 'icon' => 'user', 'soft' => true, 'required' => true, 'autocomplete' => 'username', 'placeholder' => 'Phone or email']) ?>
    <button type="submit" class="sr-btn sr-btn--primary sr-btn--xl sr-btn--block">Send reset link</button>
  </form>
  <div class="sr-divider">Remembered it?</div>
  <a href="<?= url('/login') ?>" class="sr-btn sr-btn--soft sr-btn--xl sr-btn--block">Back to sign in</a>
</section>

<section class="sr-auth__card">
  <h1 class="sr-auth__title">Welcome back</h1>
  <p class="sr-auth__sub"><?= e(setting('auth.login_sub', 'Sign in to continue.')) ?></p>
  <form class="sr-auth__form" method="post" action="<?= url('/login') ?>" novalidate>
    <?= csrf_field() ?><input type="hidden" name="next" value="<?= e($next) ?>">
    <?= field(['name' => 'login', 'label' => 'Phone number or email', 'icon' => 'user', 'soft' => true, 'required' => true, 'autocomplete' => 'username', 'placeholder' => 'Phone or email']) ?>
    <?= field(['name' => 'password', 'label' => 'Password', 'type' => 'password', 'soft' => true, 'required' => true, 'autocomplete' => 'current-password', 'placeholder' => 'Your password',
        'label_link' => '<a href="' . url('/forgot-password') . '" class="sr-link">Forgot password? <i class="ph ph-arrow-right"></i></a>']) ?>
    <button type="submit" class="sr-btn sr-btn--primary sr-btn--xl sr-btn--block sr-btn--arrow">Sign in <i class="ph ph-arrow-right"></i></button>
  </form>
  <?php if (setting('auth.registration', true)): ?>
  <div class="sr-divider">New here?</div>
  <a href="<?= url('/register') ?>" class="sr-btn sr-btn--soft sr-btn--xl sr-btn--block"><i class="ph ph-user-plus"></i>Create an account</a>
  <?php endif; ?>
</section>

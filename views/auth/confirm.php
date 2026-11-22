<section class="sr-auth__card">
  <span class="sr-auth__badge" aria-hidden="true"><i class="ph ph-shield-check"></i></span>
  <h1 class="sr-auth__title">Confirm it’s you</h1>
  <p class="sr-auth__sub">This action is protected. Enter your password to continue.</p>
  <form class="sr-auth__form" method="post" action="<?= url('/confirm-password') ?>" novalidate>
    <?= csrf_field() ?><input type="hidden" name="next" value="<?= e($next) ?>">
    <?= field(['name' => 'password', 'label' => 'Password', 'type' => 'password', 'soft' => true, 'required' => true, 'autocomplete' => 'current-password', 'placeholder' => 'Your password']) ?>
    <button type="submit" class="sr-btn sr-btn--primary sr-btn--xl sr-btn--block">Continue</button>
  </form>
</section>

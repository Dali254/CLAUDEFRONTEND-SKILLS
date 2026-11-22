<section class="sr-auth__card">
  <h1 class="sr-auth__title">Choose a new password</h1>
  <form class="sr-auth__form" method="post" action="<?= url('/reset-password/' . $token) ?>" novalidate>
    <?= csrf_field() ?>
    <?= field(['name' => 'password', 'label' => 'New password', 'type' => 'password', 'soft' => true, 'required' => true, 'autocomplete' => 'new-password', 'placeholder' => '8+ characters', 'minlength' => 8]) ?>
    <button type="submit" class="sr-btn sr-btn--primary sr-btn--xl sr-btn--block">Save password</button>
  </form>
</section>

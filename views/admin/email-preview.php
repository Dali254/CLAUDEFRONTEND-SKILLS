<div class="sr-page">
  <div class="sr-flex" style="gap:.5rem;flex-wrap:wrap">
    <a class="sr-btn sr-btn--sm <?= $phone ? 'sr-btn--secondary' : 'sr-btn--primary' ?>" href="<?= url('/admin/emails/preview/' . $type) ?>"><i class="ph ph-desktop"></i>Desktop</a>
    <a class="sr-btn sr-btn--sm <?= $phone ? 'sr-btn--primary' : 'sr-btn--secondary' ?>" href="<?= url('/admin/emails/preview/' . $type, ['device' => 'phone']) ?>"><i class="ph ph-device-mobile"></i>Phone</a>
    <a class="sr-btn sr-btn--sm sr-btn--soft" href="<?= url('/admin/emails#t-' . $type) ?>">Edit message</a>
  </div>
  <iframe class="sr-email-frame<?= $phone ? ' is-phone' : '' ?>" title="Email preview" src="<?= url('/admin/emails/preview/' . $type, ['raw' => 1]) ?>"></iframe>
</div>

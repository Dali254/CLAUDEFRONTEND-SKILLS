<?php $presetOpts = array_map(fn($p) => $p['label'], SMTP_PRESETS); ?>
<div class="sr-page" style="max-width:52rem;width:100%;margin:0 auto">
  <header class="sr-page-head tone-rose"><span class="sr-glyph"><?= icon('mail') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Emails &amp; messages</h1></div>
    <p class="sr-page-head__text">Messages go out in the background. Every message can be edited and switched off per channel.</p></header>
  <form class="sr-panel" method="post" action="<?= url('/admin/emails') ?>" novalidate><?= csrf_field() ?><input type="hidden" name="action" value="smtp">
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('settings') ?></span><h2 class="sr-panel__title">Sending</h2></div>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'preset', 'label' => 'Email provider', 'type' => 'select', 'options' => $presetOpts, 'value' => $preset, 'hint' => 'Encryption is chosen automatically: port 465 uses SSL, 587 uses STARTTLS.']) ?>
      <?= field(['name' => 'host', 'label' => 'SMTP server', 'value' => $m['host'], 'placeholder' => 'Filled from the provider']) ?>
      <?= field(['name' => 'port', 'label' => 'Port', 'type' => 'number', 'value' => (string)$m['port']]) ?>
      <?= field(['name' => 'user', 'label' => 'Username', 'value' => $m['user'], 'autocomplete' => 'off']) ?>
      <?= field(['name' => 'pass', 'label' => 'Password', 'type' => 'password', 'autocomplete' => 'new-password', 'placeholder' => secret_is_set('mail.pass') ? 'Saved — leave empty to keep' : 'App password', 'hint' => 'Stored encrypted.']) ?>
      <?= field(['name' => 'from', 'label' => 'From address', 'type' => 'email', 'value' => $m['from'], 'placeholder' => 'hello@yourdomain.com']) ?>
      <?= field(['name' => 'from_name', 'label' => 'From name', 'value' => $m['from_name']]) ?>
      <fieldset class="sr-field" style="border:0;padding:0;margin:0"><legend class="sr-label">Channels</legend><div class="sr-pills">
        <?php foreach (['email' => 'Email', 'sms' => 'SMS', 'whatsapp' => 'WhatsApp', 'push' => 'Push'] as $ch => $lbl): ?><label class="sr-pill"><input type="checkbox" name="ch_<?= $ch ?>" value="1"<?= setting("notify.channel.$ch", $ch === 'email') ? ' checked' : '' ?>><span><?= $lbl ?></span></label><?php endforeach; ?></div></fieldset>
      <label class="sr-flex sr-hint"><input type="checkbox" class="sr-check" name="enabled" value="1"<?= $m['enabled'] ? ' checked' : '' ?>>Send emails (switch on after the test works)</label>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square">Save sending settings</button></div>
    </div></form>
  <form class="sr-callout tone-sky" method="post" action="<?= url('/admin/emails') ?>"><?= csrf_field() ?><input type="hidden" name="action" value="test"><span class="sr-ic"><?= icon('mail') ?></span>
    <p class="sr-callout__t">Send a test email</p><p class="sr-callout__s">To <?= e((string)user()['email'] ?: 'your account email (add one first)') ?>. Errors are shown in plain words.</p><button class="sr-btn sr-btn--secondary sr-btn--sm sr-callout__a">Send test</button></form>
  <?php foreach ($types as $type => $def): $tp = template_for($type); ?>
  <form class="sr-panel" id="t-<?= e($type) ?>" method="post" action="<?= url('/admin/emails') ?>" novalidate><?= csrf_field() ?><input type="hidden" name="action" value="template"><input type="hidden" name="type" value="<?= e($type) ?>">
    <div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('mail') ?></span><div class="sr-grow"><h2 class="sr-panel__title"><?= e(ucwords(str_replace('_', ' ', $type))) ?></h2><p class="sr-hint">Placeholders: {{name}} {{app}}<?= !empty($def['vars']) ? ' ' . e($def['vars']) : '' ?></p></div>
      <a class="sr-pill-link" href="<?= url('/admin/emails/preview/' . $type) ?>" target="_blank" rel="noopener">Preview<i class="ph ph-arrow-square-out"></i></a></div>
    <div class="sr-panel__body sr-stack">
      <?= field(['name' => 'title', 'label' => 'Subject / title', 'value' => $tp['title'], 'id' => "tt-$type"]) ?>
      <?= field(['name' => 'body', 'label' => 'Message', 'type' => 'textarea', 'rows' => 4, 'value' => $tp['body'], 'id' => "tb-$type"]) ?>
      <?= field(['name' => 'cta', 'label' => 'Button text', 'value' => $tp['cta'], 'id' => "tc-$type"]) ?>
      <?= field(['name' => 'url', 'label' => 'Button link', 'value' => $tp['url'], 'id' => "tu-$type"]) ?>
      <div class="sr-pills"><?php foreach (['in_app' => 'In-app', 'email' => 'Email', 'sms' => 'SMS', 'whatsapp' => 'WhatsApp', 'push' => 'Push'] as $ch => $lbl): ?><label class="sr-pill"><input type="checkbox" name="channels[]" value="<?= $ch ?>"<?= in_array($ch, $tp['channels_off'], true) ? '' : ' checked' ?>><span><?= $lbl ?></span></label><?php endforeach; ?></div>
      <div class="sr-form-foot"><button class="sr-btn sr-btn--primary sr-btn--square sr-btn--sm">Save message</button></div>
    </div></form>
  <?php endforeach; ?>
  <section class="sr-panel"><div class="sr-panel__head"><span class="sr-panel__icon"><?= icon('history') ?></span><h2 class="sr-panel__title">Recently sent</h2></div>
    <?php foreach ($outbox as $o): ?><div class="sr-row"><span class="sr-row__icon tone-<?= $o['status'] === 'sent' ? 'success' : ($o['status'] === 'failed' ? 'rose' : 'amber') ?>"><?= icon('mail') ?></span>
      <div class="sr-grow"><p class="sr-row__title"><?= e($o['subject']) ?></p><p class="sr-row__meta"><?= e($o['channel']) ?> · <?= e($o['to_addr']) ?> · <?= e($o['status']) ?><?= $o['error'] ? ' · ' . e($o['error']) : '' ?></p></div></div><?php endforeach; ?>
    <?php if (!$outbox): ?><div class="sr-empty"><p>Nothing sent yet.</p></div><?php endif; ?></section>
</div>

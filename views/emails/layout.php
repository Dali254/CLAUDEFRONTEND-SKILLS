<?php /* Responsive email: 600px table layout, brand header, ONE call-to-action button. Inline styles only (email clients). */
$t = (array)setting('theme', []); $brand = preg_match('/^#[0-9a-f]{6}$/i', (string)($t['brand'] ?? '')) ? $t['brand'] : '#c2410c'; $app = e(config('app_name')); ?>
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title><?= e($title) ?></title>
<style>@media (max-width:620px){.wrap{width:100%!important}.pad{padding:22px 18px!important}.btn a{display:block!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f1ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
<span style="display:none;max-height:0;overflow:hidden;opacity:0"><?= e(mb_substr(strip_tags($body), 0, 110)) ?></span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ee"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ebe5df">
    <tr><td style="background:<?= e($brand) ?>;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.02em"><?= $app ?></td></tr>
    <tr><td class="pad" style="padding:30px 28px 10px">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1c1917"><?= e($title) ?></h1>
      <?php if ($name): ?><p style="margin:0 0 10px;font-size:15px;line-height:1.6">Hi <?= e(explode(' ', $name)[0]) ?>,</p><?php endif; ?>
      <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#3f3a36"><?= nl2br(e($body)) ?></p>
      <?php if ($cta && $cta_url): ?>
      <table role="presentation" cellpadding="0" cellspacing="0" class="btn"><tr><td style="border-radius:999px;background:<?= e($brand) ?>">
        <a href="<?= e($cta_url) ?>" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px"><?= e($cta) ?></a></td></tr></table>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#78716c">Button not working? Paste this link into your browser:<br><a href="<?= e($cta_url) ?>" style="color:#78716c;word-break:break-all"><?= e($cta_url) ?></a></p>
      <?php endif; ?>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;font-size:12px;line-height:1.5;color:#78716c;border-top:1px solid #f0ebe6">You get this email because you have an account at <?= $app ?>.</td></tr>
  </table>
</td></tr></table></body></html>

<?php /* flash messages → kit toasts (read by assets/app.js from a JSON data island; no inline script needed) */
$f = take_flash(); if ($f): ?><script type="application/json" id="sr-flash" nonce="<?= e(nonce()) ?>"><?= json_encode($f, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script><?php endif;

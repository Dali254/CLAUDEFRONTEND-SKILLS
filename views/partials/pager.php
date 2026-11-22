<?php if (($p['pages'] ?? 1) > 1): $q = $_GET; ?>
<nav class="sr-pager" aria-label="Pages"><span class="sr-pager__info">Page <?= (int)$p['page'] ?> of <?= (int)$p['pages'] ?> · <?= (int)$p['total'] ?> total</span>
  <span class="sr-pager__btns">
  <?php if ($p['page'] > 1): $q['page'] = $p['page'] - 1; ?><a class="sr-btn sr-btn--secondary sr-btn--sm" href="<?= e(url(request_path(), $q)) ?>" rel="prev"><i class="ph ph-caret-left"></i>Previous</a><?php endif; ?>
  <?php if ($p['page'] < $p['pages']): $q['page'] = $p['page'] + 1; ?><a class="sr-btn sr-btn--secondary sr-btn--sm" href="<?= e(url(request_path(), $q)) ?>" rel="next">Next<i class="ph ph-caret-right"></i></a><?php endif; ?>
  </span></nav>
<?php endif; ?>

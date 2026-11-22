<div class="sr-page">
  <header class="sr-page-head tone-sky"><span class="sr-glyph"><?= icon('people') ?></span><div><p class="sr-page-head__kicker">Admin</p><h1 class="sr-page-head__title">Users</h1></div><p class="sr-page-head__text"><?= (int)$p['total'] ?> users</p></header>
  <form class="sr-search" method="get" action="<?= url('/admin/users') ?>" role="search" data-sr-no-validate>
    <label class="sr-search__field"><i class="ph ph-magnifying-glass"></i><input type="search" name="q" value="<?= e($qstr) ?>" placeholder="Name, email or phone" aria-label="Search users"></label>
    <label class="sr-search__field"><i class="ph ph-user-gear"></i><select name="role" aria-label="Role"><option value="">Any role</option><?php foreach ($roles as $r): ?><option value="<?= (int)$r['id'] ?>"<?= $role === (int)$r['id'] ? ' selected' : '' ?>><?= e($r['name']) ?></option><?php endforeach; ?></select></label>
    <label class="sr-search__field"><i class="ph ph-funnel"></i><select name="status" aria-label="Status"><option value="">Any status</option><?php foreach (['active', 'pending', 'suspended'] as $s): ?><option<?= $status === $s ? ' selected' : '' ?>><?= $s ?></option><?php endforeach; ?></select></label>
    <button class="sr-btn sr-btn--primary sr-btn--square sr-search__go">Search</button>
  </form>
  <section class="sr-panel">
    <?php if (!$p['rows']): ?><div class="sr-empty"><span class="sr-ic sr-ic--lg tone-neutral"><?= icon('people') ?></span><p>No users match.</p></div><?php else: ?>
    <div class="sr-table-wrap"><table class="sr-table"><thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Last sign-in</th></tr></thead><tbody>
    <?php foreach ($p['rows'] as $r): ?><tr><td><a class="sr-cell__title" href="<?= url('/admin/users/' . $r['id']) ?>"><?= e($r['name']) ?></a><span class="sr-cell__meta"><?= e($r['phone'] ? '+' . $r['phone'] : (string)$r['email']) ?></span></td>
      <td data-label="Role"><?= e($r['role']) ?></td><td data-label="Status"><span class="sr-badge tone-<?= $r['status'] === 'active' ? 'success' : ($r['status'] === 'pending' ? 'amber' : 'danger') ?>"><?= e($r['status']) ?></span></td>
      <td data-label="Last sign-in"><?= e($r['last_login_at'] ? ago($r['last_login_at']) : 'never') ?></td></tr><?php endforeach; ?>
    </tbody></table></div><?php endif; ?>
    <?= partial('partials/pager', ['p' => $p]) ?>
  </section>
</div>

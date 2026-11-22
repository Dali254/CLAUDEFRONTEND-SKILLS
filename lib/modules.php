<?php
/* Modules live in app/modules/<name>/ with module.php (meta + menu + permissions), routes.php, migrations/, pages/, views/.
   All optional modules are OFF by default (R30); admins switch them on in Settings → Modules. Migrations always run,
   so switching a module on later never needs a manual database step. */
declare(strict_types=1);
function module_meta(): array {
    static $m = null; if ($m !== null) return $m;
    $m = [];
    foreach (glob(APP . '/modules/*/module.php') ?: [] as $f) { $name = basename(dirname($f)); $m[$name] = (require $f) + ['name' => $name, 'core' => false]; }
    uasort($m, fn($a, $b) => ($a['order'] ?? 50) <=> ($b['order'] ?? 50));
    return $m;
}
function module_on(string $name): bool { $meta = module_meta()[$name] ?? null; if (!$meta) return false; return !empty($meta['core']) || (bool)setting("module.$name", false); }
function load_module_routes(): void {
    foreach (module_meta() as $name => $meta) {
        if (!module_on($name)) continue;
        $f = APP . "/modules/$name/routes.php"; if (!is_file($f)) continue;
        $GLOBALS['_ROUTE_MODULE'] = $name; require $f; unset($GLOBALS['_ROUTE_MODULE']);
        if (is_file(APP . "/modules/$name/boot.php")) require APP . "/modules/$name/boot.php";
    }
}
/** menu items from core + enabled modules, filtered by permission: ['section','label','icon','path','perm','tone','members_only'] */
function menu(string $area = 'member'): array {
    $items = $GLOBALS['_MENU'][$area] ?? [];
    foreach (module_meta() as $name => $meta) if (module_on($name)) foreach ($meta['menu'][$area] ?? [] as $i) $items[] = $i;
    return array_values(array_filter($items, fn($i) => (empty($i['perm']) || can($i['perm'])) && (empty($i['members_only']) || !can('admin.access'))));   // members_only: hidden for staff
}
function all_permissions(): array {
    $p = $GLOBALS['_PERMS'];
    foreach (module_meta() as $meta) foreach ($meta['permissions'] ?? [] as $k => $v) $p[$k] = $v;
    return $p;
}

/* hooks: modules add behaviour without editing core pages. hook('user.registered', fn($userId) => …); fire('user.registered', $id) */
function hook(string $name, callable $fn): void { $GLOBALS['_HOOKS'][$name][] = $fn; }
function fire(string $name, mixed ...$args): array { $out = []; foreach ($GLOBALS['_HOOKS'][$name] ?? [] as $fn) $out[] = $fn(...$args); return $out; }
/** the one menu path that is "current": exact match, else the longest path that the URL starts with ('/admin' never wins over '/admin/jobs') */
function nav_active(array $paths): ?string {
    $here = request_path(); $best = null;
    foreach ($paths as $p) {
        if ($p === $here) return $p;
        if ($p !== '/' && str_starts_with($here, rtrim($p, '/') . '/') && strlen($p) > strlen((string)$best)) $best = $p;
    }
    return $best;
}

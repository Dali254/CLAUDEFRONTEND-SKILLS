<?php
/* Router: clean regex routes. Every route declares access (R23): 'public' | 'guest' | 'member' | 'perm:<name>'.
   route('GET', '/jobs/{id:\d+}', 'jobs/show', 'member');   handler = page file app/pages/jobs/show.php, a module page "mod:page", or a callable.
   Options: ['csrf' => false] only for signed webhooks; ['reauth' => true] for dangerous actions (R28);
   ['limit' => [max, seconds]] rate-limits POSTs per IP (add 'limit_get' => true to count GETs too, e.g. polled JSON). */
declare(strict_types=1);

$GLOBALS['_ROUTES'] = [];
function route(string|array $methods, string $pattern, string|callable $handler, string $access = 'member', array $opt = []): void {
    if (str_contains($pattern, '.php')) throw new LogicException('R20: route with .php: ' . $pattern);
    $rx = preg_replace_callback('~\{(\w+)(?::([^}]+))?\}~', fn($m) => '(?P<' . $m[1] . '>' . ($m[2] ?? '[^/]+') . ')', rtrim($pattern, '/') ?: '/');
    foreach ((array)$methods as $m) $GLOBALS['_ROUTES'][] = ['method' => strtoupper($m), 'pattern' => $pattern, 'rx' => '~^' . $rx . '$~', 'handler' => $handler, 'access' => $access, 'opt' => $opt, 'module' => $GLOBALS['_ROUTE_MODULE'] ?? null];
}
function dispatch(): void {
    $path = request_path(); $method = method() === 'HEAD' ? 'GET' : method();
    $allowed = [];
    foreach ($GLOBALS['_ROUTES'] as $r) {
        if (!preg_match($r['rx'], $path, $m)) continue;
        if ($r['method'] !== $method) { $allowed[] = $r['method']; continue; }
        $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
        $GLOBALS['_ROUTE'] = $r + ['params' => $params];
        check_access($r['access']);
        if ($method === 'POST' && ($r['opt']['csrf'] ?? true)) csrf_check();          // R22
        if (!empty($r['opt']['reauth'])) require_recent_auth();                       // R28
        if (!empty($r['opt']['limit']) && ($method !== 'GET' || !empty($r['opt']['limit_get']))) { [$n, $sec] = $r['opt']['limit']; rate_limit_or_fail($r['pattern'] . '|' . client_ip(), $n, $sec); }
        run_handler($r['handler'], $params, $r['module']);
        return;
    }
    if ($allowed) { header('Allow: ' . implode(', ', array_unique($allowed))); abort(405); }
    abort(404);
}
function check_access(string $access): void {
    if ($access === 'public') return;
    if ($access === 'guest') { if (user()) redirect('/dashboard'); return; }
    if (!user()) { if (wants_json()) json(['error' => 'Sign in required'], 401); redirect('/login?next=' . rawurlencode(request_path())); }
    if ($access === 'member') return;
    if (str_starts_with($access, 'perm:')) { if (!can(substr($access, 5))) abort(403); return; }
    throw new LogicException("Unknown access rule '$access'");
}
function run_handler(string|callable $h, array $params, ?string $module): void {
    if (is_callable($h) && !is_string($h)) { $h($params); return; }
    [$mod, $page] = str_contains($h, ':') ? explode(':', $h, 2) : [$module, $h];
    $file = $mod ? APP . "/modules/$mod/pages/$page.php" : APP . "/pages/$page.php";
    if (!preg_match('~^[a-z0-9_/-]+$~i', $page) || !is_file($file)) throw new RuntimeException("Page not found: $h");
    (static function (string $__file, array $params) { extract($params, EXTR_SKIP); require $__file; })($file, $params);
}
function param(string $k): ?string { return $GLOBALS['_ROUTE']['params'][$k] ?? null; }
function current_route(): ?array { return $GLOBALS['_ROUTE'] ?? null; }
function routes(): array { return $GLOBALS['_ROUTES']; }

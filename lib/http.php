<?php
/* Request/response helpers. URLs are always clean (R20): url('/jobs/12'), never "x.php". */
declare(strict_types=1);

function base_path(): string {
    static $b = null;
    if ($b !== null) return $b;
    $cfg = (string)(config('base_path') ?? '');
    if ($cfg !== '') return $b = rtrim($cfg, '/');
    $dir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/'));
    return $b = ($dir === '/' || $dir === '.') ? '' : rtrim($dir, '/');
}
function url(string $path = '/', array $query = []): string {
    if (preg_match('~^https?://~', $path)) return $path;
    if (str_contains($path, '.php')) throw new LogicException('R20: no .php in URLs: ' . $path);
    $u = base_path() . '/' . ltrim($path, '/');
    return $query ? $u . '?' . http_build_query($query) : $u;
}
function abs_url(string $path = '/', array $query = []): string {
    $scheme = is_https() ? 'https' : 'http';
    $host = config('host') ?: ($_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . $host . url($path, $query);
}
function asset(string $path): string {
    $f = ROOT . '/assets/' . ltrim($path, '/');
    return url('/assets/' . ltrim($path, '/')) . (is_file($f) ? '?v=' . filemtime($f) : '');
}
function request_path(): string {
    $p = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $b = base_path();
    if ($b !== '' && str_starts_with($p, $b)) $p = substr($p, strlen($b));
    $p = '/' . trim(rawurldecode($p), '/');
    return $p;
}
function method(): string { return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'); }
function is_post(): bool { return method() === 'POST'; }
function is_https(): bool { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' && trusted_proxy()); }
function trusted_proxy(): bool { return in_array($_SERVER['REMOTE_ADDR'] ?? '', (array)config('trusted_proxies'), true); }
function client_ip(): string {
    if (trusted_proxy() && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}
function wants_json(): bool { return str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') || ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'XMLHttpRequest'; }
function input(string $key, mixed $default = null): mixed { return $_POST[$key] ?? $_GET[$key] ?? $default; }
function str_in(string $key, int $max = 500): string { return mb_substr(trim((string)input($key, '')), 0, $max); }
function int_in(string $key, int $default = 0): int { $v = input($key); return is_numeric($v) ? (int)$v : $default; }
function e(mixed $s): string { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function redirect(string $path, int $code = 303): never {
    $to = preg_match('~^https?://~', $path) ? $path : url($path);
    if (str_contains(parse_url($to, PHP_URL_PATH) ?? '', '.php')) throw new LogicException('R20: redirect to a .php URL');
    header('Location: ' . $to, true, $code); exit;
}
/** only same-site relative targets (stops open redirects) */
function safe_next(?string $next, string $fallback = '/'): string {
    if (!$next || !str_starts_with($next, '/') || str_starts_with($next, '//') || str_contains($next, '\\')) return $fallback;
    $b = base_path();
    if ($b !== '' && str_starts_with($next, $b . '/')) $next = substr($next, strlen($b));
    return $next;
}
function json(mixed $data, int $code = 200): never {
    http_response_code($code); header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
function abort(int $code, string $message = ''): never {
    http_response_code($code);
    if (wants_json()) json(['error' => $message ?: status_text($code)], $code);
    echo render('errors/error', ['code' => $code, 'message' => $message ?: status_text($code)], user() ? 'layout/app' : 'layout/plain'); exit;
}
function status_text(int $c): string { return [400 => 'Bad request', 403 => 'You do not have access to this page', 404 => 'Page not found', 405 => 'Method not allowed', 419 => 'This form expired. Please try again.', 429 => 'Too many attempts. Please wait and try again.', 503 => 'We are doing maintenance. Back soon.'][$c] ?? 'Something went wrong'; }

function flash(string $type, string $title, string $text = ''): void { $_SESSION['_flash'][] = compact('type', 'title', 'text'); }
function take_flash(): array { $f = $_SESSION['_flash'] ?? []; unset($_SESSION['_flash']); return $f; }
/** remember submitted values + field errors for the next render */
function back_with(array $errors, string $path): never { $_SESSION['_old'] = $_POST; unset($_SESSION['_old']['_csrf'], $_SESSION['_old']['password']); $_SESSION['_errors'] = $errors; redirect($path); }
function old(string $k, string $default = ''): string { return (string)($GLOBALS['_OLD'][$k] ?? $default); }
function field_error(string $k): ?string { return $GLOBALS['_ERRORS'][$k] ?? null; }

/** run slow work after the response is sent (PHP-FPM / LiteSpeed); on other servers it runs before the connection closes */
function after_response(callable $fn): void { $GLOBALS['_AFTER'][] = $fn; }

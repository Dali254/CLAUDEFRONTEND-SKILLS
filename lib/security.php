<?php
/* Security (R22, R27, R28): CSP nonce + headers, CSRF, rate limits, lockout, security alerts, re-auth. */
declare(strict_types=1);

function nonce(): string { static $n = null; return $n ??= rtrim(strtr(base64_encode(random_bytes(18)), '+/', '-_'), '='); }
function send_security_headers(): void {
    $n = nonce();
    $csp = "default-src 'self'; script-src 'self' 'nonce-$n'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; "
         . "connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; manifest-src 'self'; worker-src 'self'";
    header('Content-Security-Policy: ' . $csp);
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
    header('Cross-Origin-Opener-Policy: same-origin');
    if (is_https()) header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    header_remove('X-Powered-By');
}
function start_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('sid');
    session_set_cookie_params(['lifetime' => 0, 'path' => base_path() ?: '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
    ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1');
    session_save_path(STORAGE . '/cache');
    session_start();
    if (empty($_SESSION['_born'])) $_SESSION['_born'] = time();
}
function csrf_token(): string { return $_SESSION['_csrf'] ??= bin2hex(random_bytes(32)); }
function csrf_field(): string { return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">'; }
function csrf_check(): void {
    $t = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($t) || !hash_equals(csrf_token(), $t)) {
        security_event('csrf_failed', 'CSRF token missing or wrong on ' . request_path());
        abort(419);
    }
}

/* ---- rate limits: fixed window in MySQL ---- */
function rate_limit(string $key, int $max, int $windowSec): bool {
    $k = substr(hash('sha256', $key), 0, 40); $now = time();
    q('INSERT INTO rate_limits (k, hits, window_start) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE
        hits = IF(window_start <= ?, 1, hits + 1), window_start = IF(window_start <= ?, VALUES(window_start), window_start)',
      [$k, $now, $now - $windowSec, $now - $windowSec]);
    return (int)val('SELECT hits FROM rate_limits WHERE k = ?', [$k]) <= $max;
}
function rate_limit_or_fail(string $key, int $max, int $windowSec): void {
    if (!rate_limit($key, $max, $windowSec)) { security_event('rate_limited', $key); header('Retry-After: ' . $windowSec); abort(429); }
}
/* ---- lockout: after N failed sign-ins the account locks for M minutes and admins are alerted ---- */
function register_failed_login(?array $u, string $login): void {
    security_event('login_failed', 'Failed sign-in for ' . $login, $u['id'] ?? null);
    if (!$u) return;
    $fails = (int)$u['failed_logins'] + 1;
    $max = (int)setting('security.max_failed_logins', 5);
    $lock = $fails >= $max ? gmdate('Y-m-d H:i:s', time() + 60 * (int)setting('security.lockout_minutes', 15)) : null;
    update_row('users', ['failed_logins' => $fails, 'locked_until' => $lock], ['id' => $u['id']]);
    if ($lock) security_alert('Account locked', "{$u['name']} ({$login}) was locked after $fails failed sign-ins from " . client_ip() . '.', (int)$u['id']);
}
function is_locked(array $u): bool { return $u['locked_until'] && strtotime($u['locked_until'] . ' UTC') > time(); }

function security_event(string $type, string $detail, ?int $userId = null): void {
    try { insert('security_events', ['type' => $type, 'detail' => mb_substr($detail, 0, 500), 'user_id' => $userId ?? (user()['id'] ?? null), 'ip' => client_ip(), 'ua' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255), 'created_at' => gmdate('Y-m-d H:i:s')]); } catch (Throwable) {}
}
/** an event that also notifies every user with security.alerts */
function security_alert(string $title, string $text, ?int $userId = null): void {
    security_event('alert', "$title: $text", $userId);
    foreach (users_with_permission('security.alerts') as $admin) notify((int)$admin['id'], 'security_alert', ['title' => $title, 'text' => $text], ['in_app', 'email']);
}

/* ---- re-auth for dangerous actions (R28) ---- */
function require_recent_auth(int $seconds = 600): void {
    if (($_SESSION['reauth_at'] ?? 0) >= time() - $seconds) return;
    if (wants_json()) json(['error' => 'Confirm your password first', 'reauth' => url('/confirm-password')], 401);
    if (is_post()) { flash('warning', 'Confirm your password', 'For your security, confirm your password and repeat the action.'); $ref = (string)($_SERVER['HTTP_REFERER'] ?? ''); redirect('/confirm-password?next=' . rawurlencode(safe_next($ref !== '' ? (string)parse_url($ref, PHP_URL_PATH) : '/dashboard', '/dashboard'))); }
    redirect('/confirm-password?next=' . rawurlencode(request_path()));
}

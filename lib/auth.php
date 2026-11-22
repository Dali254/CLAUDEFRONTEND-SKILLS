<?php
/* Auth, roles and permissions (R23). Roles hold a JSON list of permissions; '*' = everything.
   Sign-in-as keeps the original admin in the session and shows a return bar (R28: re-auth + audit). */
declare(strict_types=1);

function user(bool $fresh = false): ?array {
    static $cache = [];
    $id = (int)($_SESSION['uid'] ?? 0);
    if (!$id || !defined('DB_READY')) return null;
    if ($fresh || !array_key_exists($id, $cache)) {
        $u = one('SELECT u.*, r.name AS role_name, r.permissions FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.status = "active"', [$id]);
        if ($u) $u['perms'] = json_decode($u['permissions'] ?? '[]', true) ?: [];
        $cache[$id] = $u;
    }
    return $cache[$id];
}
function can(string $perm): bool {
    $u = user(); if (!$u) return false;
    return in_array('*', $u['perms'], true) || in_array($perm, $u['perms'], true) || in_array(explode('.', $perm)[0] . '.*', $u['perms'], true);
}
function require_perm(string $perm): void { if (!can($perm)) abort(403); }
/** R23: load a record by id only if the user owns it or holds $perm */
function owned_or_abort(string $table, int $id, string $ownerCol = 'user_id', string $perm = ''): array {
    $row = one('SELECT * FROM ' . ident($table) . ' WHERE id = ?', [$id]);
    if (!$row) abort(404);
    if ((int)$row[$ownerCol] !== (int)(user()['id'] ?? 0) && !($perm && can($perm))) { security_event('idor_blocked', "$table #$id"); abort(404); }
    return $row;
}
function users_with_permission(string $perm): array {
    $out = [];
    foreach (all('SELECT u.id, u.name, u.email, r.permissions FROM users u JOIN roles r ON r.id = u.role_id WHERE u.status = "active"') as $r) {
        $p = json_decode($r['permissions'] ?: '[]', true) ?: [];
        if (in_array('*', $p, true) || in_array($perm, $p, true) || in_array(explode('.', $perm)[0] . '.*', $p, true)) $out[] = $r;
    }
    return $out;
}
function find_login(string $login): ?array {
    $login = trim($login);
    $phone = normalize_phone($login);
    return one('SELECT * FROM users WHERE email = ? OR phone = ? OR username = ? LIMIT 1', [mb_strtolower($login), $phone ?: '-', mb_strtolower($login)]);
}
function normalize_phone(string $p, string $cc = '254'): ?string {
    $d = preg_replace('/\D+/', '', $p);
    if ($d === '') return null;
    if (str_starts_with($d, '0') && strlen($d) === 10) $d = $cc . substr($d, 1);
    if (strlen($d) === 9) $d = $cc . $d;
    return strlen($d) >= 10 && strlen($d) <= 15 ? $d : null;
}
function login_user(array $u): void {
    session_regenerate_id(true);
    $_SESSION['uid'] = (int)$u['id']; $_SESSION['reauth_at'] = time();
    update_row('users', ['failed_logins' => 0, 'locked_until' => null, 'last_login_at' => gmdate('Y-m-d H:i:s'), 'last_login_ip' => client_ip()], ['id' => $u['id']]);
    activity((int)$u['id'], 'Signed in');
}
function logout_user(): void {
    $_SESSION = []; if (ini_get('session.use_cookies')) { $p = session_get_cookie_params(); setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']); }
    session_destroy();
}
function hash_password(string $p): string { return password_hash($p, PASSWORD_DEFAULT); }

/* ---- sign in as another user (support) ---- */
function sign_in_as(int $targetId): void {
    $me = user(); $t = one('SELECT * FROM users WHERE id = ?', [$targetId]);
    if (!$me || !$t) abort(404);
    if (!can('users.impersonate')) abort(403);
    $tPerms = json_decode((string)val('SELECT permissions FROM roles WHERE id = ?', [$t['role_id']]) ?: '[]', true) ?: [];
    if (in_array('*', $tPerms, true) && !in_array('*', $me['perms'], true)) abort(403);     // only super admins can become super admins
    audit('user.sign_in_as', 'user', $targetId, ['as' => $t['name']]);
    $_SESSION['impersonator'] = (int)$me['id'];
    $_SESSION['uid'] = $targetId;
    session_regenerate_id(true);
}
function stop_sign_in_as(): void {
    $orig = (int)($_SESSION['impersonator'] ?? 0); if (!$orig) return;
    audit('user.sign_in_as_end', 'user', (int)$_SESSION['uid']);
    unset($_SESSION['impersonator']); $_SESSION['uid'] = $orig; session_regenerate_id(true);
}
function impersonator(): ?array { $id = (int)($_SESSION['impersonator'] ?? 0); return $id ? one('SELECT id, name FROM users WHERE id = ?', [$id]) : null; }

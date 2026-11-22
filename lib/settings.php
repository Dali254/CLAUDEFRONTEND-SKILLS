<?php
/* Settings: key/value in MySQL, cached per request. Secrets (API keys, SMTP password) are encrypted with the
   app key (libsodium secretbox), so a database dump alone does not leak them (R26). */
declare(strict_types=1);

function app_key(): string {
    $k = (string)config('app_key');
    $raw = str_starts_with($k, 'base64:') ? base64_decode(substr($k, 7), true) : false;
    if (!$raw || strlen($raw) !== SODIUM_CRYPTO_SECRETBOX_KEYBYTES) throw new RuntimeException('app_key in app/config.php is missing or invalid');
    return $raw;
}
function encrypt_str(string $plain): string { $n = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES); return 'enc:' . base64_encode($n . sodium_crypto_secretbox($plain, $n, app_key())); }
function decrypt_str(string $enc): string {
    if (!str_starts_with($enc, 'enc:')) return $enc;
    $raw = base64_decode(substr($enc, 4), true) ?: '';
    $p = sodium_crypto_secretbox_open(substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES), app_key());
    return $p === false ? '' : $p;
}
function settings_all(bool $reload = false): array {
    static $cache = null;
    if ($cache === null || $reload) { $cache = []; foreach (all('SELECT k, v FROM settings') as $r) $cache[$r['k']] = $r['v']; }
    return $cache;
}
function setting(string $key, mixed $default = null): mixed {
    $all = settings_all();
    if (!array_key_exists($key, $all)) return $default;
    $v = decrypt_str((string)$all[$key]);
    $j = json_decode($v, true);
    return json_last_error() === JSON_ERROR_NONE ? $j : $v;
}
function set_setting(string $key, mixed $value, bool $secret = false): void {
    $v = is_string($value) ? $value : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($secret && $v !== '') $v = encrypt_str($v);
    q('INSERT INTO settings (k, v, updated_at) VALUES (?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE v = VALUES(v), updated_at = VALUES(updated_at)', [$key, $v]);
    settings_all(true);
}
function secret_is_set(string $key): bool { return (string)(settings_all()[$key] ?? '') !== ''; }

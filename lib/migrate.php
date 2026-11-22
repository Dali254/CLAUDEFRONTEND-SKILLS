<?php
/* Auto migrations (R25). Files: app/migrations/NNNN_name.php and app/modules/<m>/migrations/NNNN_name.php.
   Each returns an array of SQL strings or a function(PDO $db): void. Never edit a migration that has shipped: add a new one.
   Fast path: a signature of the file list is compared with storage/cache/migrations.sig on every request (no DB query).
   On change: GET_LOCK so only one request migrates, run what is pending, write the new signature. */
declare(strict_types=1);

function migration_files(): array {
    $files = glob(APP . '/migrations/*.php') ?: [];
    foreach (glob(APP . '/modules/*/migrations/*.php') ?: [] as $f) $files[] = $f;
    $out = [];
    foreach ($files as $f) $out[migration_name($f)] = $f;
    ksort($out, SORT_NATURAL);
    if ($only = getenv('SR_MIGRATE_ONLY')) $out = array_filter($out, fn($n) => in_array(strstr($n, ':', true), explode(',', $only), true), ARRAY_FILTER_USE_KEY);   // tests: build an "old" database
    return $out;
}
function migration_name(string $file): string {
    $mod = preg_match('~/modules/([^/]+)/migrations/~', $file, $m) ? $m[1] . ':' : 'core:';
    return $mod . basename($file, '.php');
}
function migration_signature(array $files): string {
    $s = '';
    foreach ($files as $name => $f) $s .= $name . '|' . filesize($f) . '|' . filemtime($f) . "\n";
    return sha1($s);
}
function migrate_if_needed(bool $force = false): array {
    $files = migration_files();
    $sig = migration_signature($files);
    $sigFile = STORAGE . '/cache/migrations-' . preg_replace('/\W/', '', (string)(config('db')['name'] ?? 'db')) . '.sig';   // one per database
    if (!$force && is_file($sigFile) && trim((string)file_get_contents($sigFile)) === $sig) return [];
    $pdo = db();
    if ((int)val('SELECT GET_LOCK(?, 15)', ['migrate:' . config('db')['name']]) !== 1) throw new RuntimeException('Could not get the migration lock (another request is migrating). Try again.');
    $ran = [];
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS migrations (name VARCHAR(190) PRIMARY KEY, ran_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        $done = array_flip(array_column(all('SELECT name FROM migrations'), 'name'));
        foreach ($files as $name => $file) {
            if (isset($done[$name])) continue;
            $m = (static fn() => require $file)();
            try {
                if (is_callable($m)) $m($pdo);
                else foreach ((array)$m as $sql) $pdo->exec($sql);
            } catch (Throwable $e) {
                throw new RuntimeException("Migration $name failed: " . $e->getMessage(), 0, $e);
            }
            insert('migrations', ['name' => $name, 'ran_at' => gmdate('Y-m-d H:i:s')]);
            $ran[] = $name;
        }
        @file_put_contents($sigFile, $sig, LOCK_EX);
    } finally {
        val('SELECT RELEASE_LOCK(?)', ['migrate:' . config('db')['name']]);
    }
    if ($ran) app_log('info', 'migrations applied: ' . implode(', ', $ran));
    return $ran;
}
/* helpers for idempotent migrations on live databases */
function column_exists(string $table, string $col): bool {
    return (bool)val('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [$table, $col]);
}
function index_exists(string $table, string $idx): bool {
    return (bool)val('SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?', [$table, $idx]);
}

<?php
/* Database backup without mysqldump (works on any cPanel host): gzip SQL in storage/backups (deny-all), keeps the newest 14. */
declare(strict_types=1);
function backup_database(): string {
    $dir = STORAGE . '/backups'; if (!is_dir($dir)) mkdir($dir, 0750, true);
    $name = 'db-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.sql.gz';
    $gz = gzopen("$dir/$name", 'wb6'); $pdo = db();
    gzwrite($gz, "-- backup " . gmdate('c') . "\nSET FOREIGN_KEY_CHECKS=0;\n");
    foreach (array_column(all('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"'), 'Tables_in_' . config('db')['name']) as $t) {
        $create = one('SHOW CREATE TABLE ' . ident($t))['Create Table'];
        gzwrite($gz, "\nDROP TABLE IF EXISTS `$t`;\n$create;\n");
        $st = $pdo->query('SELECT * FROM ' . ident($t), PDO::FETCH_NUM);
        while ($row = $st->fetch()) gzwrite($gz, "INSERT INTO `$t` VALUES (" . implode(',', array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote((string)$v), $row)) . ");\n");
    }
    gzwrite($gz, "SET FOREIGN_KEY_CHECKS=1;\n"); gzclose($gz);
    $all = glob("$dir/db-*.sql.gz") ?: []; rsort($all); foreach (array_slice($all, 14) as $old) @unlink($old);
    set_setting('backup.last_at', time());
    return $name;
}

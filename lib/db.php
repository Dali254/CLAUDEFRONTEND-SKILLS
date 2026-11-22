<?php
/* PDO helpers (R21: every query uses bound parameters; identifiers are validated, never taken raw from input) */
declare(strict_types=1);

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config('db');
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], (int)($c['port'] ?? 3306), $c['name']);
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone = '+00:00', sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'",
    ]);
    return $pdo;
}

function ident(string $name): string {
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/', $name)) throw new InvalidArgumentException("Bad identifier: $name");
    return '`' . $name . '`';
}

function q(string $sql, array $params = []): PDOStatement {
    $st = db()->prepare($sql);
    foreach (array_values(array_is_list($params) ? $params : []) as $i => $v) $st->bindValue($i + 1, $v, pdo_type($v));
    if (!array_is_list($params)) foreach ($params as $k => $v) $st->bindValue(':' . ltrim((string)$k, ':'), $v, pdo_type($v));
    $st->execute();
    return $st;
}
function pdo_type(mixed $v): int { return is_int($v) ? PDO::PARAM_INT : (is_bool($v) ? PDO::PARAM_BOOL : ($v === null ? PDO::PARAM_NULL : PDO::PARAM_STR)); }
function one(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r === false ? null : $r; }
function all(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }
function val(string $sql, array $p = []): mixed { $r = q($sql, $p)->fetchColumn(); return $r === false ? null : $r; }

function insert(string $table, array $row): int {
    $cols = array_map('ident', array_keys($row));
    q('INSERT INTO ' . ident($table) . ' (' . implode(',', $cols) . ') VALUES (' . in_marks($row) . ')', array_values($row));
    return (int)db()->lastInsertId();
}
function update_row(string $table, array $row, array $where): int {
    if (!$row || !$where) throw new InvalidArgumentException('update_row needs data and a where clause');
    $set = implode(',', array_map(fn($k) => ident($k) . '=?', array_keys($row)));
    $w = implode(' AND ', array_map(fn($k) => ident($k) . '=?', array_keys($where)));
    return q('UPDATE ' . ident($table) . " SET $set WHERE $w", [...array_values($row), ...array_values($where)])->rowCount();
}
function delete_row(string $table, array $where): int {
    $w = implode(' AND ', array_map(fn($k) => ident($k) . '=?', array_keys($where)));
    return q('DELETE FROM ' . ident($table) . " WHERE $w", array_values($where))->rowCount();
}
/** "?,?,?" for IN (...) lists */
function in_marks(array $values): string { return $values ? implode(',', array_fill(0, count($values), '?')) : 'NULL'; }

/** paginate("SELECT … FROM jobs WHERE status=?", ['open'], 20) → ['rows','total','page','pages','per'] */
function paginate(string $sql, array $params = [], int $per = 20, ?int $page = null): array {
    $page = max(1, $page ?? (int)($_GET['page'] ?? 1));
    $total = (int)val('SELECT COUNT(*) FROM (' . $sql . ') t', $params);
    $pages = max(1, (int)ceil($total / $per));
    $page = min($page, $pages);
    $rows = all($sql . ' LIMIT ' . (int)$per . ' OFFSET ' . (int)(($page - 1) * $per), $params);
    return compact('rows', 'total', 'page', 'pages', 'per');
}
function tx(callable $fn): mixed {
    $pdo = db(); $pdo->beginTransaction();
    try { $r = $fn($pdo); $pdo->commit(); return $r; } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
}

<?php
/* Audit log = who changed what (admins read it). Activity log = what a member did (members see their own). */
declare(strict_types=1);
function audit(string $action, string $targetType = '', int|string|null $targetId = null, array $meta = []): void {
    $u = user();
    insert('audit_log', ['user_id' => $u['id'] ?? null, 'impersonator_id' => $_SESSION['impersonator'] ?? null, 'action' => $action, 'target_type' => $targetType, 'target_id' => $targetId === null ? null : (string)$targetId,
        'meta' => $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null, 'ip' => client_ip(), 'created_at' => gmdate('Y-m-d H:i:s')]);
}
function activity(int $userId, string $what, array $meta = []): void {
    insert('activity_log', ['user_id' => $userId, 'what' => mb_substr($what, 0, 255), 'meta' => $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null, 'ip' => client_ip(), 'created_at' => gmdate('Y-m-d H:i:s')]);
}
function app_log(string $level, string $msg): void {
    @file_put_contents(STORAGE . '/logs/app-' . gmdate('Y-m') . '.log', '[' . gmdate('c') . "] $level: $msg\n", FILE_APPEND | LOCK_EX);
}

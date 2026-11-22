<?php
/* Core schema. Shipped migrations are never edited (R25); add 0002_… for changes. */
return function (PDO $db): void {
    $T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
    $db->exec("CREATE TABLE IF NOT EXISTS roles (id INT AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL,
        permissions JSON NOT NULL, is_staff TINYINT(1) NOT NULL DEFAULT 0, created_at DATETIME NOT NULL) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(190) NULL UNIQUE, phone VARCHAR(20) NULL UNIQUE,
        username VARCHAR(60) NULL UNIQUE, password VARCHAR(255) NOT NULL, role_id INT NOT NULL, status ENUM('active','pending','suspended') NOT NULL DEFAULT 'active',
        email_verified_at DATETIME NULL, failed_logins INT NOT NULL DEFAULT 0, locked_until DATETIME NULL, last_login_at DATETIME NULL, last_login_ip VARCHAR(45) NULL,
        country_id INT NULL, province_id INT NULL, meta JSON NULL, created_at DATETIME NOT NULL, updated_at DATETIME NULL, KEY (role_id), KEY (status)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS settings (k VARCHAR(120) PRIMARY KEY, v MEDIUMTEXT NULL, updated_at DATETIME NULL) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS rate_limits (k CHAR(40) PRIMARY KEY, hits INT NOT NULL, window_start INT NOT NULL) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS security_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(40) NOT NULL, detail VARCHAR(500) NULL, user_id INT NULL,
        ip VARCHAR(45) NULL, ua VARCHAR(255) NULL, created_at DATETIME NOT NULL, KEY (type, created_at), KEY (user_id)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS audit_log (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NULL, impersonator_id INT NULL, action VARCHAR(80) NOT NULL,
        target_type VARCHAR(40) NULL, target_id VARCHAR(40) NULL, meta JSON NULL, ip VARCHAR(45) NULL, created_at DATETIME NOT NULL, KEY (action), KEY (target_type, target_id), KEY (created_at)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS activity_log (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, what VARCHAR(255) NOT NULL, meta JSON NULL,
        ip VARCHAR(45) NULL, created_at DATETIME NOT NULL, KEY (user_id, created_at)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS uploads (id INT AUTO_INCREMENT PRIMARY KEY, owner_id INT NULL, purpose VARCHAR(40) NOT NULL, path VARCHAR(255) NOT NULL, mime VARCHAR(80) NOT NULL,
        size INT NOT NULL, original_name VARCHAR(190) NULL, sha256 CHAR(64) NULL, created_at DATETIME NOT NULL, KEY (owner_id), KEY (purpose)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, type VARCHAR(60) NOT NULL, title VARCHAR(255) NOT NULL,
        body TEXT NULL, url VARCHAR(255) NULL, read_at DATETIME NULL, created_at DATETIME NOT NULL, KEY (user_id, read_at)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS outbox (id BIGINT AUTO_INCREMENT PRIMARY KEY, channel VARCHAR(20) NOT NULL, to_addr VARCHAR(190) NOT NULL, subject VARCHAR(255) NULL,
        body TEXT NULL, payload JSON NULL, status ENUM('queued','sending','sent','failed') NOT NULL DEFAULT 'queued', attempts INT NOT NULL DEFAULT 0, error VARCHAR(500) NULL,
        next_try_at DATETIME NULL, created_at DATETIME NOT NULL, sent_at DATETIME NULL, KEY (status, next_try_at)) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS notify_templates (type VARCHAR(60) PRIMARY KEY, title VARCHAR(255) NULL, body TEXT NULL, cta VARCHAR(80) NULL, url VARCHAR(255) NULL,
        channels_off JSON NULL, updated_at DATETIME NULL) $T");
    $db->exec("CREATE TABLE IF NOT EXISTS password_resets (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL, used_at DATETIME NULL, created_at DATETIME NOT NULL, KEY (user_id)) $T");
    $now = gmdate('Y-m-d H:i:s');
    $roles = [
        ['super-admin', 'Super admin', ['*'], 1],
        ['staff', 'Staff', ['admin.access', 'users.view', 'uploads.view_all', 'security.alerts'], 1],
        ['member', 'Member', [], 0],
    ];
    $st = $db->prepare('INSERT IGNORE INTO roles (slug, name, permissions, is_staff, created_at) VALUES (?, ?, ?, ?, ?)');
    foreach ($roles as [$slug, $name, $perms, $staff]) $st->execute([$slug, $name, json_encode($perms), $staff, $now]);
};

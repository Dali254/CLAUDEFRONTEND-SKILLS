<?php
/* Notifications: one call, many channels. notify($userId, 'stage_approved', ['stage' => 'Work Permit Processing'], ['in_app','email','sms'])
   Templates are editable in Admin → Emails & messages; defaults live in code (notify_templates()). Each type can be switched off per channel.
   Email/SMS/WhatsApp/push go to the outbox and are sent in the background (after the response, or by cron). */
declare(strict_types=1);

$GLOBALS['_NOTIFY_TEMPLATES'] = [
    'welcome'        => ['title' => 'Welcome to {{app}}', 'body' => 'Hi {{name}}, your account is ready.', 'cta' => 'Open my account', 'url' => '/dashboard'],
    'security_alert' => ['title' => 'Security alert: {{title}}', 'body' => '{{text}}', 'cta' => 'Review security events', 'url' => '/admin/security', 'admin' => true],
    'password_reset' => ['title' => 'Reset your password', 'body' => 'Use this link within 30 minutes to choose a new password. If you did not ask for it, ignore this email.', 'cta' => 'Choose a new password', 'url' => '{{link}}'],
];
function notify_templates(): array {
    $t = $GLOBALS['_NOTIFY_TEMPLATES'];
    foreach (module_meta() as $name => $m) if (module_on($name)) $t += $m['templates'] ?? [];   // enabled modules add their own editable templates
    return $t;
}
function fill(string $s, array $vars): string { return preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', fn($m) => (string)($vars[$m[1]] ?? ''), $s); }
function template_for(string $type): array {
    $def = notify_templates()[$type] ?? ['title' => $type, 'body' => '', 'cta' => '', 'url' => '/dashboard'];
    $row = one('SELECT title, body, cta, url, channels_off FROM notify_templates WHERE type = ?', [$type]);
    if ($row) foreach (['title', 'body', 'cta', 'url'] as $k) if ((string)$row[$k] !== '') $def[$k] = $row[$k];
    $def['channels_off'] = $row ? (json_decode((string)$row['channels_off'], true) ?: []) : [];
    return $def;
}
function notify(int $userId, string $type, array $vars = [], array $channels = ['in_app', 'email']): void {
    $u = one('SELECT id, name, email, phone FROM users WHERE id = ?', [$userId]); if (!$u) return;
    $t = template_for($type);
    $vars += ['name' => $u['name'], 'app' => config('app_name')];
    $title = fill($t['title'], $vars); $body = fill($t['body'], $vars); $link = fill((string)$t['url'], $vars);
    foreach ($channels as $ch) {
        if (in_array($ch, $t['channels_off'], true) || !setting("notify.channel.$ch", $ch === 'in_app' || $ch === 'email')) continue;
        if ($ch === 'in_app') { insert('notifications', ['user_id' => $userId, 'type' => $type, 'title' => $title, 'body' => $body, 'url' => $link, 'created_at' => gmdate('Y-m-d H:i:s')]); continue; }
        $to = match ($ch) { 'email' => $u['email'], 'sms', 'whatsapp' => $u['phone'], 'push' => (string)$userId, default => null };
        if (!$to) continue;
        insert('outbox', ['channel' => $ch, 'to_addr' => $to, 'subject' => $title, 'body' => $body,
            'payload' => json_encode(['cta' => fill((string)$t['cta'], $vars), 'url' => $link, 'name' => $u['name'], 'type' => $type], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'status' => 'queued', 'attempts' => 0, 'created_at' => gmdate('Y-m-d H:i:s')]);
    }
    $GLOBALS['_OUTBOX_DIRTY'] = true;
}
/** send queued messages (called after the response is flushed, and by cron) */
function process_outbox(int $limit = 20): array {
    $done = ['sent' => 0, 'failed' => 0];
    $rows = all('SELECT * FROM outbox WHERE status = "queued" AND attempts < 5 AND (next_try_at IS NULL OR next_try_at <= UTC_TIMESTAMP()) ORDER BY id LIMIT ' . (int)$limit);
    foreach ($rows as $r) {
        if (!q('UPDATE outbox SET status = "sending" WHERE id = ? AND status = "queued"', [$r['id']])->rowCount()) continue;   // claim it
        try {
            $p = json_decode((string)$r['payload'], true) ?: [];
            match ($r['channel']) {
                'email' => send_mail($r['to_addr'], $r['subject'], email_html($r['subject'], $r['body'], $p['cta'] ?? '', isset($p['url']) && $p['url'] ? abs_url($p['url']) : '', $p['name'] ?? ''), $r['body']),
                'sms' => send_sms($r['to_addr'], $r['subject'] . ': ' . $r['body']),
                'whatsapp' => send_whatsapp($r['to_addr'], $r['subject'] . "\n" . $r['body']),
                'push' => function_exists('send_push') ? send_push((int)$r['to_addr'], $r['subject'], $r['body'], $p['url'] ?? '/') : null,
                default => null,
            };
            update_row('outbox', ['status' => 'sent', 'sent_at' => gmdate('Y-m-d H:i:s'), 'error' => null], ['id' => $r['id']]); $done['sent']++;
        } catch (Throwable $e) {
            $n = (int)$r['attempts'] + 1;
            update_row('outbox', ['status' => $n >= 5 ? 'failed' : 'queued', 'attempts' => $n, 'error' => mb_substr($e->getMessage(), 0, 500), 'next_try_at' => gmdate('Y-m-d H:i:s', time() + 60 * $n * $n)], ['id' => $r['id']]); $done['failed']++;
        }
    }
    return $done;
}
function email_html(string $title, string $body, string $cta = '', string $ctaUrl = '', string $name = ''): string {
    return partial('emails/layout', ['title' => $title, 'body' => $body, 'cta' => $cta, 'cta_url' => $ctaUrl, 'name' => $name]);
}
/* ---- SMS / WhatsApp: provider set in Settings → Messaging (keys stored encrypted) ---- */
function send_sms(string $to, string $text): void {
    $prov = setting('sms.provider', '');
    if ($prov === 'africastalking') {
        http_post('https://api.africastalking.com/version1/messaging', ['username' => setting('sms.username'), 'to' => '+' . ltrim($to, '+'), 'message' => $text, 'from' => setting('sms.sender') ?: null], ['apiKey: ' . setting('sms.api_key'), 'Accept: application/json'], false);
    } elseif ($prov === 'twilio') {
        $sid = setting('sms.username');
        http_post("https://api.twilio.com/2010-04-01/Accounts/$sid/Messages.json", ['To' => '+' . ltrim($to, '+'), 'From' => setting('sms.sender'), 'Body' => $text], ['Authorization: Basic ' . base64_encode($sid . ':' . setting('sms.api_key'))], false);
    } else throw new RuntimeException('No SMS provider is set up (Settings → Messaging).');
}
function send_whatsapp(string $to, string $text): void {
    $phoneId = setting('whatsapp.phone_id'); $token = setting('whatsapp.token');
    if (!$phoneId || !$token) throw new RuntimeException('WhatsApp is not set up (Settings → Messaging).');
    http_post("https://graph.facebook.com/v19.0/$phoneId/messages", ['messaging_product' => 'whatsapp', 'to' => ltrim($to, '+'), 'type' => 'text', 'text' => ['body' => $text]], ['Authorization: Bearer ' . $token]);
}
function http_post(string $url, array $data, array $headers = [], bool $asJson = true, int $timeout = 20): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_POSTFIELDS => $asJson ? json_encode($data) : http_build_query(array_filter($data, fn($v) => $v !== null)),
        CURLOPT_HTTPHEADER => array_merge($headers, $asJson ? ['Content-Type: application/json'] : [])]);
    $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE); $err = curl_error($ch); curl_close($ch);
    if ($res === false) throw new RuntimeException("Could not reach $url: $err");
    $j = json_decode((string)$res, true);
    if ($code >= 400) throw new RuntimeException("HTTP $code from " . parse_url($url, PHP_URL_HOST) . ': ' . mb_substr((string)$res, 0, 300));
    return is_array($j) ? $j : ['raw' => $res];
}
function unread_count(int $userId): int { return (int)val('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL', [$userId]); }

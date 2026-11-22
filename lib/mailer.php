<?php
/* SMTP without libraries. Presets fill host/port; encryption is picked automatically (465 → SSL, otherwise STARTTLS when offered).
   Errors come back in plain words ("Username or password rejected…") so admins can fix settings themselves. */
declare(strict_types=1);

const SMTP_PRESETS = [
    'cpanel'   => ['label' => 'cPanel / your domain', 'host' => 'mail.{domain}', 'port' => 465],
    'gmail'    => ['label' => 'Gmail / Google Workspace', 'host' => 'smtp.gmail.com', 'port' => 587, 'hint' => 'Use an App Password, not your normal password.'],
    'outlook'  => ['label' => 'Outlook / Microsoft 365', 'host' => 'smtp.office365.com', 'port' => 587],
    'zoho'     => ['label' => 'Zoho Mail', 'host' => 'smtp.zoho.com', 'port' => 465],
    'brevo'    => ['label' => 'Brevo (Sendinblue)', 'host' => 'smtp-relay.brevo.com', 'port' => 587],
    'mailgun'  => ['label' => 'Mailgun', 'host' => 'smtp.mailgun.org', 'port' => 587],
    'sendgrid' => ['label' => 'SendGrid', 'host' => 'smtp.sendgrid.net', 'port' => 587, 'hint' => 'Username is the word "apikey".'],
    'custom'   => ['label' => 'Other SMTP server', 'host' => '', 'port' => 587],
];
function mail_settings(): array {
    return ['host' => (string)setting('mail.host', ''), 'port' => (int)setting('mail.port', 587), 'user' => (string)setting('mail.user', ''), 'pass' => (string)setting('mail.pass', ''),
            'from' => (string)setting('mail.from', ''), 'from_name' => (string)setting('mail.from_name', config('app_name')), 'enabled' => (bool)setting('mail.enabled', false)];
}
function send_mail(string $to, string $subject, string $html, string $text = '', ?array $cfg = null): void {
    $c = $cfg ?? mail_settings();
    if (empty($c['enabled']) && $cfg === null) throw new RuntimeException('Email sending is switched off (Settings → Email).');
    if (!$c['host'] || !$c['from']) throw new RuntimeException('Email is not set up yet: add the SMTP server and the From address.');
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) throw new RuntimeException("Not a valid email address: $to");
    $ssl = (int)$c['port'] === 465;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'SNI_enabled' => true]]);
    $fp = @stream_socket_client(($ssl ? 'ssl://' : 'tcp://') . $c['host'] . ':' . $c['port'], $errno, $errstr, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("Could not connect to {$c['host']}:{$c['port']} ($errstr). Check the server name and port; many hosts block port 25 — use 465 or 587.");
    stream_set_timeout($fp, 20);
    $read = function () use ($fp): array { $data = ''; while (($line = fgets($fp, 1024)) !== false) { $data .= $line; if (isset($line[3]) && $line[3] === ' ') break; } return [(int)substr($data, 0, 3), $data]; };
    $cmd = function (string $c2, array $ok) use ($fp, $read): string { fwrite($fp, $c2 . "\r\n"); [$code, $d] = $read(); if (!in_array($code, $ok, true)) throw new RuntimeException(smtp_error($code, $d, $c2)); return $d; };
    try {
        $read();
        $host = parse_url(abs_url('/'), PHP_URL_HOST) ?: 'localhost';
        $ehlo = $cmd("EHLO $host", [250]);
        if (!$ssl && str_contains($ehlo, 'STARTTLS')) {
            $cmd('STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) throw new RuntimeException('Could not start an encrypted connection (STARTTLS).');
            $cmd("EHLO $host", [250]);
        }
        if ($c['user'] !== '') { $cmd('AUTH LOGIN', [334]); $cmd(base64_encode($c['user']), [334]); $cmd(base64_encode($c['pass']), [235]); }
        $cmd('MAIL FROM:<' . $c['from'] . '>', [250]);
        $cmd('RCPT TO:<' . $to . '>', [250, 251]);
        $cmd('DATA', [354]);
        $b = bin2hex(random_bytes(12));
        $hdr = 'From: ' . mb_encode_mimeheader($c['from_name'], 'UTF-8') . ' <' . $c['from'] . ">\r\nTo: <$to>\r\nSubject: " . mb_encode_mimeheader($subject, 'UTF-8')
             . "\r\nDate: " . date('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(8)) . '@' . $host . ">\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$b\"\r\n";
        $text = $text ?: trim(html_entity_decode(strip_tags(preg_replace('~<(br|/p|/tr)[^>]*>~i', "\n", $html))));
        $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
              . "--$b\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$b--\r\n";
        $cmd($hdr . "\r\n" . $body . '.', [250]);
        $cmd('QUIT', [221, 250]);
    } finally { fclose($fp); }
}
function smtp_error(int $code, string $raw, string $cmd): string {
    $what = str_starts_with($cmd, 'RCPT') ? 'The recipient was refused' : (str_starts_with($cmd, 'MAIL') ? 'The From address was refused' : 'The mail server said no');
    return match (true) {
        $code === 535 => 'Username or password rejected. Check them; Gmail and Outlook need an App Password.',
        $code === 530 => 'The server needs you to sign in (add the username and password).',
        $code === 550 || $code === 553 => "$what. Use a From address on your own domain that the server allows.",
        $code === 421 => 'The mail server is busy or closed the connection. Try again in a few minutes.',
        default => "$what (code $code): " . trim(mb_substr($raw, 4, 200)),
    };
}

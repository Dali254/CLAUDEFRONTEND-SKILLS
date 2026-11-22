<?php
/* Safe uploads (R24): checked by real content type and size, random names under storage/uploads (deny-all),
   served only by the /files/{id} route, which checks permission. Images are re-encoded to strip anything hidden. */
declare(strict_types=1);

const UPLOAD_TYPES = [
    'image' => ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'],
    'pdf'   => ['application/pdf' => 'pdf'],
    'csv'   => ['text/csv' => 'csv', 'text/plain' => 'csv', 'application/csv' => 'csv', 'application/vnd.ms-excel' => 'csv'],
];
/** store_upload($_FILES['photo'], ['image','pdf'], 5_000_000, 'documents') → upload id; throws UserError with a readable message */
function store_upload(?array $f, array $kinds = ['image'], ?int $maxBytes = null, string $purpose = 'general', ?int $ownerId = null): int {
    $maxBytes ??= (int)setting('uploads.max_bytes', 8 * 1024 * 1024);
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) throw new UserError('Choose a file to upload.');
    if ($f['error'] !== UPLOAD_ERR_OK) throw new UserError($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE ? 'This file is too large.' : 'The upload did not finish. Try again.');
    if (!is_uploaded_file($f['tmp_name']) && PHP_SAPI !== 'cli') throw new UserError('Upload rejected.');
    if ($f['size'] > $maxBytes) throw new UserError('This file is too large. The limit is ' . round($maxBytes / 1048576, 1) . ' MB.');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
    $allowed = array_merge(...array_map(fn($k) => UPLOAD_TYPES[$k] ?? [], $kinds));
    if (!isset($allowed[$mime])) throw new UserError('This file type is not allowed. Use ' . implode(', ', array_unique(array_map('strtoupper', $allowed))) . '.');
    $ext = $allowed[$mime];
    $dir = gmdate('Y/m'); $abs = STORAGE . "/uploads/$dir"; if (!is_dir($abs)) mkdir($abs, 0750, true);
    $name = bin2hex(random_bytes(16)) . '.' . $ext; $dest = "$abs/$name";
    if (str_starts_with($mime, 'image/') && function_exists('imagecreatefromstring')) {
        $img = @imagecreatefromstring((string)file_get_contents($f['tmp_name']));
        if (!$img) throw new UserError('This image could not be read.');
        $ok = match ($ext) { 'png' => imagepng($img, $dest, 6), 'webp' => imagewebp($img, $dest, 85), default => imagejpeg($img, $dest, 86) };
        imagedestroy($img); if (!$ok) throw new UserError('Could not save the image.');
    } elseif (!(PHP_SAPI === 'cli' ? copy($f['tmp_name'], $dest) : move_uploaded_file($f['tmp_name'], $dest))) throw new UserError('Could not save the file.');
    return insert('uploads', ['owner_id' => $ownerId ?? (user()['id'] ?? null), 'purpose' => $purpose, 'path' => "$dir/$name", 'mime' => $mime, 'size' => filesize($dest),
        'original_name' => mb_substr(basename((string)$f['name']), 0, 180), 'sha256' => hash_file('sha256', $dest), 'created_at' => gmdate('Y-m-d H:i:s')]);
}
/** who may read an upload: owner, users with uploads.view_all, or a module hook that says yes */
function can_view_upload(array $up): bool {
    $u = user(); if (!$u) return false;
    if ((int)$up['owner_id'] === (int)$u['id'] || can('uploads.view_all')) return true;
    foreach ($GLOBALS['_UPLOAD_GUARDS'] ?? [] as $fn) if ($fn($up, $u)) return true;
    return false;
}
function upload_url(int $id, bool $download = false): string { return url('/files/' . $id, $download ? ['download' => 1] : []); }
class UserError extends RuntimeException {}

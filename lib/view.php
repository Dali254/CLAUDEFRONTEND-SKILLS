<?php
/* Views: app/views/<name>.php (or app/modules/<m>/views/<name>.php via "mod:name"), wrapped in a layout. */
declare(strict_types=1);
function view_file(string $name): string {
    [$mod, $v] = str_contains($name, ':') ? explode(':', $name, 2) : [null, $name];
    if (!preg_match('~^[a-z0-9_/-]+$~i', $v)) throw new InvalidArgumentException('bad view name');
    return $mod ? APP . "/modules/$mod/views/$v.php" : APP . "/views/$v.php";
}
function partial(string $name, array $data = []): string {
    $f = view_file($name); if (!is_file($f)) throw new RuntimeException("View missing: $name");
    return (static function (string $__f, array $__d) { extract($__d, EXTR_SKIP); ob_start(); require $__f; return (string)ob_get_clean(); })($f, $data);
}
function render(string $view, array $data = [], ?string $layout = 'layout/app'): string {
    $content = partial($view, $data);
    return $layout ? partial($layout, $data + ['content' => $content]) : $content;
}
function page(string $view, array $data = [], ?string $layout = 'layout/app'): never { echo render($view, $data, $layout); exit; }
/** inline script with the CSP nonce (R7) — prefer assets/app.js */
function script_tag(string $js): string { return '<script nonce="' . e(nonce()) . '">' . $js . '</script>'; }
function money(int|float|string $amount, string $cur = 'KES'): string { return $cur . ' ' . number_format((float)$amount, ((float)$amount == floor((float)$amount)) ? 0 : 2); }
function ago(?string $utc): string {
    if (!$utc) return ''; $s = time() - strtotime($utc . ' UTC');
    return $s < 60 ? 'just now' : ($s < 3600 ? floor($s / 60) . ' min ago' : ($s < 86400 ? floor($s / 3600) . ' h ago' : gmdate('j M Y', strtotime($utc . ' UTC'))));
}
function icon(string $name): string { return '<i class="sr-icon" data-icon="' . e($name) . '"></i>'; }

/** one kit field with its error under it (R15). field(['name'=>'email','label'=>'Email','type'=>'email','icon'=>'envelope-simple','required'=>true]) */
function field(array $o): string {
    $n = $o['name']; $id = $o['id'] ?? 'f-' . preg_replace('/[^a-z0-9_-]/i', '-', $n); $type = $o['type'] ?? 'text';
    $err = field_error($n); $val = $o['value'] ?? old($n);
    $attrs = ' id="' . e($id) . '" name="' . e($n) . '"' . (!empty($o['required']) ? ' required' : '') . (isset($o['placeholder']) ? ' placeholder="' . e($o['placeholder']) . '"' : '')
        . (isset($o['autocomplete']) ? ' autocomplete="' . e($o['autocomplete']) . '"' : '') . (isset($o['inputmode']) ? ' inputmode="' . e($o['inputmode']) . '"' : '')
        . (isset($o['minlength']) ? ' minlength="' . (int)$o['minlength'] . '"' : '') . (isset($o['maxlength']) ? ' maxlength="' . (int)$o['maxlength'] . '"' : '')
        . (isset($o['pattern']) ? ' pattern="' . e($o['pattern']) . '"' : '') . (isset($o['msg']) ? ' data-sr-msg="' . e($o['msg']) . '"' : '')
        . ($err ? ' aria-invalid="true" aria-describedby="' . e($id) . '-err"' : '')
        . implode('', array_map(fn($k, $v) => ' ' . preg_replace('/[^a-z0-9_-]/i', '', $k) . '="' . e((string)$v) . '"', array_keys($o['attrs'] ?? []), $o['attrs'] ?? []));   // extra data-* attributes
    $cls = 'sr-input' . (!empty($o['soft']) ? ' sr-input--soft' : '') . ($err ? ' is-invalid' : '');
    if ($type === 'textarea') $ctl = '<textarea class="' . $cls . '"' . $attrs . ' rows="' . (int)($o['rows'] ?? 4) . '">' . e($val) . '</textarea>';
    elseif ($type === 'select') {
        $ctl = '<select class="sr-select' . ($err ? ' is-invalid' : '') . '"' . $attrs . (!empty($o['search']) ? ' data-sr-search="' . e($o['search']) . '"' : '') . '>';
        if (isset($o['empty'])) $ctl .= '<option value="" hidden>' . e($o['empty']) . '</option>';
        foreach ($o['options'] ?? [] as $k => $v) $ctl .= '<option value="' . e($k) . '"' . ((string)$k === (string)$val ? ' selected' : '') . '>' . e($v) . '</option>';
        $ctl .= '</select>';
    } else {
        $ctl = '<input type="' . e($type) . '" class="' . $cls . '"' . $attrs . ($type === 'password' ? '' : ' value="' . e($val) . '"') . '>';
        if (!empty($o['icon']) || $type === 'password') {
            $eye = $type === 'password' ? '<button type="button" class="sr-pass__eye" data-sr-eye="' . e($id) . '" aria-label="Show password"><i class="ph ph-eye"></i></button>' : '';
            $ctl = '<div class="sr-input-group' . ($type === 'password' ? ' sr-pass' : '') . '"><i class="ph ph-' . e($o['icon'] ?? 'lock-simple') . '"></i>' . $ctl . $eye . '</div>';
        }
    }
    $label = '<label class="sr-label" for="' . e($id) . '">' . e($o['label']) . (!empty($o['required']) ? ' <span class="sr-req" aria-hidden="true">*</span>' : '') . '</label>';
    if (!empty($o['label_link'])) $label = '<div class="sr-label-row">' . $label . $o['label_link'] . '</div>';
    return '<div class="sr-field">' . $label . $ctl . (!empty($o['hint']) ? '<span class="sr-hint">' . e($o['hint']) . '</span>' : '')
        . '<p class="sr-error" id="' . e($id) . '-err"' . ($err ? '' : ' hidden') . ' role="alert"><i class="ph ph-warning-circle" aria-hidden="true"></i><span>' . e($err ?? '') . '</span></p></div>';
}
/** "Grace Wanjiku" → "GW", "WorkHub Abroad Support" → "WA" */
function initials(string $name): string { $w = preg_split('/\s+/u', trim($name)) ?: ['?']; return mb_strtoupper(mb_substr($w[0], 0, 1) . (isset($w[1]) ? mb_substr($w[1], 0, 1) : '')); }

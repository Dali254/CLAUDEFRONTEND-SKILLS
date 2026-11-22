<?php
/* Generic admin CRUD on kit UI. One definition gives list (search + paging), add/edit form with field errors,
   delete (re-auth + audit) and optional bulk add. Used by countries, provinces, FAQs, pages, banners, jobs, form fields.
   crud_routes('/admin/countries', 'geo.manage', fn() => [...definition...]); */
declare(strict_types=1);

function crud_routes(string $path, string $perm, callable $def): void {
    $h = function () use ($def) { crud_run($def()); };
    route('GET', $path, $h, 'perm:' . $perm);
    route('GET', $path . '/{rid:new|\d+}', $h, 'perm:' . $perm);
    route('POST', $path . '/{rid:new|\d+|bulk}', $h, 'perm:' . $perm);
}
function crud_run(array $d): void {
    $d += ['order' => 'id DESC', 'search' => [], 'list' => array_keys($d['fields']), 'singular' => rtrim($d['title'], 's'), 'icon' => 'apps', 'tone' => 'brand', 'scope' => [], 'per' => 25];
    $rid = param('rid'); $base = $d['path'];
    $scopeSql = ''; $scopeArgs = [];
    foreach ($d['scope'] as $k => $v) { $scopeSql .= ' AND ' . ident($k) . ' = ?'; $scopeArgs[] = $v; }
    $find = function ($id) use ($d, $scopeSql, $scopeArgs) { return one('SELECT * FROM ' . ident($d['table']) . ' WHERE id = ?' . $scopeSql, [(int)$id, ...$scopeArgs]) ?? abort(404); };
    if (is_post()) {
        if ($rid === 'bulk' && !empty($d['bulk'])) {
            $n = 0;
            foreach (preg_split('/\R/', (string)($_POST['lines'] ?? '')) as $line) {
                $line = trim($line); if ($line === '' || mb_strlen($line) > 190) continue;
                $row = [$d['bulk'] => $line] + $d['scope'] + ($d['defaults'] ?? []);
                if (val('SELECT 1 FROM ' . ident($d['table']) . ' WHERE ' . ident($d['bulk']) . ' = ?' . $scopeSql, [$line, ...$scopeArgs])) continue;
                insert($d['table'], $row); $n++;
            }
            audit($d['table'] . '.bulk_add', $d['table'], null, ['count' => $n]); flash('success', "Added $n", $n ? '' : 'Nothing new to add.'); redirect($base);
        }
        if (($_POST['_action'] ?? '') === 'delete' && is_numeric($rid)) {
            require_recent_auth();
            $row = $find($rid);
            if (!empty($d['before_delete']) && ($why = $d['before_delete']($row))) { flash('error', 'Cannot delete', $why); redirect("$base/$rid"); }
            delete_row($d['table'], ['id' => $row['id']]);
            audit($d['table'] . '.delete', $d['table'], $row['id'], ['row' => array_intersect_key($row, $d['fields'])]);
            flash('success', 'Deleted'); redirect($base);
        }
        $old = is_numeric($rid) ? $find($rid) : null;
        [$row, $errors] = crud_collect($d, $old);
        if ($errors) back_with($errors, "$base/$rid");
        if ($old) { if ($row) update_row($d['table'], $row, ['id' => $old['id']]); $id = (int)$old['id']; }
        else $id = insert($d['table'], $row + $d['scope'] + ['created_at' => gmdate('Y-m-d H:i:s')]);
        if (!empty($d['after_save'])) $d['after_save']($id, $row, $old);
        audit($d['table'] . ($old ? '.update' : '.create'), $d['table'], $id);
        flash('success', 'Saved'); redirect($d['return'] ?? $base);
    }
    if ($rid !== null) {
        $row = $rid === 'new' ? null : $find($rid);
        page('partials/crud-form', ['d' => $d, 'row' => $row, 'title' => ($row ? 'Edit ' : 'Add ') . mb_strtolower($d['singular']), 'section' => $d['title']]);
    }
    $q = str_in('q', 80); $where = '1=1' . $scopeSql; $args = $scopeArgs;
    if ($q !== '' && $d['search']) { $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $q) . '%'; $where .= ' AND (' . implode(' OR ', array_map(fn($c) => ident($c) . ' LIKE ?', $d['search'])) . ')'; foreach ($d['search'] as $_) $args[] = $like; }
    $p = paginate('SELECT * FROM ' . ident($d['table']) . " WHERE $where ORDER BY " . $d['order'], $args, $d['per']);
    page('partials/crud-list', ['d' => $d, 'p' => $p, 'q' => $q, 'title' => $d['title'], 'section' => 'Admin']);
}
function crud_collect(array $d, ?array $old): array {
    $row = []; $errors = [];
    foreach ($d['fields'] as $k => $f) {
        $type = $f['type'] ?? 'text';
        if (!empty($f['readonly'])) continue;
        if ($type === 'checkbox') { $row[$k] = !empty($_POST[$k]) ? 1 : 0; continue; }
        $v = trim((string)($_POST[$k] ?? ''));
        if ($v === '' && !empty($f['required'])) { $errors[$k] = $f['msg'] ?? ('Enter ' . mb_strtolower($f['label']) . '.'); continue; }
        if ($v !== '' && isset($f['max']) && mb_strlen($v) > $f['max']) { $errors[$k] = 'Use at most ' . $f['max'] . ' characters.'; continue; }
        if ($v !== '' && isset($f['pattern']) && !preg_match('/^(?:' . $f['pattern'] . ')$/u', $v)) { $errors[$k] = $f['msg'] ?? 'Use the format shown.'; continue; }
        if ($type === 'number' && $v !== '' && !is_numeric($v)) { $errors[$k] = 'Enter a number.'; continue; }
        if ($type === 'select' && $v !== '' && !array_key_exists($v, $f['options'] ?? [])) { $errors[$k] = 'Choose an option.'; continue; }
        if (!empty($f['unique']) && $v !== '' && val('SELECT 1 FROM ' . ident($d['table']) . ' WHERE ' . ident($k) . ' = ? AND id <> ?', [$v, (int)($old['id'] ?? 0)])) { $errors[$k] = 'This is already used.'; continue; }
        $row[$k] = $v === '' ? ($f['null'] ?? true ? null : '') : ($type === 'number' ? $v + 0 : $v);
    }
    if (!$errors && !empty($d['validate'])) $errors = (array)$d['validate']($row, $old);
    return [$row, $errors];
}

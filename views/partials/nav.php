<?php /* nav for rail + drawer: core items + enabled modules, filtered by permission */
$path = request_path(); $sec = null;
$items = menu('member'); $admin = menu('admin'); $current = nav_active(array_column(array_merge($items, $admin), 'path'));
$link = function (array $i) use ($current) {
    $active = $i['path'] === $current;
    return '<a href="' . e(url($i['path'])) . '" class="sr-nav-link tone-' . e($i['tone'] ?? 'brand') . ($active ? ' is-active' : '') . '"' . ($active ? ' aria-current="page"' : '') . '><span class="sr-nav-link__icon">' . icon($i['icon'] ?? 'apps') . '</span><span class="sr-nav-link__label">' . e($i['label']) . '</span>'
        . (!empty($i['badge']) ? '<span class="sr-nav-link__badge">' . e((string)$i['badge']) . '</span>' : '') . '</a>';
};
foreach ($items as $i) { if (($i['section'] ?? '') !== $sec && !empty($i['section'])) { $sec = $i['section']; echo '<div class="sr-nav-section">' . e($sec) . '</div>'; } echo $link($i); }
if ($admin) { echo '<div class="sr-nav-section">Admin</div>'; foreach ($admin as $i) echo $link($i); }

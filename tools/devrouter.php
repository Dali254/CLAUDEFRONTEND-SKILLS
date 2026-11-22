<?php
/* Local development only: php -S localhost:8000 tools/devrouter.php   (excluded from release zips — R32)
   Mirrors .htaccess: static files are served, private folders are 403, everything else goes to index.php. */
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$root = dirname(__DIR__);
if (preg_match('~^/(app|storage|tools)(/|$)|/\.~', $path)) { http_response_code(403); echo 'Forbidden'; return true; }
$file = realpath($root . $path);
if ($path !== '/' && $file && str_starts_with($file, $root) && is_file($file) && !str_ends_with($file, '.php')) return false;
$_SERVER['SCRIPT_NAME'] = '/index.php';
require $root . '/index.php';
return true;

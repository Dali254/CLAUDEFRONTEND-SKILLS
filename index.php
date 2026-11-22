<?php
/* Front controller: every request comes here (.htaccess). Pages live in app/pages, views in app/views (R20). */
require __DIR__ . '/app/bootstrap.php';
boot_web();

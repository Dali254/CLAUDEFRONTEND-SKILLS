"""Throw-away backend for tests: its own database, storage folder and config, served by `php -S`.
   Database credentials for creating test databases come from env:
     SR_TEST_DB_HOST (127.0.0.1)  SR_TEST_DB_PORT (3306)  SR_TEST_DB_USER (sr_ci)  SR_TEST_DB_PASS (sr_ci_pw)
   Database names always start with sr_ci_ so a test can never touch a real database."""
import os, subprocess, tempfile, shutil, socket, time, secrets, base64, urllib.request, contextlib, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BACKEND = os.path.join(ROOT, 'backend')
DB = dict(host=os.environ.get('SR_TEST_DB_HOST', '127.0.0.1'), port=os.environ.get('SR_TEST_DB_PORT', '3306'),
          user=os.environ.get('SR_TEST_DB_USER', 'sr_ci'), password=os.environ.get('SR_TEST_DB_PASS', 'sr_ci_pw'))
ADMIN = ('admin@example.com', 'correct-horse-battery-staple')
MEMBER = ('grace@example.com', 'member-pass-123')
MEMBER2 = ('brian@example.com', 'member-pass-123')

def mysql(sql, db=None):
    cmd = ['mysql', '-h', DB['host'], '-P', DB['port'], '-u', DB['user'], '-N', '-B']
    if db: cmd.append(db)
    env = dict(os.environ, MYSQL_PWD=DB['password'])
    r = subprocess.run(cmd, input=sql, text=True, capture_output=True, env=env)
    if r.returncode: raise RuntimeError('mysql: ' + r.stderr.strip())
    return r.stdout.strip()

def free_port():
    with socket.socket() as s: s.bind(('127.0.0.1', 0)); return s.getsockname()[1]

class Instance:
    def __init__(self, name='main', modules='all', demo=True, keep=False):
        assert name.replace('_', '').isalnum()
        self.db = 'sr_ci_' + name; self.modules = modules; self.demo = demo; self.keep = keep
        self.tmp = tempfile.mkdtemp(prefix='sr-ci-' + name + '-')
        self.storage = os.path.join(self.tmp, 'storage'); self.config = os.path.join(self.tmp, 'config.php')
        self.env = dict(os.environ, SR_CONFIG=self.config, SR_STORAGE=self.storage, PHP_CLI_SERVER_WORKERS='4', SR_ADMIN_PASSWORD=ADMIN[1])
        self.proc = None; self.base = None

    def php(self, *args, check=True):
        r = subprocess.run(['php', os.path.join(BACKEND, 'app', 'cli.php'), *args], cwd=BACKEND, env=self.env, text=True, capture_output=True)
        if check and r.returncode: raise RuntimeError('cli %s failed: %s %s' % (args, r.stdout, r.stderr))
        return r.stdout

    def create(self):
        shutil.copytree(os.path.join(BACKEND, 'storage'), self.storage, ignore=shutil.ignore_patterns('*.log', '*.sig', 'sess_*', '*.sql.gz', '[0-9][0-9][0-9][0-9]'))
        mysql('DROP DATABASE IF EXISTS `%s`; CREATE DATABASE `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' % (self.db, self.db))
        key = 'base64:' + base64.b64encode(secrets.token_bytes(32)).decode()
        with open(self.config, 'w') as f:
            f.write("<?php return ['app_name' => 'WorkHub Abroad', 'env' => 'production', 'base_path' => '', 'host' => '', 'trusted_proxies' => [], "
                    "'db' => ['host' => %r, 'port' => %s, 'name' => %r, 'user' => %r, 'pass' => %r], 'app_key' => %r];\n"
                    % (DB['host'], int(DB['port']), self.db, DB['user'], DB['password'], key))
        return self

    def install(self):
        self.php('migrate'); self.php('make-admin', ADMIN[0], 'Dalmas Admin')
        if self.modules: self.php('module', self.modules, 'on')
        self.php('migrate')
        if self.demo: self.php('demo')
        return self

    def serve(self):
        port = free_port(); self.base = 'http://127.0.0.1:%d' % port
        self.log = open(os.path.join(self.tmp, 'php-server.log'), 'w')
        self.proc = subprocess.Popen(['php', '-S', '127.0.0.1:%d' % port, 'tools/devrouter.php'], cwd=BACKEND, env=self.env, stdout=self.log, stderr=subprocess.STDOUT)
        for _ in range(100):
            try:
                if urllib.request.urlopen(self.base + '/health', timeout=2).status == 200: return self
            except Exception: time.sleep(.1)
        raise RuntimeError('php server did not start')

    def app_errors(self):
        """errors written by the app's logger and PHP warnings printed by the dev server"""
        out = []
        logs = os.path.join(self.storage, 'logs')
        for f in sorted(os.listdir(logs)) if os.path.isdir(logs) else []:
            if f.endswith('.log'): out += [l.strip() for l in open(os.path.join(logs, f), errors='replace') if ' error: ' in l or ' critical: ' in l]
        self.log.flush()
        out += [l.strip() for l in open(self.log.name, errors='replace') if 'PHP ' in l and ('Warning' in l or 'Fatal' in l or 'Notice' in l or 'Deprecated' in l or 'Parse error' in l)]
        return out

    def stop(self):
        if self.proc: self.proc.terminate(); self.proc.wait(5)
        if not self.keep:
            with contextlib.suppress(Exception): mysql('DROP DATABASE IF EXISTS `%s`' % self.db)
            shutil.rmtree(self.tmp, ignore_errors=True)

    def __enter__(self): return self
    def __exit__(self, *a): self.stop()

if __name__ == '__main__':   # python3 tools/qa/instance.py → start one and keep it running (for manual testing)
    i = Instance('manual', keep=True).create().install().serve()
    print('running at', i.base, '· admin', ADMIN[0], ADMIN[1], '· member', MEMBER[0], MEMBER[1], '· Ctrl+C to stop')
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt: i.stop()

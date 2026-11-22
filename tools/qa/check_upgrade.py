"""Upgrade test (part of tools/check-all): an older database gets the new code, one page is opened, and the
   automatic migrations must apply with no errors — also when several requests arrive at once (GET_LOCK).
   Old database = core tables only, with data (default), or a copy of your live database:
       SR_UPGRADE_DUMP=/path/live.sql tools/check-all      (the dump is imported into a throw-away sr_ci_ database)"""
import sys, os, subprocess, glob, threading, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from instance import Instance, BACKEND, mysql, DB

def main():
    fails = []
    with Instance('upgrade', modules=None, demo=False).create() as inst:
        dump = os.environ.get('SR_UPGRADE_DUMP')
        if dump:
            env = dict(os.environ, MYSQL_PWD=DB['password'])
            with open(dump, 'rb') as f: r = subprocess.run(['mysql', '-h', DB['host'], '-P', DB['port'], '-u', DB['user'], inst.db], stdin=f, env=env, capture_output=True)
            if r.returncode: print('  FAIL could not import dump:', r.stderr.decode()[:200]); return 1
            src = 'dump ' + os.path.basename(dump)
        else:
            old = dict(inst.env); inst.env['SR_MIGRATE_ONLY'] = 'core'; inst.php('migrate'); inst.php('make-admin', 'admin@example.com', 'Old Admin'); inst.env = old
            mysql("INSERT INTO users (name, phone, password, role_id, status, created_at) SELECT 'Old Member', '254700000001', 'x', id, 'active', NOW() FROM roles WHERE slug = 'member'", inst.db)
            src = 'core-only database with data'
        before = int(mysql('SELECT COUNT(*) FROM migrations', inst.db) or 0)
        for m in ['members', 'jobs', 'payments', 'documents', 'partners', 'chat', 'geo', 'content', 'pwa']:
            mysql("INSERT INTO settings (k, v, updated_at) VALUES ('module.%s', 'true', NOW()) ON DUPLICATE KEY UPDATE v = 'true'" % m, inst.db)
        for f in glob.glob(os.path.join(inst.storage, 'cache', '*.sig')): os.remove(f)
        inst.serve()
        codes = []
        def hit(): 
            try: codes.append(urllib.request.urlopen(inst.base + '/login', timeout=60).status)
            except Exception as e: codes.append(str(e)[:60])
        ts = [threading.Thread(target=hit) for _ in range(5)]; [t.start() for t in ts]; [t.join() for t in ts]
        if any(c != 200 for c in codes): fails.append('first requests after upgrade: %s' % codes)
        want = len(glob.glob(os.path.join(BACKEND, 'app', 'migrations', '*.php')) + glob.glob(os.path.join(BACKEND, 'app', 'modules', '*', 'migrations', '*.php')))
        after = int(mysql('SELECT COUNT(*) FROM migrations', inst.db))
        if after < want: fails.append('only %d of %d migrations applied' % (after, want))
        dup = mysql('SELECT name FROM migrations GROUP BY name HAVING COUNT(*) > 1', inst.db)
        if dup: fails.append('migration ran twice: ' + dup)
        for page in ['/dashboard', '/jobs', '/admin']:
            try: urllib.request.urlopen(inst.base + page, timeout=30)
            except urllib.error.HTTPError as e:
                if e.code >= 500: fails.append('%s → HTTP %s after upgrade' % (page, e.code))
        fails += ['server log: ' + e for e in inst.app_errors()]
        print('upgrade test (%s): %d → %d migrations, %d concurrent first requests' % (src, before, after, len(codes)))
    for f in fails: print('  FAIL', f)
    return 1 if fails else 0

if __name__ == '__main__': sys.exit(main())

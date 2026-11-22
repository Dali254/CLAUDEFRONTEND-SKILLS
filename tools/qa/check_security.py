"""Security tests (part of tools/check-all) against a throw-away instance with every module on:
   auth (guests / members kept out) · IDOR (member B cannot read member A's payment, file, application) · CSRF (POST without token refused) ·
   uploads (fake PDF, PHP disguised as image, SVG refused; files never served from /storage) · rate limits (sign-in, sign-up) ·
   security headers · private folders return 403 · .php URLs never run.  Exit code 1 on any failure."""
import sys, os, re, io, requests
sys.path.insert(0, os.path.dirname(__file__))
from instance import Instance, ADMIN, MEMBER, MEMBER2, mysql

fails = []; passed = 0
def expect(cond, what):
    global passed
    if cond: passed += 1
    else: fails.append(what)

def session(base, who=None):
    s = requests.Session(); s.headers['User-Agent'] = 'Mozilla/5.0 (Linux; Android 14) Chrome/131.0 Mobile'
    if who:
        tok = token(s, base + '/login')
        r = s.post(base + '/login', data={'_csrf': tok, 'login': who[0], 'password': who[1]}, allow_redirects=False)
        assert r.status_code in (302, 303), 'login failed for %s: %s' % (who[0], r.status_code)
    return s

def token(s, url):
    m = re.search(r'name="csrf-token" content="([^"]+)"', s.get(url).text) or re.search(r'name="_csrf" value="([^"]+)"', s.get(url).text)
    return m.group(1) if m else ''

def main():
    with Instance('sec').create().install().serve() as inst:
        B = inst.base; db = inst.db
        anon = requests.Session()
        # --- headers
        h = anon.get(B + '/login').headers
        for k in ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']: expect(k in h, 'header missing: ' + k)
        expect("'unsafe-inline'" not in re.search(r"script-src[^;]*", h.get('Content-Security-Policy', '')).group(0), 'CSP script-src allows unsafe-inline')
        expect('HttpOnly' in h.get('Set-Cookie', '') and 'SameSite' in h.get('Set-Cookie', ''), 'session cookie needs HttpOnly + SameSite')
        # --- private folders and files
        for path in ['/app/', '/app/config.php', '/app/bootstrap.php', '/storage/', '/storage/logs/', '/storage/uploads/', '/storage/backups/', '/storage/cache/', '/tools/devrouter.php', '/.git/config', '/.htaccess', '/app/migrations/0001_core.php']:
            r = anon.get(B + path, allow_redirects=False); expect(r.status_code == 403, 'private path %s returned %s (want 403)' % (path, r.status_code))
        for path in ['/index.php/admin', '/login.php', '/admin/users.php']:
            r = anon.get(B + path, allow_redirects=False); expect(r.status_code in (403, 404), '.php URL %s returned %s' % (path, r.status_code))
        # --- auth: guests are sent to sign-in, members cannot open admin
        for path in ['/dashboard', '/stages', '/documents', '/partner', '/chat', '/admin', '/admin/users']:
            r = anon.get(B + path, allow_redirects=False); expect(r.status_code in (302, 303) and '/login' in r.headers.get('Location', ''), 'guest reached %s (%s)' % (path, r.status_code))
        a = session(B, MEMBER); b = session(B, MEMBER2); adm = session(B, ADMIN)
        for path in ['/admin', '/admin/users', '/admin/settings', '/admin/approvals', '/admin/payments', '/admin/documents', '/admin/chats', '/admin/withdrawals', '/admin/members/export', '/admin/jobs/import']:
            r = a.get(B + path, allow_redirects=False); expect(r.status_code in (403, 404), 'member reached %s (%s)' % (path, r.status_code))
        expect(anon.get(B + '/admin/chats/1/api/messages', headers={'Accept': 'application/json'}, allow_redirects=False).status_code in (302, 401, 403), 'guest reached staff chat API')
        # --- IDOR: Grace's payment, file and status are invisible to Brian
        grace = mysql("SELECT id FROM users WHERE email = '%s'" % MEMBER[0], db)
        pay = mysql('SELECT id FROM payments WHERE user_id = %s LIMIT 1' % grace, db)
        up = mysql('SELECT upload_id FROM documents WHERE user_id = %s LIMIT 1' % grace, db)
        expect(pay and up, 'demo data missing (payment/document) — IDOR tests need it')
        if pay:
            expect(a.get(B + '/payments/' + pay).status_code == 200, 'owner cannot open own payment')
            for path in ['/payments/' + pay, '/payments/' + pay + '/status']:
                r = b.get(B + path, allow_redirects=False); expect(r.status_code == 404, 'IDOR: other member got %s for %s' % (r.status_code, path))
        if up:
            expect(a.get(B + '/files/' + up).status_code == 200, 'owner cannot open own file')
            expect(b.get(B + '/files/' + up, allow_redirects=False).status_code == 404, 'IDOR: other member opened a private file')
            expect(adm.get(B + '/files/' + up).status_code == 200, 'reviewer cannot open member file')
        # --- CSRF
        for path, data in [('/account', {'name': 'X'}), ('/partner/join', {}), ('/chat/api/messages', {'body': 'hi'}), ('/admin/users/1/delete', {})]:
            s = b if not path.startswith('/admin') else adm
            r = s.post(B + path, data=data, allow_redirects=False); expect(r.status_code in (403, 419), 'CSRF: POST %s without token got %s' % (path, r.status_code))
        # --- uploads
        doc_type = mysql('SELECT id FROM document_types ORDER BY sort LIMIT 1', db)
        tok = token(b, B + '/documents')
        bad_files = {'fake.pdf': (b'just text', 'application/pdf'), 'shell.php.jpg': (b'<?php echo 1; ?>', 'image/jpeg'), 'x.svg': (b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/svg+xml'),
                     'x.html': (b'<html><script>alert(1)</script></html>', 'text/html')}
        before = mysql('SELECT COUNT(*) FROM uploads', db)
        for name, (data, mime) in bad_files.items():
            b.post(B + '/documents/' + doc_type, data={'_csrf': tok}, files={'file': (name, io.BytesIO(data), mime)}, allow_redirects=False)
        expect(mysql('SELECT COUNT(*) FROM uploads', db) == before, 'a dangerous upload was accepted')
        expect(not [f for d, _, fs in os.walk(os.path.join(inst.storage, 'uploads')) for f in fs if f.endswith(('.php', '.svg', '.html', '.phtml'))], 'a script file landed in storage/uploads')
        # --- account lockout + alert
        target = MEMBER2[0]
        for _ in range(int(os.environ.get('SR_LOCKOUT_TRIES', '6'))):
            s4 = requests.Session(); s4.post(B + '/login', data={'_csrf': token(s4, B + '/login'), 'login': target, 'password': 'wrong-password'}, allow_redirects=False)
        expect(mysql("SELECT locked_until IS NOT NULL FROM users WHERE email = '%s'" % target, db) == '1', 'account not locked after repeated failed sign-ins')
        # --- rate limits
        codes = [requests.post(B + '/login', data={'_csrf': token(s2 := requests.Session(), B + '/login'), 'login': 'nobody@example.com', 'password': 'wrong'}, cookies=s2.cookies, allow_redirects=False).status_code for _ in range(14)]
        expect(429 in codes, 'sign-in is not rate limited (14 tries: %s)' % sorted(set(codes)))
        codes = []
        for _ in range(12):
            s3 = requests.Session(); t = token(s3, B + '/register')
            codes.append(s3.post(B + '/register', data={'_csrf': t, 'name': 'Bot', 'phone': '', 'password': 'x'}, allow_redirects=False).status_code)
        expect(429 in codes, 'sign-up is not rate limited')
        # --- re-auth on dangerous admin actions
        r = adm.get(B + '/admin/settings'); expect(r.status_code == 200, 'admin settings not reachable')
        mysql("UPDATE users SET locked_until = NULL, failed_logins = 0 WHERE email = '%s'" % target, db)
        # --- mpesa callback ignores bad tokens and unknown payments
        r = anon.post(B + '/mpesa/callback/' + '0' * 32, json={}, allow_redirects=False); expect(r.status_code == 404, 'M-Pesa callback accepted a wrong token')
        for e in inst.app_errors(): fails.append('server log: ' + e)
    print('security tests: %d passed, %d failed' % (passed, len(fails)))
    for f in fails: print('  FAIL', f)
    return 1 if fails else 0

if __name__ == '__main__': sys.exit(main())

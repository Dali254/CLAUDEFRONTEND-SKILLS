"""Build kit/sunrise-icons.js — one bundle, five switchable icon libraries.
  fluent      Microsoft Fluent UI System Color Icons (MIT)  — real multi-colour, full 24px set
  lucide      Lucide (ISC)            line icons
  heroicons   Heroicons (MIT)          Tailwind Labs outline icons
  tabler      Tabler Icons (MIT)       line icons, 5,000+ in full set
  fontawesome Font Awesome Free solid (CC BY 4.0 icons)  — solid glyphs
Usage:  python3 build-icons.py <npm-dir> <out.js>
  <npm-dir> must contain the unpacked npm tarballs of: @iconify-json/fluent-color, lucide-static,
  heroicons, @tabler/icons, @fortawesome/fontawesome-free  (npm pack <name> && tar xzf <tgz> -C <dir>).
  Add icons: extend tools/icon_map.py (semantic name -> file name per library) and re-run."""
import json,os,re,sys,glob
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from icon_map import M
src,out=sys.argv[1],sys.argv[2]
def find(pat): r=glob.glob(os.path.join(src,pat)); return r[0] if r else None
fc=json.load(open(find('*fluent-color*/package/icons.json')))
fluent={k[:-3]:v['body'] for k,v in fc['icons'].items() if k.endswith('-24')}
ROOT={'lucide':find('lucide-static*/package/icons'),'heroicons':find('heroicons*/package/24/outline'),'tabler':find('tabler-icons*/package/icons/outline'),'fontawesome':find('fortawesome*/package/svgs/solid')}
KEY={'lucide':'lucide','heroicons':'hero','tabler':'tabler','fontawesome':'fa'}
def inner(path):
    s=open(path).read(); s=re.sub(r'<!--[\s\S]*?-->','',s)
    vb=re.search(r'viewBox="([^"]+)"',s).group(1)
    body=re.search(r'<svg[^>]*>([\s\S]*)</svg>',s).group(1).strip()
    body=re.sub(r'\s+',' ',body).replace('> <','><')
    body=body.replace('<path stroke="none" d="M0 0h24v24H0z" fill="none"/>','')
    return vb,body
packs={}
for p,root in ROOT.items():
    d={}
    for sem,c in M.items():
        for name in c[KEY[p]]:
            f=os.path.join(root,name+'.svg')
            if os.path.exists(f):
                vb,b=inner(f); d[sem]=b if vb=='0 0 24 24' else [vb,b]; break
    packs[p]=d
ALIAS={'house':'home','house-simple':'home','wallet':'savings','money':'coin-multiple','coins':'coin-multiple','earn':'coin-multiple',
 'transactions':'receipt','users':'people','users-three':'people-community','team':'people-team','referrals':'people-add','buildings':'building',
 'hotel':'building','store':'building-store','shopping-bag':'building-store','storefront':'building-store','survey':'poll','play-circle':'video',
 'ai':'bot-sparkle','cpu':'bot-sparkle','course':'book-open-lightbulb','graduation-cap':'book-open-lightbulb','chat':'chat-multiple','messaging':'chat-multiple',
 'walk':'sport','palette':'paint-brush','theme':'paint-brush','sparkle':'add-starburst','bell':'alert','notifications':'alert','trend-up':'data-trending',
 'trading':'data-trending','chart':'data-bar-vertical-ascending','reports':'data-bar-vertical-ascending','shield-check':'shield-checkmark','verified':'certificate',
 'medal':'ribbon-star','lock':'lock-closed','target':'gauge','goal':'gauge','check':'checkmark-circle','success':'checkmark-circle','error':'error-circle',
 'info':'question-circle','bank':'building-government','mobile':'phone','withdraw':'send','today':'calendar-checkmark','loans':'vault','tips':'lightbulb',
 'user':'person','profile':'person','admin':'person-key','menu':'apps','grid':'apps','search':'search-sparkle','docs':'document-text','file':'document-text',
 'pro':'premium','crown':'premium','rocket':'fast-forward-circle','location':'location-ripple','map-pin':'location-ripple'}
ALIAS={a:t for a,t in ALIAS.items() if t in fluent}
STROKE={'lucide':'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"',
        'heroicons':'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"',
        'tabler':'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"',
        'fontawesome':'fill="currentColor"'}
js='''/* SUNRISE ICONS — five switchable libraries in one bundle, rendered as inline SVG (no CDN, works offline).
   Packs:  fluent (Microsoft Fluent Color, MIT — multi-colour) · lucide (ISC) · heroicons (MIT) · tabler (MIT) · fontawesome (Font Awesome Free, CC BY 4.0)
   Markup: <i class="sr-icon" data-icon="trophy"></i>        Per-element override: data-pack="lucide"
   Switch: SRTheme.apply({icons:'tabler'})  or  SRIcons.setPack('tabler')   (admin Theme Studio has a picker)
   API:    SRIcons.svg(name, pack) · .names() · .packs · .pack() · .hydrate(root) · .setPack(p)            */
(function (w, d) {
  'use strict';
  var F = %s;
  var P = %s;
  var A = %s;
  var ATTR = %s;
  var LABEL = { fluent: 'Fluent Color', lucide: 'Lucide', heroicons: 'Heroicons', tabler: 'Tabler', fontawesome: 'Font Awesome' };
  var cur = (w.SR_THEME && w.SR_THEME.icons) || d.documentElement.getAttribute('data-icons') || 'heroicons', n = 0;
  function key(name) { return F[name] || (P.lucide[name]) ? name : (A[name] || name); }
  function svg(name, pack) {
    pack = pack || cur; var k = key(name), id = 'u' + (++n), b;
    if (pack !== 'fluent' && P[pack] && P[pack][k]) {
      var e = P[pack][k], vb = '0 0 24 24'; if (typeof e !== 'string') { vb = e[0]; e = e[1]; }
      return '<svg viewBox="' + vb + '" width="1em" height="1em" ' + ATTR[pack] + ' aria-hidden="true" focusable="false">' + e + '</svg>';
    }
    b = F[k]; if (!b) return '';
    b = b.replace(/id="([^"]+)"/g, 'id="$1-' + id + '"').replace(/url\\(#([^)]+)\\)/g, 'url(#$1-' + id + ')').replace(/href="#([^"]+)"/g, 'href="#$1-' + id + '"');
    return '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false">' + b + '</svg>';
  }
  function hydrate(root, force) {
    (root || d).querySelectorAll('i.sr-icon[data-icon]' + (force ? '' : ':not([data-done])')).forEach(function (el) {
      var s = svg(el.getAttribute('data-icon'), el.getAttribute('data-pack'));
      if (s) { el.innerHTML = s; el.setAttribute('data-done', ''); if (el.hasAttribute('aria-label')) el.setAttribute('role', 'img'); }
      else if (w.console) console.warn('[SRIcons] unknown icon:', el.getAttribute('data-icon'));
    });
  }
  function setPack(p) { if (!LABEL[p] || p === cur) return; cur = p; d.documentElement.setAttribute('data-icons', p); hydrate(d, true); }
  d.documentElement.setAttribute('data-icons', cur);
  d.addEventListener('sr:theme', function (e) { if (e.detail && e.detail.icons) setPack(e.detail.icons); });
  w.SRIcons = { svg: svg, hydrate: hydrate, setPack: setPack, pack: function () { return cur; }, packs: LABEL,
    names: function () { return Object.keys(F).concat(Object.keys(A)).sort(); },
    add: function (pack, o) { var t = pack === 'fluent' ? F : (P[pack] = P[pack] || {}); for (var k in o) t[k] = o[k]; hydrate(d, true); } };
  function boot() { if (w.SRTheme && w.SRTheme.get().icons) setPack(w.SRTheme.get().icons); hydrate(); if ('MutationObserver' in w) new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) if (m[i].addedNodes.length) { hydrate(); break; } }).observe(d.body, { childList: true, subtree: true }); }
  if (d.readyState !== 'loading') boot(); else d.addEventListener('DOMContentLoaded', boot);
})(window, document);
''' % tuple(json.dumps(x,separators=(',',':')) for x in (fluent,packs,ALIAS,STROKE))
open(out,'w').write(js)
print({p:len(v) for p,v in packs.items()},'fluent',len(fluent),round(len(js)/1024),'KB')

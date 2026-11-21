import asyncio,sys,json
sys.path.insert(0,'/home/claude/tools')
from dw_spec import SPEC
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else '/home/claude/preview'
JS="""([sel,prop])=>{let els=[...document.querySelectorAll(sel)];let e=els.find(x=>x.getClientRects().length&&x.getBoundingClientRect().width>0)||els[0];if(!e)return null;
const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return prop==='fs'?parseFloat(cs.fontSize):prop==='h'?r.height:r.width}"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    pages={}; bad=0; out=[]
    for page in sorted(set(s[0] for s in SPEC)):
      c=await b.new_context(viewport={'width':412,'height':880},is_mobile=True,has_touch=True); pg=await c.new_page()
      await pg.goto(f'file://{ROOT}/{page}.html'); await pg.wait_for_timeout(500)
      await pg.evaluate("document.querySelectorAll('.sr-drawer').forEach(d=>{d.classList.add('is-open');d.style.transition='none'});document.documentElement.classList.add('sr-drawer-open')")
      for (pgn,sel,prop,t) in [s for s in SPEC if s[0]==page]:
        v=await pg.evaluate(JS,[sel,prop])
        ok = v is not None and abs(v-t)<= max(1.5, t*0.06)
        bad+= not ok
        out.append(f"{'OK ' if ok else 'OFF'} {page:9s} {sel[:42]:42s} {prop:2s} target {t:6.1f}  kit {('—' if v is None else f'{v:6.1f}')}")
      await c.close()
    await b.close()
    print('\n'.join(out)); print('OFF:',bad,'of',len(SPEC))
asyncio.run(main())

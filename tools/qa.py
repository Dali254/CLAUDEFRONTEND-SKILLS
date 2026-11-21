import asyncio,sys,json
from playwright.async_api import async_playwright
PAGES=sys.argv[2].split(',') ; ROOT=sys.argv[1]
JS_OVERFLOW="""()=>{const vw=document.documentElement.clientWidth,out=[];
document.querySelectorAll('body *').forEach(el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||el.closest('[hidden],.sr-drawer,.sr-studio,.sr-modal,.sr-filter-row,.sr-chips,.sr-tabs,.sr-table-wrap,.sr-snap,.sr-logos,.sr-toasts'))return;
const r=el.getBoundingClientRect();if(r.width&&(r.right>vw+1||r.left<-1))out.push((el.className&&el.className.baseVal===undefined?el.className:el.tagName)+'');});
return [document.documentElement.scrollWidth>vw,out.slice(0,6)]}"""
JS_OVERLAP="""()=>{const bad=[];const btns=[...document.querySelectorAll('.sr-page-head__actions .sr-btn,.sr-site-head__signin,.sr-page-head__title')];
const t=[...document.querySelectorAll('.sr-page-head__title')];const a=[...document.querySelectorAll('.sr-page-head__actions .sr-btn')];
t.forEach(x=>{const r=x.getBoundingClientRect();a.forEach(b=>{const q=b.getBoundingClientRect();if(r.width&&q.width&&!(q.right<=r.left||q.left>=r.right||q.bottom<=r.top||q.top>=r.bottom))bad.push('title/button overlap')})});
document.querySelectorAll('.sr-site-head__signin,.sr-btn,.sr-metric__v,.sr-stat__value').forEach(x=>{if(!x.offsetParent)return;const rs=[];const w=document.createTreeWalker(x,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);[...r.getClientRects()].forEach(c=>{if(c.width>1)rs.push(c)})}const minB=Math.min(...rs.map(c=>c.bottom));if(rs.some(c=>c.top>=minB-1))bad.push('wraps:'+x.textContent.trim().slice(0,20))});
return bad.slice(0,6)}"""
JS_TEXT="""()=>{const bad=[];const L=[];
document.querySelectorAll('body *').forEach(e=>{if(e.closest('.sr-drawer,.sr-studio,.sr-modal,[hidden],.sr-toasts,.sr-tabbar,.sr-popover,script,style'))return;
 if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||+cs.opacity===0)return;
 const r=document.createRange();r.selectNodeContents(e);let rs=[...r.getClientRects()];let p=e;while(p&&p!==document.body){const s=getComputedStyle(p);if(s.overflow!=='visible'||s.overflowX!=='visible'){const b=p.getBoundingClientRect();rs=rs.map(c=>{const l=Math.max(c.left,b.left),t=Math.max(c.top,b.top),rr=Math.min(c.right,b.right),bb=Math.min(c.bottom,b.bottom);return {left:l,top:t,right:rr,bottom:bb,width:rr-l,height:bb-t}})}p=p.parentElement}rs=rs.filter(c=>c.width>2&&c.height>2);if(!rs.length)return;
 if(e.scrollWidth>e.clientWidth+1&&cs.textOverflow!=='ellipsis'&&(cs.overflow==='hidden'||cs.overflowX==='hidden')&&e.clientWidth>0)bad.push('clipped:'+e.textContent.trim().slice(0,18));
 L.push([e,rs])});
for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const[a,ra]=L[i],[b,rb]=L[j];if(a.contains(b)||b.contains(a))continue;
 for(const x of ra)for(const y of rb){const w=Math.min(x.right,y.right)-Math.max(x.left,y.left),h=Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top);
  if(w>3&&h>3){bad.push('overlap:'+a.textContent.trim().slice(0,14)+' / '+b.textContent.trim().slice(0,14));break}}}
return [...new Set(bad)].slice(0,6)}"""
JS_TAP="""async()=>{const bad=[];const els=[...document.querySelectorAll('.sr-tile,.sr-module,.sr-reward,.sr-btn,.sr-nav-link,.sr-chip-btn')].filter(e=>e.offsetParent).slice(0,40);
for(const el of els){const r0=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();
el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r0.left+r0.width/2,clientY:r0.top+r0.height/2,button:0}));
await new Promise(r=>setTimeout(r,80));const r1=el.getBoundingClientRect(),p1=el.parentElement.getBoundingClientRect();
if(Math.abs(r1.height-r0.height)>2||Math.abs(p1.height-p.height)>2)bad.push(el.className.split(' ')[0]+' '+Math.round(r0.height)+'->'+Math.round(r1.height));}
await new Promise(r=>setTimeout(r,700));return bad.slice(0,6)}"""
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        fails=0
        for page in PAGES:
            for W in [360,390,412,768,1440]:
                ctx=await b.new_context(viewport={'width':W,'height':860},is_mobile=W<768,has_touch=W<768)
                pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)[:80]))
                await pg.goto(f'file://{ROOT}/{page}.html'); await pg.wait_for_timeout(700)
                await pg.evaluate("""async()=>{const H=document.documentElement.scrollHeight;for(let y=0;y<H;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,25))}scrollTo(0,0)}""")
                ov=await pg.evaluate(JS_OVERFLOW); ol=await pg.evaluate(JS_OVERLAP); tp=await pg.evaluate(JS_TAP); tx=await pg.evaluate(JS_TEXT)
                ok=not ov[0] and not ov[1] and not ol and not tp and not errs and not tx
                if not ok: fails+=1
                print(f"{'OK ' if ok else 'BAD'} {page:13s} {W:5d}  scrollX={ov[0]} overflow={ov[1]} overlap={ol} tap={tp} text={tx} js={errs}")
                await ctx.close()
        await b.close(); print('FAILURES:',fails)
asyncio.run(main())

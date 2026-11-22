/* Demo page scripts. CSP-safe: no inline code, no inline handlers, every lookup null-checked. */
function $id(id){return document.getElementById(id);}
function val(id){var el=$id(id);return el?el.value:'';}
function setText(id,t){var el=$id(id);if(el)el.textContent=t;}
function on(id,ev,fn){var el=$id(id);if(el)el.addEventListener(ev,fn);return el;}
(function(){

// Shared form helpers (replace the fake submit with your real fetch/POST)
function srErr(id,msg){var i=document.getElementById(id),e=document.getElementById(id+'-err');if(!i||!e)return !msg;if(msg){i.classList.add('is-invalid');i.setAttribute('aria-invalid','true');e.lastChild.textContent=msg;e.hidden=false;}else{i.classList.remove('is-invalid');i.removeAttribute('aria-invalid');e.hidden=true;}return !msg;}
function srPhone(v){v=v.replace(/[\s-]/g,'');return /^(\+?254|0)(7|1)\d{8}$/.test(v);}
document.querySelectorAll('.sr-input').forEach(function(i){i.addEventListener('input',function(){if(i.classList.contains('is-invalid'))srErr(i.id,'');});});
function showRef(){($id('ref-field')||{}).hidden=false;var t=document.getElementById('ref-toggle');t.hidden=true;t.setAttribute('aria-expanded','true');}
on('ref-toggle','click',function(){showRef();($id('ref')&&$id('ref').focus());});
var q=new URLSearchParams(location.search).get('ref');if(q){($id('ref')||{}).value=q;showRef();}
on('f','submit',function(e){e.preventDefault();
  var un=val('un').trim(),ph=val('ph'),pw=val('pw'),ok=true;
  ok=srErr('un',/^[A-Za-z0-9._-]{3,32}$/.test(un)?'':'Use 3–32 letters, numbers, dots, dashes or underscores')&&ok;
  ok=srErr('ph',srPhone(ph)?'':'Enter a Safaricom number like 254712345678')&&ok;
  ok=srErr('pw',pw.length>=6?'':'Password must be at least 6 characters')&&ok;
  var btn=this.querySelector('[type=submit]');
  if(!ok){btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
  SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1200)})}).then(function(){setTimeout(function(){location.href='dashboard.html'},500)});});

})();

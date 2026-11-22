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
on('f','submit',function(e){e.preventDefault();
  var u=val('user').trim(),p=val('pw'),ok=true;
  ok=srErr('user',u?'' :'Enter your phone number or username')&&ok; ok=srErr('pw',p?'' :'Enter your password')&&ok;
  var btn=this.querySelector('[type=submit]'); if(!ok){btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
  SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1100)})}).then(function(){setTimeout(function(){location.href='dashboard.html'},500)});});

})();

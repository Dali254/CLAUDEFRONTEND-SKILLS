/* Demo page scripts. CSP-safe: no inline code, no inline handlers, every lookup null-checked. */
function $id(id){return document.getElementById(id);}
function val(id){var el=$id(id);return el?el.value:'';}
function setText(id,t){var el=$id(id);if(el)el.textContent=t;}
function on(id,ev,fn){var el=$id(id);if(el)el.addEventListener(ev,fn);return el;}
/* Demo-only wiring for fake async actions (replace with real fetch/POST). */
document.addEventListener('click',function(e){var b=e.target.closest('[data-demo-run]');if(!b||!window.SRButton)return;var ms=+b.getAttribute('data-demo-run')||800;SRButton.run(b,function(){return new Promise(function(r){setTimeout(r,ms)})});});
document.addEventListener('submit',function(e){var f=e.target.closest&&e.target.closest('[data-demo-submit]');if(!f)return;e.preventDefault();var ms=+f.getAttribute('data-demo-submit');var b=f.querySelector('[type=submit]');if(ms&&b&&window.SRButton)SRButton.run(b,function(){return new Promise(function(r){setTimeout(r,ms)})});});

  // Clone the rail into the drawer so nav is written once.
  (function(){var r=document.querySelector('.sr-rail'),d=document.querySelector('.sr-drawer');if(r&&d&&!d.children.length){d.innerHTML=r.innerHTML;var b=d.querySelector('.sr-rail__brand'),f=d.querySelector('.sr-rail__foot');b.insertAdjacentHTML('beforeend','<button class="sr-icon-btn" style="margin-left:auto" data-sr-drawer-close aria-label="Close menu"><i class="ph ph-x"></i></button>');if(f)b.after(f);}})();
  // Admin-only: wire the Theme Studio to your backend.
  SRStudio.mount({ saveUrl: null /* e.g. '/admin/theme' */ });
  // Pay / unlock sheet: <button data-sr-unlock data-title="…" data-kind="Unlock video" data-fee="100" data-earn="150" data-icon="video">
  (function(){var f=document.getElementById('ul-form');if(!f)return;var $=function(i){return document.getElementById(i)};
    document.addEventListener('click',function(e){var b=e.target.closest('[data-sr-unlock]');if(!b)return;
      $('ul-title').textContent=b.dataset.title||'Unlock';$('ul-kicker').textContent=b.dataset.kind||'Unlock';
      $('ul-fee').textContent=b.dataset.fee||'100';$('ul-earn').textContent='+KES '+(b.dataset.earn||'150');
      $('ul-cta').textContent='Pay KES '+(b.dataset.fee||'100')+' via M-Pesa';
      var ic=$('ul-icon');ic.setAttribute('data-icon',b.dataset.icon||'video');ic.removeAttribute('data-done');SRIcons.hydrate(ic.parentNode);
      SRModal.open('unlock');});
    f.addEventListener('submit',function(e){e.preventDefault();var p=$('ul-phone'),v=p.value.replace(/\s/g,''),btn=f.querySelector('[type=submit]');
      if(!/^(\+?254|0)(7|1)\d{8}$/.test(v)){p.classList.add('is-invalid');$('ul-err').hidden=false;btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
      p.classList.remove('is-invalid');$('ul-err').hidden=true;
      SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1300)})}).then(function(){setTimeout(function(){SRModal.close('unlock');SRToast.show({title:'Check your phone',text:'Enter your M-Pesa PIN to finish the payment',icon:'phone'});},800)});});
  })();

  // Demo wiring for the withdraw sheet
  (function(){var f=document.getElementById('wd-form');if(!f)return;var inp=f.querySelector('#wd-amt'),err=f.querySelector('#wd-err');
    f.addEventListener('click',function(e){var c=e.target.closest('[data-amt]');if(c){inp.value=c.dataset.amt;inp.classList.remove('is-invalid');err.hidden=true;}});
    f.addEventListener('submit',function(e){e.preventDefault();var v=parseFloat(inp.value);var btn=f.querySelector('[type=submit]');
      if(!(v>=100&&v<=12480.5)){inp.classList.add('is-invalid');err.hidden=false;btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
      SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1200)})}).then(function(){setTimeout(function(){SRModal.close('withdraw');SRToast.show({title:'Withdrawal requested',text:'KES '+v.toLocaleString()+' is on its way to M-Pesa',icon:'ph-check-circle'});f.reset();},900)});});
  })();

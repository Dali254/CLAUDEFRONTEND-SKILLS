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
var step=1,steps=document.querySelectorAll('.sr-step');
on('resend','click',function(e){e.preventDefault();SRToast.show({title:'Code sent again',text:'Check your SMS inbox',icon:'mail',life:3000});});
on('f','submit',function(e){e.preventDefault();var btn=document.getElementById('go');
  if(step===1){if(!srErr('ph',srPhone(val('ph'))?'':'Enter a Safaricom number like 254712345678')){btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
    SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1000)})}).then(function(){setTimeout(function(){step=2;($id('step2')||{}).hidden=false;steps[0].className='sr-step is-done';steps[1].className='sr-step is-current';btn.querySelector('span').textContent='Verify code';($id('code')&&$id('code').focus());},1650)});}
  else{if(!srErr('code',/^\d{6}$/.test(val('code'))?'':'Enter the 6-digit code')){btn.classList.add('is-shake');setTimeout(function(){btn.classList.remove('is-shake')},450);return;}
    SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,1000)})}).then(function(){SRToast.show({title:'Code verified',text:'Now choose a new password',icon:'checkmark-circle'});steps[1].className='sr-step is-done';steps[2].className='sr-step is-current';});}});

})();

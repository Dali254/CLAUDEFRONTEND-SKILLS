/* components.html demo wiring (CSP-safe, null-checked) */
(function(){
  function $id(id){return document.getElementById(id);}
  var f=$id('apply');
  if(f)f.addEventListener('submit',function(e){
    e.preventDefault();                       // kit already blocked invalid submits and showed the summary
    var btn=f.querySelector('[data-sr-submit]'),em=$id('email');
    if(!window.SRButton||!btn)return;
    SRButton.run(btn,function(){return new Promise(function(r){setTimeout(r,900)})}).then(function(){
      if(em&&/^taken@/i.test(em.value)){SRForm.showErrors(f,[{field:'email',message:'This email is already registered. Sign in instead.'}]);return;}
      SRToast.show({type:'success',title:'Application sent',text:'We will SMS you within 48 hours.'});
    });
  });
  document.addEventListener('click',function(e){var b=e.target.closest('[data-demo-bulk]');if(!b)return;
    var n=document.querySelectorAll('[data-sr-bulk-item="users"]:checked').length;
    SRToast.show({type:b.getAttribute('data-demo-bulk')==='delete'?'warning':'success',title:(b.getAttribute('data-demo-bulk')==='delete'?'Delete ':'Approve ')+n+' candidate'+(n===1?'':'s'),text:'Demo only: nothing was changed.'});});
})();

/* status.html demo: fake status endpoint. On a real site use data-sr-url="/payments/ID/status" instead. */
(function(){
  var el=document.getElementById('pay'); if(!el||!window.SRStatus)return;
  var next='pending', polls=0;
  function fake(){ polls++; return new Promise(function(res){ setTimeout(function(){
    if(next==='success')res({status:'success',receipt:{'M-Pesa code':'TKL8H2Q9XA','Amount':'KES 20.00','Paid from':'+254 718 308 478','Date':new Date().toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'})}});
    else if(next==='failed')res({status:'failed',step:'pin',message:'Wrong PIN entered. You were not charged.'});
    else if(next==='cancelled')res({status:'cancelled',step:'pin'});
    else res({status:'pending',step:'pin'});
  },350);});}
  var api=SRStatus.mount(el,{check:fake});
  document.addEventListener('click',function(e){var b=e.target.closest('[data-sim]');if(!b)return;var s=b.getAttribute('data-sim');
    if(s==='restart'){next='pending';api.restart();return;}
    if(s==='timeout'){next='pending';api.set('timeout',{});return;}
    next=s;api.poll();});
  el.addEventListener('sr:status-action',function(e){var a=e.detail.action;
    if(a==='resend'){next='pending';api.restart();SRToast.show({type:'info',title:'Prompt sent again',text:'Check your phone for the M-Pesa PIN request.'});}
    if(a==='change')SRToast.show({type:'info',title:'Change number',text:'Demo: open your phone-number form here.'});});
})();

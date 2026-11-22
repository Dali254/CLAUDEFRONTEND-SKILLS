/* loading.html demo (CSP-safe). Real pages: call SRLoad.skeleton() before fetch, then fill the container. */
(function(){
  function $id(i){return document.getElementById(i);}
  var STATS='<div class="sr-stat tone-amber"><span class="sr-stat__icon"><i class="sr-icon" data-icon="sparkle"></i></span><div class="sr-stat__body"><p class="sr-stat__label">Today</p><p class="sr-stat__value"><small>KES</small>640.00</p></div><span class="sr-stat__hint">Earned today</span></div>'+
    '<div class="sr-stat tone-cyan"><span class="sr-stat__icon"><i class="sr-icon" data-icon="money"></i></span><div class="sr-stat__body"><p class="sr-stat__label">Withdrawn</p><p class="sr-stat__value"><small>KES</small>8,200</p></div><span class="sr-stat__hint">6 payouts</span></div>';
  var ROWS=[['Account activation','Nov 17 · 18:55','-KES 100.00','is-out'],['Referral bonus','Nov 16 · 09:12','+KES 250.00','is-in'],['Withdrawal to M-Pesa','Nov 15 · 14:30','-KES 1,500.00','is-out']]
    .map(function(r){return '<div class="sr-row"><span class="sr-row__icon tone-'+(r[3]==='is-in'?'success':'rose')+'"><i class="sr-icon" data-icon="receipt"></i></span><div class="sr-grow"><p class="sr-row__title">'+r[0]+'</p><p class="sr-row__meta">'+r[1]+'</p></div><span class="sr-amount '+r[3]+'">'+r[2]+'</span></div>';}).join('');
  function load(kind){
    var el=$id(kind==='stats'?'demo-stats':'demo-rows'); if(!el||!window.SRLoad)return;
    var done=SRLoad.skeleton(el,kind,kind==='stats'?2:3);
    setTimeout(function(){done(kind==='stats'?STATS:ROWS); if(window.SRIcons&&SRIcons.scan)SRIcons.scan(el);},1400);
  }
  load('stats'); load('rows');
  document.addEventListener('click',function(e){
    var b=e.target.closest('[data-demo-reload]'); if(b){load(b.getAttribute('data-demo-reload'));return;}
    if(e.target.closest('[data-demo-busy]')){var card=$id('demo-busy'),btn=e.target.closest('[data-demo-busy]');
      SRLoad.busy(card,new Promise(function(r){setTimeout(r,1500)})).then(function(){SRToast.show({type:'success',title:'Limit saved',text:'KES '+(($id('limit')||{}).value||'')+' per day'});});return;}
    if(e.target.closest('[data-demo-progress]')){SRLoad.start();setTimeout(SRLoad.done,1800);return;}
    if(e.target.closest('[data-demo-retry]')){var s=e.target.closest('.sr-state');SRLoad.busy(s,new Promise(function(r){setTimeout(r,900)}));return;}
    if(e.target.closest('[data-demo-preloader]')){var t=document.createElement('template');t.innerHTML=window.__srPre||'';var p=t.content.firstElementChild;if(!p)return;document.body.prepend(p);setTimeout(function(){p.classList.add('is-done');setTimeout(function(){p.remove();},400);},1600);}
  });
  var pre=document.querySelector('[data-sr-preloader]'); window.__srPre=pre?pre.outerHTML:'';
})();

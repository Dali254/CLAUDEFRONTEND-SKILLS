/* chat.html demo: in-memory transport. A real site passes data-sr-chat-url and the PHP chat module answers. */
(function(){
  var el=document.getElementById('chat'); if(!el||!window.SRChat)return;
  var id=100, now=Date.now(), H=3600e3, D=24*H, queue=[], typing=false, ai=true, handoff=false;
  function at(ms){return new Date(now-ms).toISOString();}
  var seed=[
    {id:++id,from:'system',body:'Chat started · Ticket #4821',at:at(D+3*H)},
    {id:++id,from:'me',body:'Hi, I paid Stage 1 yesterday but my application still says waiting.',at:at(D+3*H-60e3),status:'read'},
    {id:++id,from:'ai',author:'WorkHub Assistant',body:'Thanks Amina. Stage 1 · Application Processing was received on 21 Nov at 09:29 (M-Pesa TKL8H2Q9XA). Reviews take up to 24 hours.',at:at(D+3*H-50e3)},
    {id:++id,from:'me',body:'Okay thank you 🙏',at:at(D+2*H),status:'read',reactions:{'❤️':{n:1,mine:false}}},
    {id:++id,from:'ai',author:'WorkHub Assistant',body:'Your documents were approved this morning. Next is Stage 2 of 3 · Work Permit Processing. Details: https://example.com/stages',at:at(40*60e3),unread:true},
    {id:++id,from:'ai',author:'WorkHub Assistant',body:'Would you like me to explain what Stage 2 includes?',at:at(39*60e3),unread:true}];
  function reply(text,who){ typing=true; setTimeout(function(){ typing=false; queue.push({id:++id,from:who==='ai'?'ai':'them',author:who==='ai'?'WorkHub Assistant':'Sarah (Support)',body:text,at:new Date().toISOString()}); },1600); }
  var T={
    list:function(after){ return new Promise(function(r){ setTimeout(function(){
      var out=after?queue.splice(0):seed; r({messages:out,typing:typing,peer:{status:typing?'typing…':(handoff?'Sarah · online':'Online')},ai:ai,handoff:handoff}); },200); }); },
    send:function(m){ return new Promise(function(res,rej){ setTimeout(function(){
      if(/fail/i.test(m.body||'')){ if(!m.__tried){m.__tried=1;return rej(new Error('network'));} }
      res({message:{id:++id,from:'me',body:m.body,at:m.at,status:'delivered',reply_to:m.reply_to,attachment:m.attachment}});
      setTimeout(function(){ queue.push({id:id,client_id:m.client_id,from:'me',body:m.body,at:m.at,status:'read',reply_to:m.reply_to,attachment:m.attachment}); },2500);
      if(handoff) reply('Thanks! Let me check that for you, one moment.','them');
      else reply(/stage|yes|explain/i.test(m.body||'')?'Stage 2 covers the work permit application, embassy appointment and document translation. Tap “Talk to a person” if you need help with anything else.':'I can help with stages, documents and payments. For anything else, tap “Talk to a person”.','ai');
    },500); }); },
    typing:function(){return Promise.resolve({});}, read:function(){return Promise.resolve({});},
    react:function(){return Promise.resolve({});}, remove:function(){return Promise.resolve({});},
    handoff:function(){ handoff=true; queue.push({id:++id,from:'system',body:'Sarah from Support joined the chat',at:new Date().toISOString()}); reply('Hi Amina, I’m Sarah. I can see your Stage 1 is complete. How can I help?','them'); return Promise.resolve({ai:true,handoff:true}); }
  };
  SRChat.mount(el,{transport:T});
})();

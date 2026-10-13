/* The Ashen Realms v0.5: LAN presence, position sync and room chat.
   Intentionally no combat/quest/inventory sync in this foundation preview. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const all = new Map();
  let socket=null, ownId=null, room='havenmere', online=false, tick=null, sent='', lastSend=0;
  const status=$('lanStatus'), count=$('lanCount'), playerBox=$('lanPlayers'), chat=$('lanChat');
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canSend = ()=>socket && socket.readyState===WebSocket.OPEN;
  const connectedOrigin = location.protocol==='http:'||location.protocol==='https:';
  function showStatus(s){status.textContent=s}
  function appendLine(name,message,system=false){
    const p=document.createElement('p');if(system){p.className='sys';p.textContent=message}
    else {const b=document.createElement('b');b.textContent=name+': ';p.appendChild(b);p.appendChild(document.createTextNode(message))}
    chat.appendChild(p);while(chat.children.length>35)chat.firstElementChild.remove();chat.scrollTop=chat.scrollHeight;
  }
  function update(){
    const number=all.size;count.textContent=online?`${number+1} ONLINE`:'OFFLINE';$('lanHeaderDot').textContent=online?'●':'○';
    $('lanHeaderDot').style.color=online?'#7bd6b9':'#8c9baa';
    $('lanConnect').disabled=online;$('lanDisconnect').disabled=!online;
    $('lanRoom').disabled=online;$('lanName').disabled=online;
    playerBox.replaceChildren();
    if(!all.size){playerBox.textContent='No other adventurers in this lobby yet.';return}
    for(const p of all.values()){
      const div=document.createElement('div');div.textContent=`✧ ${p.name} · ${p.role||'Explorer'} · ${p.loc||'Character creation'}`;playerBox.append(div)
    }
  }
  function connect(){
    if(!connectedOrigin){showStatus('Open this game through the LAN server, not file://.');return}
    if(canSend())return;
    room=$('lanRoom').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,24)||'havenmere';
    $('lanRoom').value=room;
    const nickname=$('lanName').value.trim().slice(0,20)||'Adventurer';
    $('lanName').value=nickname;
    const scheme=location.protocol==='https:'?'wss:':'ws:';
    showStatus('Connecting to '+location.host+' …');
    if(socket)try{socket.close()}catch(e){}
    socket=new WebSocket(`${scheme}//${location.host}/ws`);
    socket.onopen=()=>{socket.send(JSON.stringify({type:'join',room,name:nickname}));showStatus('Joining '+room+' …')};
    socket.onmessage=e=>{
      let m;try{m=JSON.parse(e.data)}catch(err){return}
      if(m.type==='welcome'){ownId=m.id;online=true;showStatus(`Connected · ${room} · ${location.host}`);appendLine('','Joined the '+room+' lobby.',true);sendPosition(true)}
      if(m.type==='roster'){
        all.clear();for(const p of m.players||[]){if(p.id!==ownId)all.set(p.id,p)}update();
      }
      if(m.type==='presence'){
        if(m.action==='left')all.delete(m.player.id);else if(m.player.id!==ownId)all.set(m.player.id,m.player);
        update();if(m.action==='joined')appendLine('',`${m.player.name} joined the realm.`,true);
        if(m.action==='left')appendLine('',`${m.player.name} left the realm.`,true);
      }
      if(m.type==='state'&&m.player.id!==ownId){all.set(m.player.id,m.player);update()}
      if(m.type==='chat')appendLine(m.name,m.message);
      if(m.type==='error'){showStatus(m.message);appendLine('',m.message,true)}
    };
    socket.onclose=()=>{online=false;ownId=null;all.clear();update();showStatus('Disconnected. CONNECT to rejoin.');if(tick){clearInterval(tick);tick=null}};
    socket.onerror=()=>{showStatus('Unable to connect. Is the LAN server running?')};
    if(tick)clearInterval(tick);
    tick=setInterval(()=>sendPosition(false),260);
  }
  function sendPosition(force=false){
    if(!canSend()||!online)return;
    const s=window.AshenRealms?.networkState?.();
    if(!s)return;
    const details={type:'state',loc:s.loc,x:s.x,y:s.y,dir:s.dir,role:s.role,level:s.level,mode:s.mode};
    const compact=JSON.stringify(details),now=performance.now();
    if(!force && (compact===sent && now-lastSend<3000))return;
    sent=compact;lastSend=now;socket.send(compact)
  }
  function disconnect(){if(socket)socket.close();socket=null;online=false;all.clear();update();showStatus('Offline · click CONNECT to rejoin.')}
  $('lanConnect').onclick=connect;$('lanDisconnect').onclick=disconnect;
  $('lanToggle').onclick=()=>{const panel=document.querySelector('.lan-section');panel.classList.toggle('hidden-panel');$('lanToggle').setAttribute('aria-expanded',String(!panel.classList.contains('hidden-panel')))};
  $('lanChatForm').onsubmit=e=>{e.preventDefault();const input=$('lanMessage'),message=input.value.trim();if(!message)return;
    if(!canSend()||!online){showStatus('Connect first to send chat.');return}
    socket.send(JSON.stringify({type:'chat',message}));input.value='';
  };
  window.AshenNetwork={getOthers:()=>Array.from(all.values()),connect,disconnect,sendPosition,debug:()=>({online,ownId,room,players:Array.from(all.values())})};
  if(!connectedOrigin)showStatus('LAN mode requires the included Node.js server. Standalone game still works offline.');
  else if(location.pathname!=='/' && location.pathname.endsWith('.html'))showStatus('LAN mode is available. Click CONNECT.');
  else{showStatus('LAN server detected. Choose a nickname and click CONNECT.');}
  // Connecting is explicit so players can choose a room and an identity.
  update();
})();

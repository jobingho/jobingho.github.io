const http=require('http');const fs=require('fs');
function get(u){return new Promise((res,rej)=>{http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej)})}
(async()=>{
  const list=JSON.parse(await get('http://127.0.0.1:9222/json/list'));
  const page=list.find(t=>t.type==='page');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  let id=0;const pend=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
  await new Promise(r=>ws.onopen=r);
  await send('Page.enable');await send('Runtime.enable');
  const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.result?.value};
  // 先切 print 媒体，再导航（干净环境）
  await send('Emulation.setEmulatedMedia',{media:'print'});
  await send('Emulation.setDeviceMetricsOverride',{width:1200,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'https://jobingho.github.io/'});
  await new Promise(r=>setTimeout(r,4000));
  console.log('计算样式:',await ev(`JSON.stringify({
    mail:getComputedStyle(document.querySelector('.c-mail')).color,
    itemBorder:getComputedStyle(document.querySelector('.c-item')).borderColor,
    itemSpan:getComputedStyle(document.querySelector('.c-item span')).color,
    grad:getComputedStyle(document.querySelector('h1 .grad')).color,
    contactBg:getComputedStyle(document.querySelector('.contact')).backgroundColor,
    btnP:getComputedStyle(document.querySelector('.btn-p')).color,
    btnPbg:getComputedStyle(document.querySelector('.btn-p')).backgroundColor
  })`));
  // 注入"不打印背景图形"再截联系区
  await ev(`(()=>{const s=document.createElement('style');s.textContent='*{background-image:none!important}';document.head.appendChild(s);return 1})()`);
  await new Promise(r=>setTimeout(r,600));
  const R=JSON.parse(await ev(`(()=>{const r=document.querySelector('.contact').getBoundingClientRect();return JSON.stringify({top:Math.round(r.top+window.scrollY),height:Math.round(r.height)})})()`));
  const p=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:R.top,width:1200,height:Math.min(R.height,900),scale:0.7}});
  fs.writeFileSync('_pfinal.png',Buffer.from(p.result.data,'base64'));
  console.log('contact y=',R.top,'h=',R.height);
  ws.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

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
  await send('Emulation.setDeviceMetricsOverride',{width:900,height:1300,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'https://jobingho.github.io/resume.html'});
  await new Promise(r=>setTimeout(r,3000));
  console.log('=== 线上 resume.html ===');
  console.log(await ev(`JSON.stringify({
    photo:(()=>{const i=document.querySelector('.hd-photo');return i?i.complete&&i.naturalWidth>0:false})(),
    qr:(()=>{const i=document.querySelector('.hd-qr');return i?i.complete&&i.naturalWidth>0:false})(),
    h:Math.round(document.querySelector('.page').getBoundingClientRect().height),
    secs:[...document.querySelectorAll('.sec-title')].map(e=>e.textContent.trim()),
    jobs:[...document.querySelectorAll('.job-line')].map(e=>e.textContent.replace(/\\s+/g,' ').trim())
  })`));
  const p=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:900,height:1250,scale:1.1}});
  fs.writeFileSync('_online_resume.png',Buffer.from(p.result.data,'base64'));
  // 404
  await send('Page.navigate',{url:'https://jobingho.github.io/this-page-does-not-exist-xyz'});
  await new Promise(r=>setTimeout(r,2500));
  console.log('=== 线上 404 ===');
  console.log(await ev(`JSON.stringify({title:document.title, code:document.querySelector('.code')?.textContent, links:document.querySelectorAll('.tips a').length})`));
  ws.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

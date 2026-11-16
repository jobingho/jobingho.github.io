const http=require('http');
function get(u){return new Promise((res,rej)=>{http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej)})}
(async()=>{
  const list=JSON.parse(await get('http://127.0.0.1:9222/json/list'));
  const page=list.find(t=>t.type==='page');
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  let id=0;const pend=new Map();const logs=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id)}
    if(m.method==='Runtime.exceptionThrown')logs.push('EXC:'+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text));
    if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')logs.push('ERR:'+m.params.entry.text+' '+(m.params.entry.url||''));
  };
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}))});
  await new Promise(r=>ws.onopen=r);
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.result?.value};
  const U='https://jobingho.github.io/';

  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:U});await new Promise(r=>setTimeout(r,4000));
  console.log('=== 线上桌面 ===');
  console.log(await ev(`JSON.stringify({
    title:document.title,
    rvHidden:[...document.querySelectorAll('.rv')].filter(e=>getComputedStyle(e).opacity!=='1').length,
    imgsOk:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length+'/'+document.images.length,
    likeNums:[...document.querySelectorAll('.w-like-num')].map(n=>n.hidden?'hidden':'shown:'+n.textContent),
    likeBase:[...document.querySelectorAll('.w-like')].map(b=>b.getAttribute('data-base')),
    ogImg:document.querySelector('meta[property="og:image"]')?.content,
    favicon:!!document.querySelector('link[rel="icon"]'),
    main:!!document.querySelector('main'),
    printRules:(()=>{try{return [...document.styleSheets].flatMap(s=>{try{return [...s.cssRules]}catch(e){return []}}).filter(r=>r.media&&String(r.media.mediaText).includes('print')).length}catch(e){return -1}})(),
    矛盾表述:(document.body.innerText.match(/已产出完整图文成品/g)||[]).length,
    手机号:document.body.innerText.includes('18924542085'),
    scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth
  })`));
  // 点赞交互
  console.log('=== 点赞 ===');
  console.log(await ev(`(()=>{
    localStorage.removeItem('job_portfolio_likes_v2');
    const b=document.querySelector('.w-like[data-like="wk"]');const n=b.querySelector('.w-like-num');
    const init={hidden:n.hidden,txt:n.textContent};
    b.click();
    const after={hidden:n.hidden,txt:n.textContent,pressed:b.getAttribute('aria-pressed')};
    b.click();
    const off={hidden:n.hidden,txt:n.textContent};
    localStorage.removeItem('job_portfolio_likes_v2');
    return JSON.stringify({init,after,off});
  })()`));
  // 移动端
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
  await send('Page.navigate',{url:U});await new Promise(r=>setTimeout(r,3000));
  console.log('=== 线上移动端 ===');
  console.log(await ev(`JSON.stringify({
    burger:getComputedStyle(document.querySelector('.nav-burger')).display,
    scrollW:document.documentElement.scrollWidth, clientW:document.documentElement.clientWidth
  })()`));
  console.log(await ev(`(()=>{const b=document.querySelector('.nav-burger');b.click();const m=document.getElementById('mnav');return JSON.stringify({open:!m.hidden,links:m.querySelectorAll('a').length,h:Math.round(m.getBoundingClientRect().height)})})()`));
  // 打印
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:U});await new Promise(r=>setTimeout(r,3000));
  await send('Emulation.setEmulatedMedia',{media:'print'});
  await new Promise(r=>setTimeout(r,500));
  console.log('=== 线上打印样式 ===');
  console.log(await ev(`JSON.stringify({
    grad:getComputedStyle(document.querySelector('h1 .grad')).color,
    btnP:getComputedStyle(document.querySelector('.btn-p')).color,
    contactBg:getComputedStyle(document.querySelector('.contact')).backgroundColor,
    cMail:getComputedStyle(document.querySelector('.c-mail')).color,
    cItemBorder:getComputedStyle(document.querySelector('.c-item')).borderColor
  })`));
  console.log('=== ERRORS ===');console.log(logs.length?logs.slice(0,8).join('\n'):'(none)');
  ws.close();process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1)});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const evidence={checks:[],errors:[],warnings:[]};
 try {
  const page=await browser.newPage({viewport:{width:750,height:1334}});
  page.on('pageerror',e=>evidence.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'){if(m.location().url.endsWith('/favicon.ico'))evidence.warnings.push('favicon.ico 404');else evidence.errors.push(m.text());}});
  await page.goto(process.env.GRAYBOX_URL || 'http://127.0.0.1:8765',{waitUntil:'networkidle'});
  await page.waitForFunction(async()=>{try{const cc=await System.import('cc');return !!cc.director.getScene()?.getComponentInChildren('GrayboxGame')?.node.getChildByName('GrayboxWorld');}catch{return false;}});
  await page.waitForTimeout(1800);
  const read=()=>page.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame');return {state:g.simulation.state,y:g.simulation.y,v:g.simulation.velocity,pressed:g.simulation.pressed,time:g.simulation.elapsed,failure:g.simulation.failure,angle:g.node.getChildByName('GrayboxWorld').getChildByName('GrayboxPlayer').angle,gates:g.simulation.gates.map(x=>({...x}))};});
  const ready=await read();assert.equal(ready.state,'ready');
  await page.screenshot({path:'docs/verification/stage-1-ready.png'});
  await page.mouse.click(375,782);assert.equal((await read()).state,'playing');
  await page.mouse.move(130,450);await page.mouse.down();await page.waitForTimeout(350);
  const rising=await read();assert.ok(rising.pressed&&rising.y>0&&rising.v>0&&rising.angle>0);assert.ok(rising.v<=360);
  await page.mouse.up();await page.waitForTimeout(600);
  const falling=await read();assert.ok(!falling.pressed&&falling.v<0&&falling.angle<0);assert.ok(falling.v>=-440);
  evidence.checks.push({name:'real mouse hold, release, tilt and speed limits',rising,falling});
  await page.screenshot({path:'docs/verification/stage-1-playing.png'});
  await page.waitForTimeout(1800);assert.equal((await read()).failure,'floor');
  const dead=await read();await page.waitForTimeout(250);assert.deepEqual(await read(),dead);
  evidence.checks.push({name:'floor collision and post-death freeze',result:'passed'});
  await page.screenshot({path:'docs/verification/stage-1-game-over.png'});
  await page.mouse.click(375,782);let restarted=await read();assert.equal(restarted.state,'playing');assert.equal(restarted.failure,null);assert.ok(restarted.time<.15&&Math.abs(restarted.y)<15);assert.equal(restarted.pressed,false);
  await page.mouse.move(130,450);await page.mouse.down();await page.waitForTimeout(1800);await page.mouse.up();assert.equal((await read()).failure,'ceiling');
  evidence.checks.push({name:'restart reset and ceiling collision',result:'passed'});
  await page.mouse.click(375,782);await page.keyboard.down('Space');await page.waitForTimeout(150);assert.equal((await read()).pressed,true);
  await page.evaluate(async()=>{const cc=await System.import('cc');cc.game.emit(cc.Game.EVENT_HIDE);});
  const paused=await read();assert.equal(paused.state,'paused');assert.equal(paused.pressed,false);
  await page.waitForTimeout(350);assert.deepEqual(await read(),paused);
  await page.evaluate(async()=>{const cc=await System.import('cc');cc.game.emit(cc.Game.EVENT_SHOW);});assert.equal((await read()).state,'paused');
  await page.keyboard.up('Space');await page.mouse.click(375,782);assert.equal((await read()).state,'playing');assert.equal((await read()).pressed,false);
  evidence.checks.push({name:'engine hide/show lifecycle freezes run and requires explicit resume',result:'passed'});
  await page.mouse.click(670,119);assert.equal((await read()).state,'paused');
  evidence.checks.push({name:'pause button',result:'passed'});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(async()=>{try{const cc=await System.import('cc');return !!cc.director.getScene()?.getComponentInChildren('GrayboxGame')?.node.getChildByName('GrayboxWorld');}catch{return false;}});
  await page.waitForTimeout(1800);
  await page.mouse.click(375,782);
  let hovering=await read();
  while(hovering.time<3.6){
   assert.equal(hovering.state,'playing');
   if(hovering.y < -hovering.v*.15)await page.keyboard.down('Space');else await page.keyboard.up('Space');
   await page.waitForTimeout(50);hovering=await read();
  }
  await page.keyboard.down('Space');await page.waitForTimeout(1100);await page.keyboard.up('Space');
  assert.equal((await read()).failure,'obstacle');
  evidence.checks.push({name:'real keyboard flight into the first rendered obstacle',result:'passed'});
  await page.screenshot({path:'docs/verification/stage-1-obstacle-collision.png'});
  await page.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>evidence.errors.push(e.message));
  await mobile.goto('http://127.0.0.1:8765',{waitUntil:'networkidle'});await mobile.waitForFunction(async()=>{try{const cc=await System.import('cc');return !!cc.director.getScene()?.getComponentInChildren('GrayboxGame')?.node.getChildByName('GrayboxWorld');}catch{return false;}});
  await mobile.waitForTimeout(1800);
  const mobileRead=()=>mobile.evaluate(async()=>{const cc=await System.import('cc');const m=cc.director.getScene().getComponentInChildren('GrayboxGame').simulation;return {state:m.state,pressed:m.pressed,y:m.y};});
  // Fixed-width layout: button is 115 design pixels below the viewport center.
  await mobile.touchscreen.tap(195,844/2+115*390/750);assert.equal((await mobileRead()).state,'playing');
  const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:11}]});await mobile.waitForTimeout(150);assert.equal((await mobileRead()).pressed,true);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:11},{x:140,y:300,id:22}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:140,y:300,id:22}]});assert.equal((await mobileRead()).pressed,true);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await mobile.waitForTimeout(50);assert.equal((await mobileRead()).pressed,false);
  evidence.checks.push({name:'390x844 touch input, second finger release, touch cancellation',result:'passed'});
  await mobile.screenshot({path:'docs/verification/stage-1-mobile.png'});
  assert.deepEqual(evidence.errors,[]);
 }finally{
  fs.writeFileSync('docs/verification/stage-1-browser-results.json',JSON.stringify(evidence,null,2));
  await browser.close();
 }
 console.log(JSON.stringify(evidence,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});


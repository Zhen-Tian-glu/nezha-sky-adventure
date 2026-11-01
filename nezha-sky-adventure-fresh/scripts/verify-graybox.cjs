const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const URL=process.env.GRAYBOX_URL || 'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const evidence={mode:'tap',checks:[],errors:[],warnings:[]};
 let page;
 const read=p=>p.evaluate(async()=>{
  const cc=await System.import('cc');const g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');
  if(!g?.node.getChildByName('GrayboxWorld'))return null;
  const m=g.simulation;return {state:m.state,y:m.y,v:m.velocity,flaps:m.flapCount,time:m.elapsed,failure:m.failure,angle:g.node.getChildByName('GrayboxWorld').getChildByName('GrayboxPlayer').angle,gates:m.gates.map(x=>({...x}))};
 });
 const check=(name,details={})=>evidence.checks.push({name,result:'passed',...details});
 const load=async p=>{
  p.on('pageerror',e=>evidence.errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'){if(m.location().url.endsWith('/favicon.ico'))evidence.warnings.push('favicon.ico 404');else if(m.text().startsWith('Ignored attempt to cancel a touchcancel event with cancelable=false'))evidence.warnings.push(m.text());else evidence.errors.push(m.text())}});
  await p.goto(URL,{waitUntil:'networkidle'});
  let result;
  for(let i=0;i<100;i++){
   try{result=await read(p)}catch{}
   if(result)break;await p.waitForTimeout(100);
  }
  assert.ok(result,'Cocos scene/controller must be loaded');
  await p.waitForTimeout(150);
 };
 try{
  page=await browser.newPage({viewport:{width:750,height:1334}});await load(page);
  // A UI tap only arms the game; neither input nor time may leak into the run.
  await page.mouse.click(375,600);assert.equal((await read(page)).flaps,0);
  await page.mouse.click(375,782);const waiting=await read(page);
  assert.equal(waiting.state,'ready');assert.equal(waiting.flaps,0);assert.equal(waiting.y,0);
  await page.waitForTimeout(450);assert.deepEqual(await read(page),waiting);
  await page.screenshot({path:'docs/verification/tap-ready.png'});
  check('start button does not flap; Ready freezes until first playfield tap');
  await page.mouse.move(130,450);await page.mouse.down();await page.waitForTimeout(140);
  const up=await read(page);assert.equal(up.state,'playing');assert.equal(up.flaps,1);assert.ok(up.v>0&&up.angle>0&&up.y>0&&up.v<=360);
  await page.screenshot({path:'docs/verification/tap-playing.png'});
  await page.waitForTimeout(600);const held=await read(page);
  assert.equal(held.flaps,1);assert.ok(held.v<0&&held.angle<0&&held.v>=-440);
  await page.mouse.up();await page.waitForTimeout(30);assert.equal((await read(page)).flaps,1);
  await page.mouse.click(130,450);await page.waitForTimeout(40);const again=await read(page);
  assert.equal(again.flaps,2);assert.ok(again.v>0&&again.v<=360);
  check('one press is one impulse; hold and release do not repeat; a fresh tap restores upward speed',{up,held});
  await page.waitForTimeout(2600);const dead=await read(page);assert.equal(dead.failure,'floor');
  await page.waitForTimeout(200);assert.deepEqual(await read(page),dead);
  await page.screenshot({path:'docs/verification/tap-floor-collision.png'});
  check('no tapping leads to floor collision; death freezes geometry and velocity');
  await page.mouse.click(375,782);const reset=await read(page);
  assert.equal(reset.state,'ready');assert.equal(reset.failure,null);assert.equal(reset.flaps,0);assert.equal(reset.time,0);assert.equal(reset.v,0);
  await page.waitForTimeout(200);assert.deepEqual(await read(page),reset);
  check('restart resets run data and waits for a fresh playfield tap');
  await page.mouse.click(300,100);await page.waitForTimeout(30);assert.equal((await read(page)).flaps,0);
  check('header/UI region does not trigger flight');
  // Real repeated keyboard down events must not act as additional clicks.
  await page.keyboard.down('Space');await page.waitForTimeout(60);assert.equal((await read(page)).flaps,1);
  await page.keyboard.down('Space');await page.waitForTimeout(80);assert.equal((await read(page)).flaps,1);
  await page.keyboard.up('Space');await page.keyboard.down('Space');await page.waitForTimeout(40);assert.equal((await read(page)).flaps,2);
  await page.mouse.click(670,119);const paused=await read(page);assert.equal(paused.state,'paused');assert.equal(paused.flaps,2);
  await page.waitForTimeout(200);assert.deepEqual(await read(page),paused);
  await page.mouse.click(375,782);await page.keyboard.down('Space');await page.waitForTimeout(40);
  assert.equal((await read(page)).state,'playing');assert.equal((await read(page)).flaps,2);
  await page.keyboard.up('Space');await page.keyboard.press('Space');await page.waitForTimeout(40);assert.equal((await read(page)).flaps,3);
  check('keyboard repeats ignored; pause/continue buttons do not flap or replay held key');
  await page.evaluate(async()=>{const cc=await System.import('cc');cc.game.emit(cc.Game.EVENT_HIDE)});
  const hidden=await read(page);assert.equal(hidden.state,'paused');await page.waitForTimeout(200);assert.deepEqual(await read(page),hidden);
  await page.evaluate(async()=>{const cc=await System.import('cc');cc.game.emit(cc.Game.EVENT_SHOW)});
  assert.equal((await read(page)).state,'paused');await page.mouse.click(375,782);await page.waitForTimeout(40);assert.equal((await read(page)).flaps,hidden.flaps);
  check('engine hide/show clears pending input and requires explicit resume without an impulse');
  await page.goto(URL,{waitUntil:'networkidle'});await page.waitForTimeout(1800);
  await page.mouse.click(375,782);
  for(let i=0;i<35;i++){if((await read(page)).state==='gameOver')break;await page.mouse.click(130,450);await page.waitForTimeout(120)}
  assert.equal((await read(page)).failure,'ceiling');
  check('repeated discrete taps can reach the ceiling and end the run');
  await page.mouse.click(375,782);await page.keyboard.press('Space');await page.waitForTimeout(40);
  let current=await read(page);
  while(current.time<3.5){
   assert.equal(current.state,'playing');
   if(current.y<-40&&current.v<0)await page.keyboard.press('Space');
   await page.waitForTimeout(30);current=await read(page);
  }
  for(let i=0;i<12;i++){if((await read(page)).state==='gameOver')break;await page.keyboard.press('Space');await page.waitForTimeout(120)}
  assert.equal((await read(page)).failure,'obstacle');
  await page.screenshot({path:'docs/verification/tap-obstacle-collision.png'});
  check('tap-controlled flight reaches a rendered gate and collides with its upper body');
  // Exercise touch ownership in a second screen ratio through genuine browser touch events.
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});await load(mobile);
  await mobile.touchscreen.tap(195,844/2+115*390/750);await mobile.waitForTimeout(100);assert.equal((await read(mobile)).state,'ready');assert.equal((await read(mobile)).flaps,0);
  const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:11}]});await mobile.waitForTimeout(80);assert.equal((await read(mobile)).flaps,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:11},{x:140,y:300,id:22}]});await mobile.waitForTimeout(40);assert.equal((await read(mobile)).flaps,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:140,y:300,id:22}]});assert.equal((await read(mobile)).flaps,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await mobile.waitForTimeout(40);assert.equal((await read(mobile)).flaps,1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:90,y:300,id:33}]});await mobile.waitForTimeout(50);assert.equal((await read(mobile)).flaps,2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:90,y:300,id:33}]});await mobile.waitForTimeout(40);assert.equal((await read(mobile)).flaps,2);
  await mobile.screenshot({path:'docs/verification/tap-mobile.png'});
  check('390x844 touch: primary finger only, no synthetic mouse duplication, cancel/release never flap, fresh press works');
  // Confirm the first click's visible feedback and all copy use the new control scheme.
  const labels=await mobile.evaluate(async()=>{const cc=await System.import('cc');return cc.director.getScene().getComponentsInChildren(cc.Label).filter(x=>x.node.activeInHierarchy).map(x=>x.string)});
  assert.ok(labels.some(x=>x.includes('点按')));assert.ok(labels.every(x=>!x.includes('按住')&&!x.includes('松手')));
  check('visible tutorial and status copy use tapping rather than holding');
  assert.deepEqual(evidence.errors,[]);
 }catch(error){evidence.failure=String(error);if(page&&!page.isClosed())await page.screenshot({path:'docs/verification/tap-test-failure.png'}).catch(()=>{});throw error;
 }finally{
  fs.writeFileSync('docs/verification/tap-browser-results.json',JSON.stringify(evidence,null,2));await browser.close();
 }
 console.log(JSON.stringify(evidence,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});

const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const PREFIX=process.env.VERIFICATION_PREFIX||'stage-3-obstacles';
const url=process.env.GRAYBOX_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const report={version:require('../package.json').version,checks:[],errors:[]};let p;
 const check=name=>report.checks.push({name,result:'passed'});
 const inspect=p=>p.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');if(!g?.world)return null;const m=g.simulation;
  return {state:m.state,score:m.score,y:m.y,v:m.velocity,flaps:m.flapCount,theme:m.theme,time:m.elapsed,failure:m.failure,gates:m.gates.map(g=>({...g})),pool:g.obstacleViews.map(v=>({id:v.node.uuid,lower:v.lower.string,upper:v.upper.string})),labels:g.node.getComponentsInChildren(cc.Label).filter(l=>l.node.activeInHierarchy).map(l=>l.string)};
 });
 const load=async page=>{page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))report.errors.push(m.text())});await page.goto(url,{waitUntil:'networkidle'});for(let i=0;i<100;i++){try{if(await inspect(page))return}catch{}await page.waitForTimeout(100)}throw Error('Scene not ready')};
 const prepare=async(theme,index=0)=>{await p.evaluate(async({theme,index})=>{const cc=await System.import('cc');cc.director.getScene().getComponentInChildren('GrayboxGame').startRun({theme,seed:41,combinationIndex:index})},{theme,index});await p.waitForTimeout(40)};
 try{
  p=await browser.newPage({viewport:{width:750,height:1334}});await load(p);
  await p.mouse.click(375,782);let s=await inspect(p);assert.equal(s.state,'ready');assert.equal(s.score,0);assert.equal(s.flaps,0);check('normal start selects a theme and waits without a flap');
  const seen=new Set();
  for(const theme of ['sky','dragon']){
   for(let index=0;index<(theme==='sky'?9:3);index++){
    await prepare(theme,index);s=await inspect(p);assert.equal(s.theme,theme);assert.equal(s.pool.length,4);assert.ok(s.pool.every(v=>v.lower&&v.upper));seen.add(s.pool[0].lower);seen.add(s.pool[0].upper);
   }
   await prepare(theme);await p.screenshot({path:`docs/verification/${PREFIX}-${theme}-ready.png`});
   await p.keyboard.press('Space');await p.waitForTimeout(50);let guard=0;
   while((s=await inspect(p)).score<2&&guard++<650){
    assert.equal(s.state,'playing');const next=[...s.gates].sort((a,b)=>a.x-b.x).find(g=>g.x+g.width/2>=-228);
    if(s.y<(next?.centerY??0)-40&&s.v<0)await p.keyboard.press('Space');await p.waitForTimeout(30);
   }
   assert.ok(s.score>=2);assert.ok(s.labels.includes(`${s.score} 分`));
   await p.screenshot({path:`docs/verification/${PREFIX}-${theme}-playing.png`});
   await p.mouse.click(670,119);const paused=await inspect(p);await p.waitForTimeout(200);assert.deepEqual(await inspect(p),paused);assert.equal(paused.state,'paused');
   await p.mouse.click(375,782);await p.waitForTimeout(40);assert.equal((await inspect(p)).flaps,paused.flaps);
   check(`${theme}: visible scoring with real keyboard taps, pause freezes score and obstacles, continue adds no impulse`);
  }
  assert.equal(seen.size,8);check('all twelve configured pairs render correct labels across theme changes');
  await prepare('sky');const before=(await inspect(p)).pool.map(v=>v.id);
  const soak=await p.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame'),m=g.simulation;let steps=0;
   while(m.score<100&&steps++<40000){const next=[...m.gates].sort((a,b)=>a.x-b.x).find(x=>x.x+x.width/2>=-228);if(m.state==='ready'||m.y<(next?.centerY??0)-40&&m.velocity<0)m.requestFlap();m.step(1/120);if(m.state==='gameOver')throw Error('soak collision')}
   g.update(0);return {score:m.score,recycled:m.field.recycled,nodes:g.world.getChildByName('ObstaclePool').children.length};
  });assert.ok(soak.score>=100&&soak.recycled>90);assert.equal(soak.nodes,4);assert.deepEqual((await inspect(p)).pool.map(v=>v.id),before);check('100-score simulation reuses the same four rendered nodes and model slots');
  await p.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.simulation.y=453;g.simulation.requestFlap()});await p.waitForTimeout(60);
  s=await inspect(p);assert.equal(s.state,'gameOver');const dead=s;await p.waitForTimeout(200);assert.deepEqual(await inspect(p),dead);await p.screenshot({path:`docs/verification/${PREFIX}-result.png`});
  await p.waitForTimeout(300);await p.mouse.click(375,782);s=await inspect(p);assert.equal(s.score,0);assert.equal(s.state,'ready');assert.equal(s.flaps,0);check('death freezes score; result displays score; restart clears score and waits');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await load(mobile);
  await mobile.touchscreen.tap(195,844/2+115*390/750);await mobile.waitForTimeout(60);assert.equal((await inspect(mobile)).state,'ready');
  await mobile.touchscreen.tap(90,300);await mobile.waitForTimeout(70);assert.equal((await inspect(mobile)).flaps,1);await mobile.touchscreen.tap(90,300);await mobile.waitForTimeout(40);assert.equal((await inspect(mobile)).flaps,2);
  await mobile.screenshot({path:`docs/verification/${PREFIX}-mobile.png`});check('390x844 touch start and consecutive taps work with theme and score HUD');
  assert.deepEqual(report.errors,[]);
 }catch(e){report.failure=String(e);if(p)await p.screenshot({path:`docs/verification/${PREFIX}-browser-failure.png`});throw e}
 finally{fs.writeFileSync(`docs/verification/${PREFIX}-browser-results.json`,JSON.stringify(report,null,2));await browser.close()}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

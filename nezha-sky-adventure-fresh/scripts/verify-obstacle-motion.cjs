const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const url=process.env.GRAYBOX_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const report={version:require('../package.json').version,checks:[],errors:[],pixels:{}};let p;
 const check=name=>report.checks.push({name,result:'passed'});
 const inspect=page=>page.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');if(!g?.world)return null;const m=g.simulation;
  return {state:m.state,time:m.elapsed,score:m.score,flaps:m.flapCount,gates:m.gates.map(g=>({...g})),views:g.obstacleViews.map(v=>({id:v.node.uuid,effectId:v.effects.node.uuid,tick:v.motionTick,frames:v.frames})),nodes:g.world.getChildByName('ObstaclePool').children.length};
 });
 const load=async page=>{page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))report.errors.push(m.text())});await page.goto(url,{waitUntil:'networkidle'});for(let i=0;i<100;i++){try{if(await inspect(page))return}catch{}await page.waitForTimeout(100)}throw Error('scene not ready')};
 const prepare=async(theme,index,page=p)=>{await page.evaluate(async({theme,index})=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.startRun({theme,seed:53,combinationIndex:index});g.simulation.gates.forEach((x,i)=>x.x=i?1000+i*500:80);g.update(0)},{theme,index});await page.waitForTimeout(60)};
 const sample=async(time)=>{await p.evaluate(async time=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.simulation.elapsed=time;g.update(0)},time);await p.waitForTimeout(60);return inspect(p)};
 const staticTypes=new Set(['mountain','pillar','cloud']),seen=new Set();
 try{
  p=await browser.newPage({viewport:{width:750,height:1334}});await load(p);
  for(const theme of ['sky','dragon'])for(let index=0;index<(theme==='sky'?9:3);index++){
   await prepare(theme,index);const a=await sample(0),gate=a.gates[0],clips={};
   for(const side of ['lower','upper']){
    const f=a.views[0].frames[side];assert.ok(f&&f.primitives.length);
    const center=side==='lower'?gate.centerY-gate.gapHeight/2-48:gate.centerY+gate.gapHeight/2+48;
    clips[side]={x:415,y:Math.round(667-center-40),width:80,height:80};
    clips[side].before=await p.screenshot({clip:clips[side]});
   }
   const b=await sample(.37);assert.deepEqual(b.gates,a.gates);assert.equal(b.nodes,4);
   for(const side of ['lower','upper']){
    const id=gate[side],first=a.views[0].frames[side].primitives,last=b.views[0].frames[side].primitives;
    const {before,...clip}=clips[side];const after=await p.screenshot({clip});
    if(staticTypes.has(id)){assert.deepEqual(first,last);assert.ok(before.equals(after),`${id} pixels must remain static`)}
    else{
     assert.notDeepEqual(first,last);assert.ok(!before.equals(after),`${id} must animate actual rendered pixels`);
     if(!seen.has(id)){fs.writeFileSync(`docs/verification/stage-3-${id}-frame-a.png`,before);fs.writeFileSync(`docs/verification/stage-3-${id}-frame-b.png`,after);report.pixels[id]='changed';seen.add(id)}
    }
   }
   if(theme==='sky'&&index===7||theme==='sky'&&index===8||theme==='dragon'&&index===2)await p.screenshot({path:`docs/verification/stage-3-${theme}-${index}.png`});
  }
  assert.equal(seen.size,5);check('all twelve pairs: five dynamic types change real pixels; three static types do not; geometry unchanged');
  await prepare('sky',8);await p.mouse.click(130,450);await p.waitForTimeout(100);const playing=await inspect(p);await p.waitForTimeout(130);const later=await inspect(p);
  assert.ok(later.time>playing.time,JSON.stringify({first:{state:playing.state,time:playing.time,flaps:playing.flaps},later:{state:later.state,time:later.time,flaps:later.flaps}}));assert.notDeepEqual(later.views[0].frames,playing.views[0].frames);
  assert.ok(later.gates[0].x<playing.gates[0].x);assert.equal(later.gates[0].centerY,playing.gates[0].centerY);assert.equal(later.gates[0].gapHeight,playing.gates[0].gapHeight);
  check('real engine clock animates interiors and scrolls gates without vertical hazard movement');
  await p.mouse.click(670,119);const paused=await inspect(p);assert.equal(paused.state,'paused');await p.waitForTimeout(220);assert.deepEqual(await inspect(p),paused);
  await p.evaluate(async()=>{const cc=await System.import('cc');cc.game.emit(cc.Game.EVENT_HIDE);cc.game.emit(cc.Game.EVENT_SHOW)});await p.waitForTimeout(100);assert.deepEqual(await inspect(p),paused);
  await p.mouse.click(375,782);await p.waitForTimeout(90);const resumed=await inspect(p);assert.equal(resumed.flaps,paused.flaps);assert.ok(resumed.time>paused.time&&resumed.time<paused.time+.3);assert.notDeepEqual(resumed.views[0].frames,paused.views[0].frames);
  check('pause and hide/show freeze motion; explicit continue resumes without phase jump or flap');
  await p.evaluate(async()=>{const cc=await System.import('cc');const m=cc.director.getScene().getComponentInChildren('GrayboxGame').simulation;m.y=453;m.requestFlap()});await p.waitForTimeout(60);
  const dead=await inspect(p);assert.equal(dead.state,'gameOver');await p.waitForTimeout(200);assert.deepEqual(await inspect(p),dead);check('game over freezes effect phase, positions and score');
  const ids=dead.views.map(v=>[v.id,v.effectId]);await prepare('dragon',2);const reset=await inspect(p);assert.equal(reset.time,0);assert.equal(reset.score,0);assert.equal(reset.views[0].tick,0);assert.deepEqual(reset.views.map(v=>[v.id,v.effectId]),ids);check('restart resets animation clock and theme while reusing all four effect nodes');
  // The dim phase is a visual state, never an opening in the collider.
  await prepare('sky',1);await sample(1.125);await p.evaluate(async()=>{const cc=await System.import('cc');const g=cc.director.getScene().getComponentInChildren('GrayboxGame'),m=g.simulation,gate=m.gates[0];gate.x=-200;m.y=gate.centerY+gate.gapHeight/2+8;m.requestFlap()});await p.waitForTimeout(60);assert.equal((await inspect(p)).state,'gameOver');check('dim lightning still collides with the same visible solid body');
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await load(mobile);await prepare('dragon',2,mobile);await mobile.touchscreen.tap(90,300);await mobile.waitForTimeout(70);assert.equal((await inspect(mobile)).flaps,1);await mobile.screenshot({path:'docs/verification/stage-3-mobile.png'});check('390x844 touch and dynamic hazard layout remain usable');
  assert.deepEqual(report.errors,[]);
 }catch(e){report.failure=String(e);if(p)await p.screenshot({path:'docs/verification/stage-3-motion-failure.png'});throw e}
 finally{fs.writeFileSync('docs/verification/stage-3-motion-browser-results.json',JSON.stringify(report,null,2));await browser.close()}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

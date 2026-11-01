const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {obstaclePose}=require('../temp/model-tests/gameplay/ObstaclePose.js');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'}),report={version:'0.6.2',checks:[],errors:[]};let p;
 const check=name=>report.checks.push({name,result:'passed'});
 const read=()=>p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');if(!g?.world)return null;
  const sprite=s=>{const t=s.node.getComponent(cc.UITransform);return{x:s.node.position.x,y:s.node.position.y,width:t.width,height:t.height,color:[s.color.r,s.color.g,s.color.b,s.color.a]}};
  return{state:g.simulation.state,time:g.simulation.elapsed,scenery:g.sceneryTime,score:g.simulation.score,hero:g.currentHeroFrame,flaps:g.simulation.flapCount,banks:g.banks.map(x=>({x:x.sprite.node.position.x,y:x.sprite.node.position.y})),gates:g.simulation.gates.map(x=>({...x})),poses:g.obstacleViews.map(x=>({lower:sprite(x.lowerArt),upper:sprite(x.upperArt)})),model:JSON.stringify(g.simulation)};
 });
 const prepare=async(theme,index)=>{await p.evaluate(async({theme,index})=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.hidden=false;g.startRun({theme,seed:53,combinationIndex:index});g.simulation.gates.forEach((x,i)=>x.x=i?1000+i*500:80);g.update(0)},{theme,index});await p.waitForTimeout(60)};
 const poseMatches=s=>{
  s.gates.forEach((gate,i)=>{for(const side of ['lower','upper']){
   const q=s.poses[i][side],expected=obstaclePose(gate[side],gate[side+'Width'],side==='lower'?-500:gate.centerY+gate.gapHeight/2,side==='lower'?gate.centerY-gate.gapHeight/2:480,side,s.time,gate.slotId);
   for(const [actual,value]of [[q.x,expected.offsetX],[q.y,(expected.top+expected.bottom)/2],[q.width,expected.width],[q.height,expected.top-expected.bottom]])assert.ok(Math.abs(actual-value)<1e-4);
   assert.deepEqual(q.color,[...expected.tint,255]);
  }});
 };
 try{
  p=await b.newPage({viewport:{width:750,height:1334}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))report.errors.push(m.text())});
  await p.goto(process.env.GRAYBOX_URL||'http://127.0.0.1:8765',{waitUntil:'networkidle'});let loaded=false;for(let i=0;i<200;i++){try{if(await read()){loaded=true;break}}catch{}await p.waitForTimeout(100)}assert.ok(loaded);
  for(const theme of ['sky','dragon']){
   await prepare(theme,0);await p.evaluate(async()=>{const cc=await System.import('cc');cc.director.getScene().getComponentInChildren('GrayboxGame').player.active=false});
   const a=await read(),before=await p.screenshot({clip:{x:0,y:185,width:750,height:980}});await p.waitForTimeout(800);const c=await read(),after=await p.screenshot({clip:{x:0,y:185,width:750,height:980}});
   assert.equal(a.model,c.model);assert.ok(c.scenery-a.scenery>.5);assert.ok(Math.abs(a.banks[0].x-c.banks[0].x)>10);assert.ok(Math.abs(a.banks[3].x-c.banks[3].x)>20);assert.ok(!before.equals(after));
   await p.screenshot({path:`docs/verification/motion-062-${theme}-ambient.png`});check(`${theme}: actual background pixels and two parallax layers move while Ready physics stays frozen`);
  }
  await p.evaluate(async()=>{const cc=await System.import('cc');cc.director.getScene().getComponentInChildren('GrayboxGame').player.active=true});
  const changed=new Set();
  for(const [theme,index,sides]of [['sky',6,['lower']],['sky',1,['upper']],['sky',2,['upper']],['dragon',2,['lower','upper']]]){
   await prepare(theme,index);await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.hidden=true;g.simulation.elapsed=0;g.update(0)});await p.waitForTimeout(40);const a=await read();poseMatches(a);const before=await p.screenshot();
   await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.simulation.elapsed=.43;g.update(0)});await p.waitForTimeout(40);const c=await read();poseMatches(c);assert.deepEqual(a.gates,c.gates);
   for(const side of sides){assert.notDeepEqual(a.poses[0][side],c.poses[0][side]);changed.add(a.gates[0][side])}
   const after=await p.screenshot();assert.ok(!before.equals(after));await p.screenshot({path:`docs/verification/motion-062-${theme}-${index}.png`});
  }assert.equal(changed.size,5);check('all five dynamic artwork sprites visibly transform or flash; rendered poses exactly match the collision pose function');
  await prepare('sky',2);await p.mouse.click(130,450);await p.waitForTimeout(100);const started=await read();assert.equal(started.state,'playing');
  // Switching from idle scenery to gameplay must advance continuously, not reset it.
  assert.ok(started.scenery>=started.time);poseMatches(started);
  await p.mouse.click(670,119);const paused=await read();await p.waitForTimeout(250);assert.deepEqual(await read(),paused);check('pause freezes scenery, actual obstacle poses, character and scoring together');
  await p.mouse.click(375,782);await p.waitForTimeout(80);const resumed=await read();assert.equal(resumed.flaps,paused.flaps);assert.ok(resumed.scenery>paused.scenery&&resumed.scenery<paused.scenery+.25);poseMatches(resumed);check('continue resumes motion without replaying clicks or jumping scenery time');
  await p.evaluate(async()=>{const cc=await System.import('cc'),m=cc.director.getScene().getComponentInChildren('GrayboxGame').simulation;m.y=453;m.requestFlap()});await p.waitForTimeout(550);const dead=await read();assert.equal(dead.state,'gameOver');await p.waitForTimeout(150);assert.deepEqual(await read(),dead);check('after the short hit feedback, death leaves background, moving hazards and score frozen');
  assert.deepEqual(report.errors,[]);
 }catch(e){report.failure=String(e);if(p)await p.screenshot({path:'docs/verification/motion-062-failure.png'});throw e}
 finally{fs.writeFileSync('docs/verification/motion-062-browser-results.json',JSON.stringify(report,null,2));await b.close()}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});


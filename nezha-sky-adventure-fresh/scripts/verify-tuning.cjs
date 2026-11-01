const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
 const report={version:'0.6.1',checks:[],errors:[],reviewFixtures:true};
 const check=name=>report.checks.push({name,result:'passed'});
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(hash('assets/resources/art/nezha_motion_atlas.png'),hash('../game_assets/production/v1/nezha_motion_atlas.png'));
 check('runtime character is byte-for-byte the original atlas specified by the user');
 const b=await chromium.launch({headless:true,channel:'chrome'});let p;
 try{
  p=await b.newPage({viewport:{width:750,height:1334}});p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(process.env.GRAYBOX_URL||'http://127.0.0.1:8765',{waitUntil:'networkidle'});
  let ready=false;for(let i=0;i<200;i++){try{ready=await p.evaluate(async()=>{const cc=await System.import('cc');return !!cc.director.getScene()?.getComponentInChildren('GrayboxGame')?.world})}catch{}if(ready)break;await p.waitForTimeout(100)}assert.ok(ready);
  report.early=await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.startRun({theme:'sky',seed:41});g.simulation.gates.forEach((x,i)=>x.x=-185+i*500);g.update(0);return g.simulation.gates.map(x=>({gap:x.gapHeight,center:x.centerY}))});
  assert.ok(report.early[0].gap>=395);for(let i=1;i<4;i++)assert.ok(Math.abs(report.early[i].gap-report.early[i-1].gap)>=40);
  await p.waitForTimeout(80);await p.screenshot({path:'docs/verification/tuning-061-early.png'});check('early game shows clear alternating opening sizes and a forgiving first gate');
  report.late=await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.startRun({theme:'sky',seed:41});const m=g.simulation;m.score=35;
   for(let i=0;i<30000&&m.score<65;i++){const next=[...m.gates].sort((a,b)=>a.x-b.x).find(x=>x.x+x.width/2>=-228);if(m.state==='ready'||m.y<(next?.centerY??0)-40&&m.velocity<0)m.requestFlap();m.step(1/120);if(m.state==='gameOver')throw Error('late-game trajectory failed')}
   m.pause();g.lastState='paused';g.panel.active=false;[...m.gates].sort((a,b)=>a.x-b.x).forEach((x,i)=>x.x=-185+i*500);g.update(0);
   return {score:m.score,speed:m.speed,gates:[...m.gates].sort((a,b)=>a.x-b.x).map(x=>({gap:x.gapHeight,level:x.difficultyLevel}))};
  });assert.ok(report.late.score>=65);assert.equal(report.late.speed,255);assert.ok(report.late.gates.every(g=>g.gap>=240&&g.gap<=320&&g.level===4));
  for(let i=1;i<4;i++)assert.ok(Math.abs(report.late.gates[i].gap-report.late.gates[i-1].gap)>=40);
  await p.waitForTimeout(80);await p.screenshot({path:'docs/verification/tuning-061-late.png'});check('capped difficulty retains 240–320 pixel varied openings and passes tap-physics simulation');
  assert.deepEqual(report.errors,[]);
 }catch(e){report.failure=String(e);throw e}
 finally{fs.writeFileSync('docs/verification/tuning-061-browser-results.json',JSON.stringify(report,null,2));await b.close()}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

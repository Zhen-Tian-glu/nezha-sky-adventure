const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const baseline=process.env.THEME_BASELINE==='1';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const report={baseline,version:require('../package.json').version,runs:[],errors:[]};let p;
 const read=()=>p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');if(!g?.world)return null;
  return {theme:g.simulation.theme,background:g.background.spriteFrame.texture.image.uuid,expected:g.art.background[g.simulation.theme].texture.image.uuid,banks:g.banks.map(x=>x.sprite.spriteFrame.texture.image.uuid),foreground:g.art.foreground[g.simulation.theme].texture.image.uuid,label:g.themeLabel.string,state:g.simulation.state,panel:g.panel.active,score:g.simulation.score,gates:g.simulation.gates.map(x=>({lower:x.lower,upper:x.upper}))};
 });
 try{
  p=await browser.newPage({viewport:{width:750,height:1334}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))report.errors.push(m.text())});
  await p.goto(process.env.GRAYBOX_URL||'http://127.0.0.1:8765',{waitUntil:'networkidle'});let loaded=false;for(let i=0;i<200;i++){try{if(await read()){loaded=true;break}}catch{}await p.waitForTimeout(100)}assert.ok(loaded);
  await p.mouse.click(375,782);
  for(let i=0;i<12;i++){
   await p.waitForTimeout(40);const s=await read();assert.equal(s.state,'ready');assert.equal(s.background,s.expected);assert.ok(s.banks.every(x=>x===s.foreground));assert.equal(s.score,0);
   assert.ok(s.label.includes(s.theme==='sky'?'天宫':'龙宫'));assert.ok(s.gates.every(g=>s.theme==='sky'?['cloud','lightning','windwheel'].includes(g.upper)&&g.lower!=='waterball':g.upper==='seaMonster'&&g.lower!=='fireball'));
   report.runs.push(s);if(!baseline&&i<2)await p.screenshot({path:`docs/verification/theme-063-${s.theme}.png`});
   await p.evaluate(async()=>{const cc=await System.import('cc'),m=cc.director.getScene().getComponentInChildren('GrayboxGame').simulation;m.y=453;m.requestFlap()});
   for(let j=0;j<80;j++){const current=await read();if(current.state==='gameOver'&&current.panel)break;await p.waitForTimeout(20)}
   assert.equal((await read()).panel,true);if(i<11)await p.mouse.click(375,782);
  }
  if(!baseline){for(let i=0;i<12;i+=2)assert.equal(new Set(report.runs.slice(i,i+2).map(x=>x.theme)).size,2);assert.equal(report.runs.filter(x=>x.theme==='sky').length,6)}
  assert.deepEqual(report.errors,[]);
 }catch(e){report.failure=String(e);throw e}
 finally{fs.writeFileSync(`docs/verification/theme-063-${baseline?'baseline':'browser-results'}.json`,JSON.stringify(report,null,2));await browser.close()}
 console.log(JSON.stringify({baseline,themes:report.runs.map(x=>x.theme),errors:report.errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});

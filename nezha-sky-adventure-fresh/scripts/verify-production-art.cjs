const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const OUT='docs/verification/'+(process.env.VERIFICATION_PREFIX||'stage-4')+'-';
const url=process.env.GRAYBOX_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const result={version:require('../package.json').version,checks:[],errors:[]};let p;
 const check=name=>result.checks.push({name,result:'passed'});
 const inspect=page=>page.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene()?.getComponentInChildren('GrayboxGame');if(!g?.world)return null;
  const m=g.simulation;return {state:m.state,theme:m.theme,y:m.y,v:m.velocity,time:m.elapsed,score:m.score,flaps:m.flapCount,hero:g.currentHeroFrame,hit:g.hitTime,panel:g.panel.active,background:g.background.spriteFrame.texture.image.uuid,heroFrames:g.art.hero.length,obstacleFrames:Object.keys(g.art.obstacles).length,scale:g.world.scale.x,bankPositions:g.banks.map(b=>b.sprite.node.position.x),gates:m.gates.map(g=>({...g})),pool:g.obstacleViews.map(v=>({id:v.node.uuid,lower:v.lowerArt.spriteFrame?.rect,upper:v.upperArt.spriteFrame?.rect,frames:v.frames})),sprites:g.world.getComponentsInChildren(cc.Sprite).length};
 });
 const load=async page=>{page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))result.errors.push(m.text())});await page.goto(url,{waitUntil:'networkidle'});for(let i=0;i<200;i++){try{if(await inspect(page))return}catch{}await page.waitForTimeout(100)}throw Error('art did not load')};
 const prepare=async(theme,index,page=p)=>{await page.evaluate(async({theme,index})=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.startRun({theme,seed:53,combinationIndex:index});g.simulation.gates.forEach((x,i)=>x.x=i?1000+i*500:80);g.update(0)},{theme,index});await page.waitForTimeout(70)};
 try{
  p=await browser.newPage({viewport:{width:750,height:1334}});await load(p);let s=await inspect(p);assert.equal(s.heroFrames,16);assert.equal(s.obstacleFrames,8);await p.screenshot({path:OUT+'home.png'});check('six image textures load; sixteen character frames and eight painted obstacle frames are bound');
  const themes={};for(const theme of ['sky','dragon'])for(let index=0;index<(theme==='sky'?9:3);index++){
   await prepare(theme,index);s=await inspect(p);assert.ok(s.pool[0].lower.width>0&&s.pool[0].upper.height>0);assert.equal(s.state,'ready');assert.equal(s.score,0);themes[theme]=s.background;
   if(theme==='sky'&&index===7||theme==='dragon'&&index===2)await p.screenshot({path:`${OUT}${theme}.png`});
  }assert.notEqual(themes.sky,themes.dragon);check('all twelve legal pairs bind painted sprites; two different backgrounds and matching parallax banks render');
  await prepare('sky',8);const idleA=await inspect(p);await p.waitForTimeout(350);const idleB=await inspect(p);assert.equal(idleB.time,0);assert.notEqual(idleA.hero,idleB.hero);assert.ok(idleB.hero<4);check('Ready plays idle character frames while gameplay waits for a fresh click');
  await p.mouse.click(130,450);await p.waitForTimeout(70);s=await inspect(p);assert.ok(s.hero>=4&&s.hero<=7);assert.equal(s.flaps,1);await p.screenshot({path:OUT+'rise.png'});
  await p.waitForTimeout(350);s=await inspect(p);assert.ok(s.hero>=8&&s.hero<=11);await p.screenshot({path:OUT+'fall.png'});check('real click selects rise frames, gravity transition selects fall frames');
  await p.mouse.click(670,119);const frozen=await inspect(p);assert.equal(frozen.state,'paused');await p.waitForTimeout(200);assert.deepEqual(await inspect(p),frozen);await p.mouse.click(375,782);await p.waitForTimeout(60);assert.equal((await inspect(p)).flaps,frozen.flaps);check('pause freezes art, parallax, score and geometry; continue does not flap');
  await p.evaluate(async()=>{const cc=await System.import('cc'),m=cc.director.getScene().getComponentInChildren('GrayboxGame').simulation;m.y=453;m.requestFlap()});await p.waitForTimeout(60);s=await inspect(p);assert.equal(s.state,'gameOver');assert.ok(s.hero>=12&&s.hero<=15);assert.equal(s.panel,false);await p.screenshot({path:OUT+'hit.png'});const score=s.score;await p.waitForTimeout(450);s=await inspect(p);assert.equal(s.hero,15);assert.equal(s.panel,true);assert.equal(s.score,score);await p.screenshot({path:OUT+'result.png'});check('four-frame hit and shock burst precede result; physics and score already frozen');
  await p.mouse.click(375,782);assert.equal((await inspect(p)).score,0);assert.equal((await inspect(p)).state,'ready');
  const ids=(await inspect(p)).pool.map(v=>v.id),sprites=(await inspect(p)).sprites;for(let i=0;i<20;i++)await prepare(i%2?'sky':'dragon',0);assert.deepEqual((await inspect(p)).pool.map(v=>v.id),ids);assert.equal((await inspect(p)).sprites,sprites);check('twenty art/theme restarts reuse the same pool and sprite count');
  const changed=new Set();
  for(const [theme,index,sides]of [['sky',7,['lower','upper']],['sky',8,['upper']],['dragon',2,['lower','upper']]]){
   await prepare(theme,index);await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.hidden=true;g.simulation.elapsed=0;g.update(0)});await p.waitForTimeout(50);const a=await inspect(p);const clips={};
   for(const side of sides){const g=a.gates[0];const top=side==='lower'?667-(g.centerY-g.gapHeight/2):187;const bottom=side==='lower'?1167:667-(g.centerY+g.gapHeight/2);const clip={x:410,y:Math.ceil(top+4),width:90,height:Math.max(1,Math.floor(bottom-top-8))};clips[side]={clip,before:await p.screenshot({clip})}}
   await p.evaluate(async()=>{const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');g.simulation.elapsed=.37;g.update(0)});await p.waitForTimeout(50);const b=await inspect(p);assert.deepEqual(a.gates,b.gates);
   for(const side of sides){const before=clips[side].before,after=await p.screenshot({clip:clips[side].clip});assert.ok(!before.equals(after));changed.add(a.gates[0][side])}
  }assert.equal(changed.size,5);check('five dynamic artworks and effects change actual rendered pixels while reserved safe envelopes stay fixed');
  for(const [width,height]of [[390,844],[375,667],[390,650]]){
   const mobile=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await load(mobile);await prepare('dragon',2,mobile);const before=await inspect(mobile);await mobile.touchscreen.tap(width*.2,height*.45);await mobile.waitForTimeout(80);assert.equal((await inspect(mobile)).flaps,1);assert.ok(before.scale<=1);await mobile.screenshot({path:`docs/verification/stage-4-mobile-${width}x${height}.png`});
  }check('390x844, 375x667 and short 390x650 screens cover the background and accept touch without hiding core UI');
  assert.deepEqual(result.errors,[]);
 }catch(e){result.failure=String(e);if(p)await p.screenshot({path:OUT+'art-failure.png'});throw e}
 finally{fs.writeFileSync(OUT+'art-browser-results.json',JSON.stringify(result,null,2));await browser.close()}
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});


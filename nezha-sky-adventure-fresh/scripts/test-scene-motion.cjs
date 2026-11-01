const {test}=require('node:test'),assert=require('node:assert/strict');
const {obstaclePose}=require('../temp/model-tests/gameplay/ObstaclePose.js');
const {sceneMotion,SCENE_MOTION}=require('../temp/model-tests/gameplay/SceneMotion.js');
const {OBSTACLES}=require('../temp/model-tests/config/ObstacleConfig.js');
const {ObstacleField,transitionSafety}=require('../temp/model-tests/gameplay/ObstacleField.js');
const {FlightModel}=require('../temp/model-tests/gameplay/FlightModel.js');

test('five actual artwork poses change while static scenery stays fixed; every pose fits its reserved envelope',()=>{
 for(const [id,def]of Object.entries(OBSTACLES))for(const side of ['lower','upper']){
  const a=obstaclePose(id,120,-500,-120,side,0,1),b=obstaclePose(id,120,-500,-120,side,.6,1);
  if(def.period)assert.notDeepEqual(a,b,id);else assert.deepEqual(a,b,id);
  for(let i=0;i<300;i++){
   const p=obstaclePose(id,151,-500,10,side,i/30,2);
   assert.ok(p.offsetX-p.width/2>=-151/2-1e-7&&p.offsetX+p.width/2<=151/2+1e-7,id);
   assert.ok(p.bottom>=-500&&p.top<=10&&p.top>p.bottom,id);
   if(side==='lower')assert.equal(p.bottom,-500);else assert.equal(p.top,10);
   assert.ok(p.tint.every(x=>x>=0&&x<=255));
  }
 }
});
test('pose clock freezes with simulation on pause and death, including moving collision shapes',()=>{
 const m=new FlightModel();m.start({seed:41});m.requestFlap();m.step(1/120);m.pause();
 const p=obstaclePose('seaMonster',120,-100,480,'upper',m.elapsed,0);
 for(let i=0;i<120;i++)m.step(1/120);
 assert.deepEqual(obstaclePose('seaMonster',120,-100,480,'upper',m.elapsed,0),p);
 m.resume();m.y=453;m.requestFlap();m.step(1/120);assert.equal(m.state,'gameOver');
 const t=m.elapsed;for(let i=0;i<120;i++)m.step(1/120);assert.equal(m.elapsed,t);
});
test('cloud/wind and underwater bubble/current layers have visible continuous motion without randomness',()=>{
 for(const theme of ['sky','dragon']){
  const a=sceneMotion(theme,0),b=sceneMotion(theme,.6);
  assert.ok(a.primitives.length>=28);assert.notDeepEqual(a,b);assert.deepEqual(b,sceneMotion(theme,.6));
  for(const p of b.primitives)assert.ok(p.color[3]<160);
 }
 assert.equal(SCENE_MOTION.midSpeed,20);assert.equal(SCENE_MOTION.nearSpeed,42);
});
test('horizontal distances vary and get moderately shorter at high scores, with every transition still safe',()=>{
 const means=[];
 for(const score of [0,35]){
  const f=new ObstacleField();f.reset({seed:51});let generation=4;const distances=[];
  for(let i=0;i<200;i++){
   f.move(3,255);f.recycle(score);const sorted=[...f.gates].sort((a,b)=>a.x-b.x);
   for(let j=1;j<sorted.length;j++)if(sorted[j].generation>generation){
    assert.equal(transitionSafety(sorted[j-1],sorted[j]).safe,true);
    distances.push(sorted[j].x-sorted[j-1].x);
   }
   generation=f.generated;
  }
  assert.ok(new Set(distances.map(x=>Math.round(x))).size>10);
  means.push(distances.reduce((a,b)=>a+b,0)/distances.length);
 }
 assert.ok(means[0]>465&&means[0]<500);assert.ok(means[1]<means[0]-20&&means[1]>390);
});

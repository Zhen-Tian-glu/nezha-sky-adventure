const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FlightModel}=require('../temp/model-tests/gameplay/FlightModel.js');
const {ObstacleField,transitionSafety}=require('../temp/model-tests/gameplay/ObstacleField.js');
const {FLIGHT_CONFIG:C}=require('../temp/model-tests/config/FlightConfig.js');
const {THEMES,OBSTACLES,getCombinations,getDifficulty,OBSTACLE_RULES:R}=require('../temp/model-tests/config/ObstacleConfig.js');
const nextGate=m=>[...m.gates].sort((a,b)=>a.x-b.x).find(g=>g.x+g.width/2>=C.playerX-C.playerRadius);
function fly(m,seconds){for(let i=0;i<seconds/C.fixedStep;i++){
 const target=nextGate(m)?.centerY??0;
 if(m.state==='ready'||m.y<target-40&&m.velocity<0)m.requestFlap();
 m.step(C.fixedStep);assert.equal(m.state,'playing',`seed=${m.field.seed} score=${m.score} failure=${m.failure}`);
}}
test('eight types and exactly twelve legal pairs; forced coverage and collision for every pair',()=>{
 assert.equal(Object.keys(OBSTACLES).length,8);let count=0;
 for(const theme of ['sky','dragon'])for(let index=0;index<getCombinations(theme).length;index++){
  count++;const m=new FlightModel();m.start({theme,seed:19,combinationIndex:index});
  const pair=getCombinations(theme)[index];for(const g of m.gates){assert.equal(g.lower,pair.lower);assert.equal(g.upper,pair.upper)}
  for(const side of [-1,1]){m.start({theme,seed:19,combinationIndex:index});const g=m.gates[0];g.x=C.playerX;m.y=g.centerY+side*g.gapHeight/2;m.requestFlap();m.step(C.fixedStep);assert.equal(m.failure,'obstacle')}
 }
 assert.equal(count,12);assert.throws(()=>new ObstacleField().reset({theme:'dragon',combinationIndex:3}));
});
test('seeded replay produces identical geometry; random runs include both themes',()=>{
 const a=new ObstacleField(),b=new ObstacleField(),themes=new Set();
 for(let seed=1;seed<=100;seed++){a.reset({seed});b.reset({seed});assert.deepEqual(a.gates,b.gates);assert.equal(a.theme,b.theme);themes.add(a.theme)}
 assert.equal(themes.size,2);
});

test('normal restarts draw shuffled pairs so both scenes appear in every two-run block',()=>{
 const f=new ObstacleField(),themes=[];
 for(let i=0;i<100;i++){f.reset();themes.push(f.theme)}
 for(let i=0;i<themes.length;i+=2)assert.equal(new Set(themes.slice(i,i+2)).size,2);
 assert.equal(themes.filter(x=>x==='sky').length,50);
 for(let i=2;i<themes.length;i++)assert.ok(!(themes[i]===themes[i-1]&&themes[i]===themes[i-2]));
});

test('forced or seeded inspection cannot consume the next normal scene; replay geometry matches the recorded theme',()=>{
 const f=new ObstacleField();f.reset();const first=f.theme,seed=f.seed,initial=JSON.stringify(f.gates);
 f.reset({seed,theme:first});assert.equal(JSON.stringify(f.gates),initial);
 f.reset({theme:'dragon',seed:41});f.reset({seed:53});
 f.reset();assert.notEqual(f.theme,first);
 const a=new ObstacleField(),b=new ObstacleField();a.reset({seed:53});b.reset({seed:53,theme:a.theme});assert.deepEqual(a.gates,b.gates);
});
test('20,000 generated gates obey scene, bounds, overlap and maximum-speed reachability constraints',()=>{
 for(const theme of ['sky','dragon'])for(let seed=1;seed<=100;seed++){
  const f=new ObstacleField();f.reset({theme,seed});
  for(let round=0;round<25;round++){
   const sorted=[...f.gates].sort((a,b)=>a.x-b.x);
   sorted.forEach((g,i)=>{
    assert.ok(THEMES[theme].lower.includes(g.lower)&&THEMES[theme].upper.includes(g.upper));
    assert.ok(g.gapHeight>=R.minGap&&g.gapHeight<=R.maxGap);
    assert.ok(g.centerY-g.gapHeight/2>=C.floor+R.boundaryClearance);
    assert.ok(g.centerY+g.gapHeight/2<=C.ceiling-R.boundaryClearance);
    if(i)assert.equal(transitionSafety(sorted[i-1],g).safe,true,JSON.stringify(transitionSafety(sorted[i-1],g)));
   });
   f.move(3,R.maxSpeed);f.recycle([0,5,12,22,35][round%5]);
  }
 }
});
test('pool retains four object identities across recycling and restarting',()=>{
 const f=new ObstacleField();f.reset({seed:10});const objects=[...f.gates];
 for(let i=0;i<100;i++){f.move(2,255);f.recycle(100)}
 assert.ok(f.recycled>90);f.reset({seed:20});assert.equal(f.gates.length,4);
 objects.forEach((g,i)=>assert.equal(f.gates[i],g));
});
test('score waits for full player clearance; each pair scores exactly once',()=>{
 const f=new ObstacleField();f.reset({seed:10});const g=f.gates[0],left=C.playerX-C.playerRadius;
 g.x=left-g.width/2;assert.equal(f.collectScore(left),0);
 g.x-=.01;assert.equal(f.collectScore(left),1);assert.equal(f.collectScore(left),0);
});
test('death before scoring takes priority; pending passed gate cannot award on death',()=>{
 const m=new FlightModel();m.start({seed:1});m.gates[0].x=-300;m.y=C.ceiling-C.playerRadius;m.requestFlap();m.step(C.fixedStep);
 assert.equal(m.state,'gameOver');assert.equal(m.score,0);const frozen=JSON.stringify(m);m.step(1);assert.equal(JSON.stringify(m),frozen);
});
test('difficulty thresholds, speed ramp, upper limit and future-only geometry changes',()=>{
 assert.deepEqual([0,4,5,11,12,21,22,34,35,1000].map(s=>getDifficulty(s).level),[0,0,1,1,2,2,3,3,4,4]);
 const m=new FlightModel();m.start({seed:1});m.score=35;m.requestFlap();const before=m.gates.map(g=>[g.centerY,g.gapHeight,g.lowerWidth,g.upperWidth]);
 m.step(C.fixedStep);assert.ok(Math.abs(m.speed-170-R.speedAcceleration*C.fixedStep)<1e-8);assert.deepEqual(m.gates.map(g=>[g.centerY,g.gapHeight,g.lowerWidth,g.upperWidth]),before);
 fly(m,15);assert.equal(m.speed,255);assert.ok(m.gates.some(g=>g.difficultyLevel===4));
});
test('40 seeded two-theme runs each survive 180 seconds and reach capped difficulty with real tap physics',()=>{
 for(const theme of ['sky','dragon'])for(let seed=1;seed<=20;seed++){
  const m=new FlightModel();m.start({theme,seed});fly(m,180);
  assert.ok(m.score>50);assert.equal(m.speed,255);assert.ok(m.field.recycled>50);
  const snapshot=JSON.stringify(m.gates);m.pause();const score=m.score;for(let j=0;j<100;j++)m.step(C.fixedStep);
  assert.equal(m.score,score);assert.equal(JSON.stringify(m.gates),snapshot);
  m.start({theme,seed});assert.equal(m.score,0);assert.equal(m.speed,170);assert.ok(m.gates.every(g=>!g.scored));
 }
});

test('consecutive openings visibly differ by at least forty pixels at every tier',()=>{
 for(let seed=1;seed<=100;seed++){
  const f=new ObstacleField();f.reset({seed});
  assert.ok(f.gates[0].gapHeight>=395);
  for(let i=0;i<40;i++){
   const gates=[...f.gates].sort((a,b)=>a.x-b.x);
   for(let j=1;j<gates.length;j++)assert.ok(Math.abs(gates[j].gapHeight-gates[j-1].gapHeight)>=40);
   f.move(3,255);f.recycle([0,5,12,22,35][Math.min(4,Math.floor(i/8))]);
  }
 }
});

test('late openings get smaller without exceeding the speed cap or losing relief gates',()=>{
 const values=[];
 for(const score of [0,35]){
  const f=new ObstacleField();f.reset({seed:71});const gaps=[];let generation=4;
  for(let i=0;i<150;i++){
   f.move(3,255);f.recycle(score);
   for(const g of f.gates)if(g.generation>generation)gaps.push(g.gapHeight);
   generation=f.generated;
  }
  values.push(gaps);
 }
 assert.ok(values[0].every(g=>g>=340&&g<=420));
 assert.ok(values[1].every(g=>g>=240&&g<=320));
 assert.ok(Math.min(...values[1])<=250&&Math.max(...values[1])>=310);
 const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
 assert.ok(mean(values[0])-mean(values[1])>80);
 assert.equal(getDifficulty(10000).speed,255);
});

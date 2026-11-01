const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sampleObstacleMotion:sample}=require('../temp/model-tests/gameplay/ObstacleMotion.js');
const {OBSTACLES,getCombinations,MOTION_RULES:R}=require('../temp/model-tests/config/ObstacleConfig.js');
const {FlightModel}=require('../temp/model-tests/gameplay/FlightModel.js');
const round=v=>JSON.parse(JSON.stringify(v,(k,x)=>typeof x==='number'?Math.round(x*1e6)/1e6:x));
test('five distinct animated types change visually; three static types stay identical',()=>{
 let dynamic=0,still=0;
 for(const [id,def]of Object.entries(OBSTACLES)){
  const frames=[0,.19,.43,.85].map(t=>sample(id,80,-500,-180,'lower',t,0).primitives);
  if(def.motion==='static'){still++;frames.forEach(f=>assert.deepEqual(f,frames[0]))}
  else{dynamic++;assert.ok(new Set(frames.map(JSON.stringify)).size>1,id)}
 }
 assert.equal(dynamic,5);assert.equal(still,3);
});
test('all primitive extents including line thickness stay inside danger rectangle at every sampled phase',()=>{
 let samples=0;
 for(const id of Object.keys(OBSTACLES))for(const width of [61,118])for(const height of [90,800])for(const side of ['lower','upper'])for(let tick=0;tick<=120;tick++){
  const f=sample(id,width,-500,-500+height,side,tick/20,3);samples++;
  const b=f.bounds;
  for(const p of f.primitives){
   assert.ok(p.color.every(Number.isFinite));assert.ok(p.color[3]>=0&&p.color[3]<=255);
   const points=p.kind==='circle'?[{x:p.x,y:p.y}]:p.points;
   const padding=p.kind==='circle'?p.radius:p.kind==='stroke'?p.width/2:0;
   for(const point of points){
    assert.ok(point.x-padding>=b.left-1e-8&&point.x+padding<=b.right+1e-8,`${id} horizontal extent`);
    assert.ok(point.y-padding>=b.bottom-1e-8&&point.y+padding<=b.top+1e-8,`${id} vertical extent`);
   }
  }
 }
 assert.equal(samples,7744);
});
test('animation loops are deterministic and changing pool slots offsets the phase',()=>{
 for(const [id,def]of Object.entries(OBSTACLES)){
  const a=sample(id,80,180,480,'upper',.27,2),b=sample(id,80,180,480,'upper',.27,2);
  assert.deepEqual(a,b);
  if(def.period){assert.deepEqual(round(a),round(sample(id,80,180,480,'upper',.27+def.period,2)));assert.notEqual(a.phase,sample(id,80,180,480,'upper',.27,1).phase)}
 }
});
test('lightning bolt never disappears or becomes faint at any animation phase',()=>{
 for(let i=0;i<=200;i++){
  const f=sample('lightning',80,180,480,'upper',i/100,0);
  const bolt=f.primitives.find(p=>p.kind==='polygon');assert.ok(bolt.color[3]>=210);
 }
 assert.equal(R.framesPerSecond,20);
});
test('visual sampling cannot mutate collision geometry, score, random state or clock',()=>{
 const m=new FlightModel();m.start({theme:'sky',seed:42});const before=JSON.stringify(m);
 for(const gate of m.gates)for(let i=0;i<100;i++){
  sample(gate.lower,gate.lowerWidth,-500,gate.centerY-gate.gapHeight/2,'lower',i*.05,gate.slotId);
  sample(gate.upper,gate.upperWidth,gate.centerY+gate.gapHeight/2,480,'upper',i*.05,gate.slotId);
 }
 assert.equal(JSON.stringify(m),before);
});
test('all twelve pairs remain passable at highest difficulty while sampling animations',()=>{
 for(const theme of ['sky','dragon'])for(let index=0;index<getCombinations(theme).length;index++){
  const m=new FlightModel();m.start({theme,seed:27,combinationIndex:index});m.score=35;
  for(let i=0;i<60*120;i++){
   const next=[...m.gates].sort((a,b)=>a.x-b.x).find(g=>g.x+g.width/2>=-228);
   if(m.state==='ready'||m.y<(next?.centerY??0)-40&&m.velocity<0)m.requestFlap();
   m.step(1/120);assert.equal(m.state,'playing',`${theme}/${index}`);
   if(i%6===0)for(const g of m.gates){sample(g.lower,g.lowerWidth,-500,g.centerY-g.gapHeight/2,'lower',m.elapsed,g.slotId);sample(g.upper,g.upperWidth,g.centerY+g.gapHeight/2,480,'upper',m.elapsed,g.slotId)}
  }
  assert.ok(m.score>60);assert.equal(m.speed,255);
 }
});

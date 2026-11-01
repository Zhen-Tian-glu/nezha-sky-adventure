const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FlightModel } = require('../temp/model-tests/gameplay/FlightModel.js');
const { FLIGHT_CONFIG: C } = require('../temp/model-tests/config/FlightConfig.js');
const step = (model, seconds) => { for(let i=0;i<Math.round(seconds/C.fixedStep);i++) model.step(C.fixedStep); };
test('hold rises, release applies gravity and reverses movement',()=>{
 const m=new FlightModel();m.start();m.setPressed(true);step(m,.25);
 assert.ok(m.y>0 && m.velocity>0);
 m.setPressed(false);step(m,.5);assert.ok(m.velocity<0);
});
test('rise and fall speed are capped',()=>{
 const m=new FlightModel();m.start();m.setPressed(true);
 for(let i=0;i<120;i++){m.y=0;m.step(C.fixedStep);assert.ok(m.velocity<=C.maxRiseSpeed);}
 assert.equal(m.velocity,C.maxRiseSpeed);m.setPressed(false);
 for(let i=0;i<180;i++){m.y=0;m.step(C.fixedStep);assert.ok(m.velocity>=-C.maxFallSpeed);}
 assert.equal(m.velocity,-C.maxFallSpeed);
});
test('ceiling contact ends the run and freezes obstacles',()=>{
 const m=new FlightModel();m.start();m.setPressed(true);step(m,2);
 assert.equal(m.failure,'ceiling');assert.equal(m.y,C.ceiling-C.playerRadius);
 const snapshot=JSON.stringify(m);step(m,2);m.setPressed(true);assert.equal(JSON.stringify(m),snapshot);
});
test('floor contact ends the run',()=>{
 const m=new FlightModel();m.start();step(m,2);
 assert.equal(m.failure,'floor');assert.equal(m.y,C.floor+C.playerRadius);
});
test('both upper and lower obstacle bodies collide',()=>{
 for(const sign of [-1,1]){
  const m=new FlightModel();m.start();m.gates[0].x=C.playerX;m.y=sign*200;m.step(C.fixedStep);
  assert.equal(m.failure,'obstacle');assert.equal(m.state,'gameOver');
 }
});
test('center of a gate remains open',()=>{
 const m=new FlightModel();m.start();m.gates[0].x=C.playerX;m.step(C.fixedStep);
 assert.equal(m.state,'playing');
});
test('restart resets every run field and obstacle placement',()=>{
 const m=new FlightModel();m.start();const initial=JSON.stringify(m);step(m,2);m.start();assert.equal(JSON.stringify(m),initial);
});
test('pause clears held input; elapsed time and geometry do not advance; resume needs a new press',()=>{
 const m=new FlightModel();m.start();m.setPressed(true);step(m,.2);m.pause();
 const before=JSON.stringify(m);step(m,10);assert.equal(JSON.stringify(m),before);assert.equal(m.pressed,false);
 m.resume();assert.equal(m.state,'playing');assert.equal(m.pressed,false);
});
test('invalid time values cannot corrupt the simulation',()=>{
 const m=new FlightModel();m.start();const before=JSON.stringify(m);
 for(const dt of [0,-1,NaN,Infinity])m.step(dt);assert.equal(JSON.stringify(m),before);
});
test('basic fixed sequence can be flown repeatedly and recycled without a forced collision',()=>{
 const m=new FlightModel();m.start();
 for(let i=0;i<3600;i++){m.setPressed(m.y < -m.velocity*.15);m.step(C.fixedStep);assert.equal(m.state,'playing');}
 assert.ok(m.elapsed>29);assert.ok(m.gates.every(g=>g.x>-440));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { FlightModel } = require('../temp/model-tests/gameplay/FlightModel.js');
const { FLIGHT_CONFIG: C } = require('../temp/model-tests/config/FlightConfig.js');
const step=(m,seconds)=>{for(let i=0;i<Math.round(seconds/C.fixedStep);i++)m.step(C.fixedStep)};
const ready=()=>{const m=new FlightModel();m.start();return m};
const flying=()=>{const m=ready();m.requestFlap();m.step(C.fixedStep);return m};
test('Ready waits indefinitely; neither gravity nor obstacles start automatically',()=>{
 const m=ready();const before=JSON.stringify(m);step(m,10);assert.equal(JSON.stringify(m),before);
});
test('first click starts the run and produces exactly one impulse',()=>{
 const m=ready();const firstX=m.gates[0].x;m.requestFlap();m.step(C.fixedStep);
 assert.equal(m.state,'playing');assert.equal(m.flapCount,1);assert.equal(m.velocity,C.flapVelocity-C.gravity*C.fixedStep);assert.ok(m.y>0&&m.gates[0].x<firstX);
});
test('one click is followed by continuous gravity without automatic flaps',()=>{
 const m=flying();step(m,.15);assert.ok(m.velocity>0);step(m,.5);assert.ok(m.velocity<0);assert.equal(m.flapCount,1);
});
test('a later click immediately refreshes upward speed even when falling',()=>{
 const m=flying();step(m,.5);assert.ok(m.velocity<0);m.requestFlap();m.step(C.fixedStep);
 assert.equal(m.velocity,C.flapVelocity-C.gravity*C.fixedStep);assert.equal(m.flapCount,2);
});
test('clicks arriving within one fixed step are coalesced, not stacked or replayed',()=>{
 const m=ready();for(let i=0;i<20;i++)m.requestFlap();m.step(C.fixedStep);
 assert.equal(m.flapCount,1);assert.ok(m.velocity<=C.maxRiseSpeed);step(m,.1);assert.equal(m.flapCount,1);
});
test('rapid repeated fresh clicks never add unlimited upward speed',()=>{
 const m=ready();for(let i=0;i<40;i++){m.requestFlap();m.step(C.fixedStep);assert.ok(m.velocity<=C.maxRiseSpeed)}assert.equal(m.flapCount,40);
});
test('gravity enforces maximum falling speed',()=>{
 const m=flying();m.gates=[];
 for(let i=0;i<240;i++){m.y=0;m.step(C.fixedStep);assert.ok(m.velocity>=-C.maxFallSpeed)}assert.equal(m.velocity,-C.maxFallSpeed);
});
test('ceiling collision clamps position and locks the run',()=>{
 const m=ready();m.y=C.ceiling-C.playerRadius-1;m.requestFlap();m.step(C.fixedStep);
 assert.equal(m.failure,'ceiling');assert.equal(m.y,C.ceiling-C.playerRadius);
 const before=JSON.stringify(m);m.requestFlap();step(m,1);assert.equal(JSON.stringify(m),before);
});
test('floor collision clamps position and ends the run',()=>{
 const m=flying();step(m,3);assert.equal(m.failure,'floor');assert.equal(m.y,C.floor+C.playerRadius);
});
test('upper and lower obstacle bodies both collide with the player',()=>{
 for(const y of [-200,200]){const m=ready();m.gates[0].x=C.playerX;m.y=y;m.requestFlap();m.step(C.fixedStep);assert.equal(m.failure,'obstacle')}
});
test('the middle of the fixed gate is passable',()=>{
 const m=ready();m.gates[0].x=C.playerX;m.requestFlap();m.step(C.fixedStep);assert.equal(m.state,'playing');
});
test('restart resets run data, velocity, count, failure, obstacles and pending input',()=>{
 const m=ready();const initial=JSON.stringify(m);m.requestFlap();step(m,3);m.requestFlap();m.start();assert.equal(JSON.stringify(m),initial);step(m,.5);assert.equal(m.state,'ready');
});
test('pause drops queued input, freezes the run and resume does not flap',()=>{
 const m=flying();step(m,.1);m.requestFlap();m.pause();const frozen=JSON.stringify(m);step(m,10);assert.equal(JSON.stringify(m),frozen);
 m.requestFlap();m.resume();const v=m.velocity;const count=m.flapCount;m.step(C.fixedStep);assert.equal(m.flapCount,count);assert.equal(m.velocity,v-C.gravity*C.fixedStep);
});
test('cancellation removes unconsumed input in Ready and Playing',()=>{
 const m=ready();m.requestFlap();m.clearPendingInput();m.step(C.fixedStep);assert.equal(m.state,'ready');assert.equal(m.flapCount,0);
 m.requestFlap();m.step(C.fixedStep);m.requestFlap();m.clearPendingInput();m.step(C.fixedStep);assert.equal(m.flapCount,1);
});
test('invalid time cannot consume a tap or corrupt position',()=>{
 const m=ready();m.requestFlap();const before=JSON.stringify(m);for(const dt of [0,-1,NaN,Infinity])m.step(dt);assert.equal(JSON.stringify(m),before);m.step(C.fixedStep);assert.equal(m.flapCount,1);
});
test('30 seconds of discrete taps can pass the fixed sequence and recycle gates',()=>{
 const m=ready();m.requestFlap();
 for(let i=0;i<3600;i++){if(m.y<-40&&m.velocity<0)m.requestFlap();m.step(C.fixedStep);assert.equal(m.state,'playing')}
 assert.ok(m.elapsed>29&&m.flapCount>30);assert.ok(m.gates.every(g=>g.x>-440));
});

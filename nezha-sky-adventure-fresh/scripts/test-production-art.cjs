const {test}=require('node:test'),assert=require('node:assert/strict');
const {OBSTACLE_MASKS}=require('../temp/model-tests/config/ObstacleMasks.js');
const {OBSTACLE_RECTS,HERO_RECTS,HERO_LAYOUTS,HERO_PRESENTATION}=require('../temp/model-tests/config/ArtManifest.js');
const {heroFrame,layoutScale}=require('../temp/model-tests/gameplay/ArtAnimation.js');
const {hitsArt}=require('../temp/model-tests/gameplay/ArtCollision.js');
const {sampleRichMotion}=require('../temp/model-tests/gameplay/RichObstacleMotion.js');
const {OBSTACLES}=require('../temp/model-tests/config/ObstacleConfig.js');
test('sixteen non-overlapping registered texture rectangles and eight obstacle regions stay in source atlas',()=>{
 assert.equal(HERO_PRESENTATION.source,'nezha_motion_atlas.png');
 HERO_LAYOUTS.forEach((layout,i)=>{assert.ok(Math.abs(layout.width/HERO_RECTS[i][2]-132/(1254/4))<1e-8);assert.ok(Math.abs(layout.height/HERO_RECTS[i][3]-132/(1254/4))<1e-8)});
 assert.equal(HERO_RECTS.length,16);assert.equal(Object.keys(OBSTACLE_RECTS).length,8);
 for(const rect of [...HERO_RECTS,...Object.values(OBSTACLE_RECTS)]){
  const [x,y,w,h]=rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1254&&y+h<=1254);
 }
 for(let i=0;i<16;i++)for(let j=i+1;j<16;j++){
  const a=HERO_RECTS[i],b=HERO_RECTS[j];assert.ok(a[0]+a[2]<=b[0]||b[0]+b[2]<=a[0]||a[1]+a[3]<=b[1]||b[1]+b[3]<=a[1]);
 }
});
test('all silhouette masks contain visible danger and transparent openings; no hidden rectangle fallback',()=>{
 for(const [id,mask]of Object.entries(OBSTACLE_MASKS)){
  assert.equal(mask.length,512);let solid=0,empty=0;
  for(let row=0;row<256;row++)for(let col=0;col<64;col++){
   const set=(mask[row*2+(col>>>5)]>>>(col&31))&1;
   const x=-50+(col+.5)*100/64,y=500-(row+.5)*500/256;
   assert.equal(hitsArt(id,x,y,0,0,100,0,500),!!set);
   if(set)solid++;else empty++;
  }
  assert.ok(solid>500&&empty>500,id);
  assert.equal(hitsArt(id,500,250,28,0,100,0,500),false);
 }
});
test('hero state routing includes four distinct animations and hit finishes without looping',()=>{
 for(let i=0;i<4;i++){
  assert.equal(heroFrame('ready',0,0,i*.28,0,0),i);
  assert.equal(heroFrame('playing',100,0,0,i*.085,0),4+i);
  assert.equal(heroFrame('playing',-100,i*.14,0,0,0),8+i);
  assert.equal(heroFrame('gameOver',0,0,0,0,i*.105),12+i);
 }
 assert.equal(heroFrame('gameOver',0,0,0,0,100),15);
});
test('portrait layout keeps controls inside screen and never stretches gameplay asymmetrically',()=>{
 for(const height of [1000,1250,1334,1500,1623]){
  const s=layoutScale(height);assert.ok(1334*s<=height+1e-6);assert.ok(642*s<height/2);
 }
 assert.equal(layoutScale(1334),1);assert.equal(layoutScale(1623),1);
});
test('enhanced five motions are layered, deterministic, bounded and do not mutate permanent silhouette masks',()=>{
 const before=JSON.stringify(OBSTACLE_MASKS);
 for(const [id,def]of Object.entries(OBSTACLES)){
  const a=sampleRichMotion(id,80,-500,-120,0,0),b=sampleRichMotion(id,80,-500,-120,.37,0);
  if(def.period){assert.ok(a.primitives.length>=5,id);assert.notDeepEqual(a,b);assert.deepEqual(b,sampleRichMotion(id,80,-500,-120,.37,0))}
  else assert.equal(a.primitives.length,0);
  for(let i=0;i<120;i++)for(const p of sampleRichMotion(id,61,-500,-410,i/20,3).primitives){
   const points=p.kind==='circle'?[p]:p.points;
   const pad=p.kind==='circle'?p.radius:p.kind==='stroke'?p.width/2:0;
   for(const q of points)assert.ok(q.x-pad>=-30.5&&q.x+pad<=30.5&&q.y-pad>=-500&&q.y+pad<=-410,id);
  }
 }
 assert.equal(JSON.stringify(OBSTACLE_MASKS),before);
});

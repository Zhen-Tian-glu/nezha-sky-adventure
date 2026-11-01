const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const p=await browser.newPage({viewport:{width:750,height:1334}});
  await p.goto(process.env.GRAYBOX_URL||'http://127.0.0.1:8765',{waitUntil:'networkidle'});
  let ready=false;
  for(let i=0;i<200;i++){
   try{ready=await p.evaluate(async()=>{const cc=await System.import('cc');return !!cc.director.getScene()?.getComponentInChildren('GrayboxGame')?.world})}catch{}
   if(ready)break;await p.waitForTimeout(100);
  }
  if(!ready)throw Error('art review scene did not load');
  await p.evaluate(async()=>{
   const cc=await System.import('cc'),g=cc.director.getScene().getComponentInChildren('GrayboxGame');
   const n=g.makeNode('FrameReview',g.world,750,1334),bg=n.addComponent(cc.Graphics);
   bg.fillColor=new cc.Color(252,246,228);bg.rect(-375,-667,750,1334);bg.fill();
   const names=['待机','上升','下落','受击'];
   for(let i=0;i<16;i++){
    const row=Math.floor(i/4),col=i%4,s=g.makeSprite('Review_'+i,n,170,170);
    s.spriteFrame=g.art.hero[i];g.applyHeroFrame(i);const source=g.heroSprite.node.getComponent(cc.UITransform),target=s.node.getComponent(cc.UITransform);target.setContentSize(source.width*170/132,source.height*170/132);target.setAnchorPoint(source.anchorPoint.x,source.anchorPoint.y);
    s.node.setPosition(-265+col*180,440-row*285);
    g.makeLabel('Caption_'+i,n,names[row]+' '+(col+1),20,-265+col*180,335-row*285,new cc.Color(72,57,45)).node.getComponent(cc.UITransform).setContentSize(150,40);
   }
  });
  await p.waitForTimeout(180);await p.screenshot({path:'docs/verification/'+(process.env.VERIFICATION_PREFIX||'stage-4')+'-character-contact-sheet.png'});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

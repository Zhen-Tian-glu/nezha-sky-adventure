const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'chrome' });
 const results=[];
 for (const size of [{width:750,height:1334},{width:390,height:844}]) {
  const page=await browser.newPage({viewport:size,deviceScaleFactor:1});
  const errors=[]; const logs=[]; const warnings=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{ if(m.type()==='error') { if(m.location().url.endsWith('/favicon.ico')) warnings.push(m.text()+' (favicon.ico only)'); else errors.push(m.text()); } else logs.push(m.text()); });
  await page.goto(process.env.BASELINE_URL || 'http://127.0.0.1:8765',{waitUntil:'networkidle'});
  await page.waitForTimeout(5000);
  const state=await page.evaluate(async()=>{
   const cc=window.cc || (window.System && await window.System.import('cc'));
   const scene=cc?.director?.getScene();
   const labels=scene?scene.getComponentsInChildren(cc.Label).map(l=>({text:l.string,width:l.node.getComponent('cc.UITransform')?.width})):[];
   return {canvas:document.querySelector('canvas')?{width:document.querySelector('canvas').width,height:document.querySelector('canvas').height}:null,scene:scene?.name,labels,design:cc?.view?.getDesignResolutionSize(),visible:cc?.view?.getVisibleSize(),physics:cc?.PhysicsSystem2D?.PHYSICS_BUILTIN};
  });
  await page.screenshot({path:path.join('docs/verification',`baseline-${size.width}x${size.height}.png`)});
  results.push({viewport:size,state,errors,warnings,logs:logs.slice(-8)}); await page.close();
 }
 fs.writeFileSync('docs/verification/browser-results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
 await browser.close();
 if(results.some(r=>r.errors.length || !r.state.scene || !r.state.labels.some(l=>l.text.includes('哪吒今天不闹海')) || r.state.design?.width!==750 || r.state.design?.height!==1334))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});



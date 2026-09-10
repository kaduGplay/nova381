import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 await page.setViewportSize({width,height});await page.goto('http://localhost:5173/inicio',{waitUntil:'networkidle'});await page.screenshot({path:`reference/local-${name}.png`,fullPage:true});
 console.log(name,await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,sections:[...document.querySelectorAll('.landing-section,.search-section,app-download-app-call > div,app-main-footer')].map(el=>({tag:el.tagName,rect:el.getBoundingClientRect().toJSON()}))})));
}
const metrics=[];
for(const name of ['desktop','mobile']){
 const metric=await page.evaluate(async(name)=>{
  async function pixels(path){const img=new Image();img.src=path;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return {width:img.width,height:img.height,data:ctx.getImageData(0,0,img.width,img.height).data};}
  const original=await pixels(`/reference/original-${name}.png`),local=await pixels(`/reference/local-${name}.png`);
  let different=0;let above15=0;const bins={};
  for(let i=0;i<original.data.length;i+=4){const delta=Math.max(...[0,1,2].map(c=>Math.abs(original.data[i+c]-local.data[i+c])));if(delta>0)different++;if(delta>15){above15++;const bin=Math.floor(i/4/original.width/25)*25;bins[bin]=(bins[bin]||0)+1;}}
  return {viewport:name,originalSize:[original.width,original.height],localSize:[local.width,local.height],bins,differentPixels:different,pixelsAbove15:above15,totalPixels:original.width*original.height};
 },name);metrics.push(metric);
}
console.log('visual metrics',metrics);await fs.writeFile('reference/visual-comparison.json',JSON.stringify(metrics,null,2));
console.log('errors',errors);await fs.writeFile('reference/browser-errors.json',JSON.stringify(errors,null,2));await browser.close();

import {chromium} from '@playwright/test';
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
for(const url of ['https://pedagioeletronico.nova381.com/inicio','http://localhost:5173/inicio']){
 await page.goto(url,{waitUntil:'networkidle'});
 console.log(url,await page.locator('.mdc-label,.mdc-checkbox').evaluateAll(els=>els.map(e=>{const s=getComputedStyle(e);return {text:e.textContent,rect:e.getBoundingClientRect().toJSON(),font:s.font,letterSpacing:s.letterSpacing,color:s.color,display:s.display}})));
}
await browser.close();

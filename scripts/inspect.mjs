import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
for(const route of ['inicio','duvidas-frequentes','formulario-isencao']){
 await page.goto('https://pedagioeletronico.nova381.com/'+route,{waitUntil:'networkidle'});
 await fs.writeFile(`reference/${route}.html`,await page.locator('app-root').innerHTML());
 await fs.writeFile(`reference/${route}.css`,await page.locator('style').evaluateAll(es=>es.map(e=>e.textContent).join('\n')));
 console.log(route,(await page.locator('body').first().innerText()).slice(0,16000));
 if(route==='inicio'){
  await page.getByRole('button',{name:'SAIBA MAIS',exact:true}).click();await page.waitForTimeout(300);
  console.log('SAIBA MAIS',page.url(),await page.evaluate(()=>window.scrollY));
  await page.setViewportSize({width:390,height:844});await page.goto('https://pedagioeletronico.nova381.com/inicio',{waitUntil:'networkidle'});await page.screenshot({path:'reference/original-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
 }
}
await browser.close();

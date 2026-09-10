import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch();const page=await browser.newPage();
await fs.mkdir('src/templates',{recursive:true});await fs.mkdir('src/styles',{recursive:true});
const css=new Set();
for(const route of ['inicio','duvidas-frequentes','formulario-isencao','passagens-abertas']){
 const source=await fs.readFile(`reference/${route}.html`,'utf8');
 await page.setContent(source);
 const result=await page.evaluate(()=>{
  document.querySelectorAll('head,meta,title,router-outlet,script').forEach(el=>el.remove());
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_COMMENT);let node;const comments=[];while(node=walk.nextNode())comments.push(node);comments.forEach(n=>n.remove());
  for(const el of document.body.querySelectorAll('*')){
   for(const a of [...el.attributes]){
    if(a.name.startsWith('_ngcontent-')){el.setAttribute(a.name.replace('_ngcontent-','data-s-'),'');el.removeAttribute(a.name)}
    else if(a.name.startsWith('_nghost-')){el.setAttribute(a.name.replace('_nghost-','data-h-'),'');el.removeAttribute(a.name)}
    else if(a.name.startsWith('ng-')||a.name.startsWith('mat-ripple-')||['mat-fab','extended','formcontrolname'].includes(a.name))el.removeAttribute(a.name);
   }
   for(const c of [...el.classList])if(c.startsWith('ng-'))el.classList.remove(c);
   for(const attr of ['src','href']){const value=el.getAttribute(attr);if(value?.includes('assets/'))el.setAttribute(attr,'/assets/'+value.split('assets/')[1]);}
  }
  const home=document.querySelector('app-home-page');
  if(home)return {parts:[...home.querySelectorAll('app-main-header,app-know-more,app-ticket-search-section,app-download-app-call,app-first-steps-tip,app-faq-section,app-how-it-works,app-dfe-information-section,app-road-coverage,app-main-footer')].map(el=>({name:el.tagName.toLowerCase().replace('app-',''),html:el.outerHTML})),html:home.innerHTML};
  return {parts:[],html:document.querySelector('app-faq-page,app-exemption-form,app-ticket-search-page')?.outerHTML||document.body.innerHTML};
 });
 for(const part of result.parts)await fs.writeFile(`src/templates/${part.name}.html`,part.html);
 if(route!=='inicio')await fs.writeFile(`src/templates/${route}.html`,result.html);
 const styles=await fs.readFile(`reference/${route}.css`,'utf8');css.add(styles.replaceAll('_ngcontent-','data-s-').replaceAll('_nghost-','data-h-').replaceAll('./media/','/media/'));
}
await fs.writeFile('src/styles/recovered.css',[...css].join('\n'));
await browser.close();

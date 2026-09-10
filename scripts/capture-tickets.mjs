import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch();const page=await browser.newPage();
// Capture presentation only: no vehicle lookup is sent to the production API.
await page.route('**/portal/**',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route('https://www.google.com/recaptcha/api.js*',route=>route.fulfill({contentType:'application/javascript',body:'window.grecaptcha={ready:cb=>cb(),execute:()=>Promise.resolve("visual-capture-only")};window.ng2recaptchaloaded?.();'}));
await page.goto('https://pedagioeletronico.nova381.com/passagens-abertas?plate=AAA0A00',{waitUntil:'networkidle'});
await fs.writeFile('reference/passagens-abertas.html',await page.locator('app-root').innerHTML());
await fs.writeFile('reference/passagens-abertas.css',await page.locator('style').evaluateAll(es=>es.map(e=>e.textContent).join('\n')));
console.log(await page.locator('body').first().innerText());await browser.close();

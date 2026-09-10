import fs from 'node:fs/promises';
import postcss from 'postcss';
const dir = 'src/templates';
const files = (await fs.readdir(dir)).filter(f => f.endsWith('.html'));
const scopes = new Map();
for (const file of files) {
  const source = await fs.readFile(`${dir}/${file}`, 'utf8');
  for (const match of source.matchAll(/<(app-[\w-]+)[^>]*data-h-(ng-c\d+)/g)) scopes.set(match[2], match[1].replace('app-', ''));
}
scopes.set('ng-c2643072991', 'home-page');
function readableScopes(source) {
  for (const [id, name] of scopes) source = source.replaceAll(`data-s-${id}`, `data-s-${name}`).replaceAll(`data-h-${id}`, `data-h-${name}`);
  return source;
}
for (const file of files) await fs.writeFile(`${dir}/${file}`, readableScopes(await fs.readFile(`${dir}/${file}`, 'utf8')));
await fs.writeFile('src/templates.ts', readableScopes(await fs.readFile('src/templates.ts', 'utf8')));
const root = postcss.parse(readableScopes(await fs.readFile('src/styles/recovered.css', 'utf8')));
// A later copy wins, preserving CSS cascade ordering while removing repeated global rules.
const seen = new Set();
for (const node of [...root.nodes].reverse()) {
  const key = node.toString();
  if (seen.has(key)) node.remove(); else seen.add(key);
}
await fs.writeFile('src/styles/recovered.css', '/* Styles recovered from the public portal. Scope names correspond to src/templates components. */\n'+root.toString());

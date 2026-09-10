"""Capture the public home page and its presentation assets for local use."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
import base64
import hashlib
import html
import json
import re
import subprocess

BASE = 'https://nova381.com/'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/saiba-mais'
ASSETS = OUT / 'assets'
ASSETS.mkdir(parents=True, exist_ok=True)
snapshot = ROOT / 'reference/institutional-source.html'
if not snapshot.exists():
    subprocess.run(['curl', '--fail', '--silent', '--show-error', '-L', '--max-time', '30', '-o', str(snapshot), BASE], check=True)
source = snapshot.read_text()

# Retain only scripts needed for the theme and informational carousel.
scripts = []
def filter_script(match):
    tag = match.group(0)
    if any(f'id="{name}"' in tag or f"id='{name}'" in tag for name in ['jquery-core-js', 'tbx-theme-script-js', 'tbx-mobile-accordion-js', 'tbx-desktop-dropdown-js']):
        scripts.append(tag)
    elif 'data:text/javascript;base64,' in tag:
        encoded = re.search(r'base64,([^\"\']+)', tag)
        if encoded and 'TbxTextSliders' in base64.b64decode(encoded[1]).decode():
            (OUT / 'carousel.js').write_bytes(base64.b64decode(encoded[1]))
            scripts.append('<script defer src="/saiba-mais/carousel.js"></script>')
    return ''
source = re.sub(r'<script\b[^>]*>.*?</script>', filter_script, source, flags=re.S | re.I)
# The footer is followed only by WordPress cookie controls and plugin scaffolding.
source = source[:source.index('</footer>') + len('</footer>')]
source = re.sub(r'<meta\b[^>]*name=[\"\']robots[\"\'][^>]*>', '<meta name="robots" content="noindex,nofollow">', source)
source = re.sub(r'<a\b[^>]*>\s*PAGUE AQUI SUA TARIFA\s*</a>', '<a href="/inicio#search-section" class="hero-cta inline-flex items-center bg-primary-500 text-white px-6 py-3 rounded-md font-bold hover:bg-primary-600 transition-colors" style="position:absolute;top:24px;right:24px;z-index:20">PAGUE AQUI SUA TARIFA</a>', source)
source += '\n' + '\n'.join(scripts) + '</body></html>'

assets = {}
def asset_url(url, base=BASE):
    url = html.unescape(url.strip())
    if not url or url.startswith(('data:', '#', '/saiba-mais/')):
        return url
    full = urljoin(base, url)
    suffix = '.css' if urlparse(full).hostname == 'fonts.googleapis.com' else Path(urlparse(full).path).suffix
    name = hashlib.sha256(full.encode()).hexdigest()[:16] + suffix
    assets[full] = name
    return '/saiba-mais/assets/' + name

class AssetParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        for key in ('src', 'poster'):
            if d.get(key): asset_url(d[key])
        if tag == 'link' and d.get('rel') in ('stylesheet', 'icon', 'apple-touch-icon'):
            asset_url(d['href'])
        if d.get('srcset'):
            for item in d['srcset'].split(','): asset_url(item.strip().split()[0])
AssetParser().feed(source)
for match in re.finditer(r'url\(\s*[\"\']?([^\)\"\']+)', source): asset_url(match[1])

def download(item):
    url, name = item
    target = ASSETS / name
    if not target.exists() or target.suffix == '.css':
        subprocess.run(['curl', '--fail', '--silent', '--show-error', '-L', '--max-time', '120', '--retry', '2', '-o', str(target), url], check=True)
    return url, target

processed = set()
while pending := [(url, name) for url, name in assets.items() if url not in processed]:
    with ThreadPoolExecutor(max_workers=6) as pool:
        downloaded = list(pool.map(download, pending))
    for url, target in downloaded:
        processed.add(url)
        if target.suffix != '.css': continue
        css = target.read_text()
        css = re.sub(r'url\(\s*([\"\']?)([^\)\"\']+)\1\s*\)', lambda m: 'url("' + asset_url(m[2], url) + '")', css)
        target.write_text(css)
for url, name in sorted(assets.items(), key=lambda item: -len(item[0])):
    source = source.replace(url, '/saiba-mais/assets/' + name)
    source = source.replace(html.escape(url, quote=True), '/saiba-mais/assets/' + name)
source = source.replace('href="https://nova381.com/"', 'href="/saiba-mais/index.html"')
source = re.sub(r'href=[\"\']https://pedagioeletronico\.nova381\.com/?[\"\']', 'href="/inicio"', source)
source = source.replace('</head>', '<link rel="stylesheet" href="/saiba-mais/presentation.css"></head>')
source = source.replace('</body>', '<div class="presentation-label" role="note">Cópia para apresentação · <a href="/inicio">Voltar ao início</a></div></body>')
(OUT / 'index.html').write_text(source)
(OUT / 'presentation.css').write_text('.presentation-label{position:fixed;bottom:10px;left:10px;z-index:10000;background:#150f3e;color:white;padding:8px 12px;border-radius:6px;font:13px/1.4 sans-serif;box-shadow:0 2px 8px #0003}.presentation-label a{color:white;text-decoration:underline}\n')
(OUT / 'asset-manifest.json').write_text(json.dumps({'source': BASE, 'captured': '2026-09-09', 'assets': assets}, ensure_ascii=False, indent=2))
print(f'Copied page and {len(assets)} local assets.')

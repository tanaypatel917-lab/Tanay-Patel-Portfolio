from pathlib import Path
import re

source = Path('.hermes-tmp/mauricio-index.js').read_text(encoding='utf-8', errors='replace')
terms = [
    'dither', 'pixel', 'portrait', 'cursor', 'mouse', 'pointer',
    'mousemove', 'pointermove', 'scrollY', 'devicePixelRatio',
    'IntersectionObserver', 'requestAnimationFrame', 'shader', 'uniform',
    'Bayer', 'threshold', 'intro', 'webgl', 'canvas', 'l2='
]

for term in terms:
    matches = list(re.finditer(re.escape(term), source, flags=re.IGNORECASE))
    print(f'\n## {term}: {len(matches)}')
    for match in matches[:8]:
        start = max(0, match.start() - 180)
        end = min(len(source), match.end() + 260)
        snippet = source[start:end].replace('\n', ' ')
        print(snippet)

print('\n## image assets')
for asset in sorted(set(re.findall(r'[A-Za-z0-9_./-]+\.(?:webp|png|jpe?g|avif)', source, flags=re.IGNORECASE))):
    if any(token in asset.lower() for token in ('hero', 'portrait', 'image', 'profile', 'intro', 'juba')):
        print(asset)

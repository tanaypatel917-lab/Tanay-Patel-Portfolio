from pathlib import Path

source = Path('.hermes-tmp/mauricio-index.js').read_text(encoding='utf-8', errors='replace')
start = source.index('function Rm(')
end = source.index('function Nm(', start)
chunk = source[start:end]
for token in (';', '{', '}'):
    chunk = chunk.replace(token, token + '\n')
Path('.hermes-tmp/mauricio-portrait-function.txt').write_text(chunk, encoding='utf-8')
print(len(chunk))

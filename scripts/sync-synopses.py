"""Build bundled synopsis text from the film catalogue; require complete coverage."""
from pathlib import Path
import re,json
r=Path(__file__).resolve().parents[1]
doc=(r/'docs/film-catalogue.md').read_text(); syn={}
for title,body in re.findall(r'^## ([^\n]+)\n\n(.*?)(?=\n## |\n---|\Z)',doc,re.M|re.S):
 body=re.sub(r'\s*\[Film reference\]\(.*','',body.strip());syn[title]=body
tracks=json.loads((r/'programme.json').read_text())['tracks']
assert all(f"{t['title']} ({t['year']})" in syn for t in tracks)
(r/'assets/synopses.js').write_text('window.OFFSCREEN_SYNOPSES='+json.dumps(syn)+';\n')

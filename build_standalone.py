from pathlib import Path
b=Path(__file__).resolve().parent
pub=b/'public'
s=(pub/'index.html').read_text()
for fn in ['volumetric-lab.css','clinical-pathway.css','desktop-suite.css']:
    s=s.replace('<link rel="stylesheet" href="'+fn+'"/>','<style>\n'+(pub/fn).read_text()+'\n</style>')
for fn in ['engine.js','fallback.js','app.js','ai-ui.js','video-guide.js','volumetric-lab.js','clinical-pathway.js','desktop-suite.js','xr-procedure.js','babylon-anatomy.js','dental-appearance.js','dental-structures.js','real-dental-scene.js','babylon-preview.js','dundee-atlas.js']:
    s=s.replace('<script src="'+fn+'"></script>','<script>\n'+(pub/fn).read_text().replace('</script>','<\\/script>')+'\n</script>')
out=b/'KlinikLab_DesktopXR_Standalone.html'
out.write_text(s)
print('Generated',out, out.stat().st_size)
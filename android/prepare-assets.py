"""Bundle the radio UI and data, never media or remotely executable code."""
import pathlib, re, shutil, sys
root = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
html = (root / 'index.html').read_text()
# Android owns playback. The shared UI still provides all drawing and dial gestures.
html = html.replace('setInterval(tick,500);tick();', 'tick();')
html = html.replace('</body>', '<script src="android-bridge.js"></script></body>')
html = html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; media-src \'none\'; connect-src \'none\'; frame-src \'none\'; object-src \'none\'">')
(out / 'index.html').write_text(html)
(out / 'config.js').write_text('window.CINEMA_RADIO_MEDIA_BASE_URL="https://cinema-radio-media.maxpfennighaus.workers.dev/";\n')
for name in ['theme.js', 'programme.json', 'stations.json', 'LICENSE', 'NOTICE.md']:
    shutil.copyfile(root / name, out / name)
for name in ['fonts', 'vendor']:
    shutil.copytree(root / 'assets' / name, out / 'assets' / name, dirs_exist_ok=True)
for source in list((root / 'assets').glob('*.svg')) + [root / 'assets' / name for name in ['synopses.js', 'film-info.js', 'film-info.css']]:
    (out / 'assets').mkdir(exist_ok=True); shutil.copyfile(source, out / 'assets' / source.name)
(out / 'assets' / 'sharing').mkdir(exist_ok=True)
for name in ['favicon.svg', 'favicon.ico', 'icon-180.png']:
    shutil.copyfile(root / 'assets' / 'sharing' / name, out / 'assets' / 'sharing' / name)
shutil.copyfile(root / 'android/web/android-bridge.js', out / 'android-bridge.js')

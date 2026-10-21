"""Package only the files needed to serve Nimbus from any URL subdirectory."""
from pathlib import Path
import os
import shutil

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
PHASER = ROOT / 'node_modules/phaser'
ENGINE_IMPORT = '/node_modules/phaser/dist/phaser.esm.js'


def build():
    engine = PHASER / 'dist/phaser.esm.min.js'
    if not engine.is_file():
        raise SystemExit('Phaser is missing. Run pnpm install --frozen-lockfile first.')
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copy2(ROOT / 'index.html', DIST / 'index.html')
    shutil.copytree(ROOT / 'assets', DIST / 'assets')
    shutil.copytree(ROOT / 'src', DIST / 'src', ignore=shutil.ignore_patterns('dev', '__pycache__', '.DS_Store'))
    vendor = DIST / 'vendor'
    vendor.mkdir()
    shutil.copy2(engine, vendor / 'phaser.esm.js')
    shutil.copy2(PHASER / 'LICENSE.md', vendor / 'PHASER-LICENSE.md')
    for path in (DIST / 'src').rglob('*.js'):
        content = path.read_text()
        if ENGINE_IMPORT in content:
            # Keep local development imports unchanged; ship the minified engine.
            relative = Path(os.path.relpath(vendor / 'phaser.esm.js', path.parent)).as_posix()
            content = content.replace(ENGINE_IMPORT, relative)
        if path == DIST / 'src/main.js':
            content = content.replace("import { startDevReload } from './dev/dev-reload.js';\n", '')
            content = content.replace('startDevReload();\n', '')
        path.write_text(content)
    (DIST / '.nojekyll').touch()
    print('Built dist/: static game, catalogs, icons, and minified Phaser.')


if __name__ == '__main__':
    build()

"""Verify that deployed resources resolve inside the artifact at / and /nimbus/."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

DIST = Path(__file__).resolve().parent.parent / 'dist'
IMPORT = re.compile(r'''(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])([^'"]+)\1''')
DATA_URL = re.compile(r'''new URL\(['"]([^'"]+)['"],\s*import.meta.url\)''')


def check_reference(base, reference, prefix):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or reference.startswith('#'):
        return
    resolved = urlsplit(urljoin(base, reference)).path
    if not resolved.startswith(prefix):
        raise AssertionError(f'Resource escapes deployment path: {base} -> {reference}')
    relative = resolved[len(prefix):] or 'index.html'
    if not (DIST / relative).is_file():
        raise AssertionError(f'Missing deployed resource: {base} -> {reference}')


class PageReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []

    def handle_starttag(self, tag, attributes):
        for name, value in attributes:
            if value and (name == 'src' or (name == 'href' and tag in ('a', 'link'))):
                self.references.append(value)


def check():
    page = PageReferences()
    page.feed((DIST / 'index.html').read_text())
    for prefix in ('/', '/nimbus/'):
        base = f'https://example.test{prefix}'
        for reference in page.references:
            check_reference(base, reference, prefix)
        for path in (DIST / 'src').rglob('*.js'):
            code = path.read_text()
            module_url = base + path.relative_to(DIST).as_posix()
            for _, reference in IMPORT.findall(code):
                check_reference(module_url, reference, prefix)
            for reference in DATA_URL.findall(code):
                check_reference(module_url, reference, prefix)
        # Follow every manifest entry and validate its page-relative icon.
        for manifest_path in (DIST / 'src/content').glob('*/index.json'):
            manifest = json.loads(manifest_path.read_text())
            manifest_url = base + manifest_path.relative_to(DIST).as_posix()
            for reference in manifest['files']:
                check_reference(manifest_url, reference, prefix)
                definition = json.loads((manifest_path.parent / reference).read_text())
                if definition.get('icon'):
                    check_reference(base, definition['icon'], prefix)
    assert not (DIST / 'src/dev').exists(), 'Development polling must not ship'
    assert 'startDevReload' not in (DIST / 'src/main.js').read_text()
    assert not (DIST / 'node_modules').exists(), 'Ship only the curated engine asset'
    print('Passed: HTML, module, catalog, and icon paths at / and /nimbus/; development code excluded.')


if __name__ == '__main__':
    check()

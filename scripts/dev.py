"""Dependency-free local preview. Not a production server."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__dev_revision':
            files = [ROOT / 'index.html', *sorted((ROOT / 'src').rglob('*'))]
            revision = '|'.join(f'{p.relative_to(ROOT)}:{p.stat().st_mtime_ns}' for p in files if p.is_file())
            body = revision.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', 5173), Handler)
    print('Nimbus preview: http://localhost:5173', flush=True)
    print('Mobile: use http://<this-computer-LAN-IP>:5173 on the same Wi-Fi.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

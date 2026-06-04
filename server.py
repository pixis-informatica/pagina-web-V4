#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════╗
║   PIXIS LIVE EDITOR — Servidor local de guardado             ║
║   Uso: python server.py                                      ║
║   Luego abrir: http://localhost:8080/index.html?edit=true    ║
╚══════════════════════════════════════════════════════════════╝
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class PixisHandler(http.server.SimpleHTTPRequestHandler):
    """Sirve archivos estáticos + maneja el guardado de JSON."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def log_message(self, format, *args):
        # Logging personalizado con colores
        now = datetime.now().strftime('%H:%M:%S')
        msg = format % args
        method_color = '\033[92m' if '200' in msg else '\033[91m' if '40' in msg else '\033[93m'
        print(f'\033[90m[{now}]\033[0m {method_color}{msg}\033[0m')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        # ── ENDPOINT: guardar JSON ──────────────────────────────
        if parsed.path == '/api/save-json':
            params = urllib.parse.parse_qs(parsed.query)
            file_param = params.get('file', [''])[0]

            # Validar que solo se guarden archivos en data/
            if not file_param.startswith('data/') or '..' in file_param:
                self._respond(403, {'error': 'Ruta no permitida'})
                return

            # Leer body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
            except json.JSONDecodeError as e:
                self._respond(400, {'error': f'JSON inválido: {e}'})
                return

            # Construir ruta absoluta
            target_path = os.path.join(BASE_DIR, file_param.replace('/', os.sep))

            # Crear directorio si no existe
            os.makedirs(os.path.dirname(target_path), exist_ok=True)

            # Guardar con backup
            if os.path.exists(target_path):
                backup_path = target_path + '.bak'
                os.replace(target_path, backup_path)

            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            size = os.path.getsize(target_path)
            print(f'\033[92m  ✅ Guardado: {file_param} ({size} bytes)\033[0m')

            self._respond(200, {
                'ok': True,
                'file': file_param,
                'size': size,
                'timestamp': datetime.now().isoformat()
            })
            return

        self._respond(404, {'error': 'Ruta no encontrada'})

    def _respond(self, status, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        # Headers de seguridad básicos
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


def main():
    print('\033[95m')
    print('╔══════════════════════════════════════════════════════╗')
    print('║         🟣 PIXIS LIVE EDITOR — Servidor Local        ║')
    print('╚══════════════════════════════════════════════════════╝')
    print('\033[0m')
    print(f'  \033[92m✅ Servidor corriendo en:\033[0m http://localhost:{PORT}')
    print(f'  \033[93m🎨 Modo edición:\033[0m   http://localhost:{PORT}/index.html?edit=true')
    print(f'  \033[96m🌐 Modo normal:\033[0m    http://localhost:{PORT}/index.html')
    print()
    print(f'  \033[90mDirectorio: {BASE_DIR}\033[0m')
    print(f'  \033[90mPresioná Ctrl+C para detener el servidor\033[0m')
    print()

    with socketserver.TCPServer(('', PORT), PixisHandler) as httpd:
        httpd.allow_reuse_address = True
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\033[91m  🛑 Servidor detenido\033[0m')


if __name__ == '__main__':
    main()

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   PIXIS LIVE EDITOR — Servidor local Node.js                 ║
 * ║   Uso: node server.js                                        ║
 * ║   Luego abrir: http://localhost:8080/index.html?edit=true    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');
const nodemailer = require('nodemailer'); // Motor de correos

const PORT    = 8080;
const BASE    = __dirname;

// CONFIGURACIÓN DE SEGURIDAD
const ADMIN_CONFIG = {
  user: 'pixis',
  pass: '12345@',
  twoFactorSecret: 'PIXIS777SAFECODE',
  recoveryEmail: 'pixisinformatica.contacto@gmail.com',
  // CONFIGURACIÓN GMAIL (Se recomienda usar Contraseña de Aplicación)
  smtp: {
    service: 'gmail',
    auth: {
      user: 'pixisinformatica.contacto@gmail.com',
      pass: 'yqvmurocfzytezvg' // Clave de App generada por el usuario
    }
  },
  sessionActive: false
};

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.mp4':  'video/mp4',
};

const server = http.createServer((req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── CORS headers ──────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  // ── FUNCIÓN DE VERIFICACIÓN DE SEGURIDAD ───────────────────
  const isAuthorized = () => {
    // En un entorno local, esto es simple. En producción, usaríamos cookies/tokens.
    return ADMIN_CONFIG.sessionActive;
  };

  // ── ACTUALIZACIÓN AUTOMÁTICA DE VERSIONADO ───────────────────
  const bumpVersionalizador = () => {
    try {
      const indexPath = path.join(BASE, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const html = fs.readFileSync(indexPath, 'utf-8');
      
      let nextVersion = "";

      // 1. Identificar la versión actual del script para calcular la siguiente
      // Capturamos cualquier cosa después de ?v= hasta el final de la comilla
      const jsMatch = html.match(/js\/versionalizador\.js\?v=([^"'\s>]+)/i);
      
      if (jsMatch) {
        const versionStr = jsMatch[1];
        let parts = versionStr.split('.');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          let major = parseInt(parts[0], 10);
          let minor = parseInt(parts[1], 10) + 1;
          nextVersion = `${major}.${minor}`;
        } else {
          // Si es un número plano, lo tratamos como decimal
          let current = parseFloat(versionStr) || 1.0;
          nextVersion = (current + 0.1).toFixed(1);
        }
      } else {
        nextVersion = "1.1"; 
      }

      // 2. Reemplazo ultra-robusto: Capturamos todo hasta la comilla de cierre
      // Esto asegura limpiar tanto números largos como versiones con puntos.
      let newHtml = html.replace(
        /js\/versionalizador\.js\?v=[^"'\s>]+/gi,
        `js/versionalizador.js?v=${nextVersion}`
      );
      
      newHtml = newHtml.replace(
        /css\/style\.css\?v=[^"'\s>]+/gi,
        `css/style.css?v=${nextVersion}`
      );
      
      newHtml = newHtml.replace(
        /css\/lightmode\.css\?v=[^"'\s>]+/gi,
        `css/lightmode.css?v=${nextVersion}`
      );

      if (html !== newHtml) {
        fs.writeFileSync(indexPath, newHtml, 'utf-8');
        const now = new Date().toLocaleTimeString('es-AR');
        console.log(`  \x1b[36m🔄 [${now}] Cache Busting: v${nextVersion} aplicado a JS y CSS\x1b[0m`);
      }
    } catch (e) {
      console.error('  \x1b[31m❌ Error en bumpVersionalizador:\x1b[0m', e.message);
    }
  };

  // ── POST /api/login (Paso 1: Usuario/Pass) ────────────────
  if (req.method === 'POST' && pathname === '/api/login') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { user, pass } = JSON.parse(body);
        if (user === ADMIN_CONFIG.user && pass === ADMIN_CONFIG.pass) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, message: 'Password OK. Pendiente 2FA.' }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Credenciales inválidas' }));
        }
      } catch (e) {
        res.writeHead(400); res.end();
      }
    });
    return;
  }

  // ── POST /api/verify-2fa (Paso 2: Código QR/Token) ────────
  if (req.method === 'POST' && pathname === '/api/verify-2fa') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        const crypto = require('crypto');
        const secret = ADMIN_CONFIG.twoFactorSecret;

        const decodeBase32 = (str) => {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          let bin = '';
          for (let i = 0; i < str.length; i++) {
            let val = alphabet.indexOf(str[i].toUpperCase());
            if (val === -1) continue;
            bin += val.toString(2).padStart(5, '0');
          }
          const buf = [];
          for (let i = 0; i < bin.length; i += 8) {
            if (i + 8 <= bin.length) buf.push(parseInt(bin.substr(i, 8), 2));
          }
          return Buffer.from(buf);
        };

        const verifyTOTP = (inputToken, secretStr) => {
          const key = decodeBase32(secretStr);
          const epoch = Math.floor(Date.now() / 1000);
          const time = Math.floor(epoch / 30);
          for (let i = -1; i <= 1; i++) {
            const timeStep = Buffer.alloc(8);
            let t = BigInt(time + i);
            for (let j = 7; j >= 0; j--) {
              timeStep[j] = Number(t & 0xffn);
              t >>= 8n;
            }
            const hmac = crypto.createHmac('sha1', key).update(timeStep).digest();
            const offset = hmac[hmac.length - 1] & 0xf;
            const code = ((hmac[offset] & 0x7f) << 24 |
                          (hmac[offset + 1] & 0xff) << 16 |
                          (hmac[offset + 2] & 0xff) << 8 |
                          (hmac[offset + 3] & 0xff)) % 1000000;
            if (code.toString().padStart(6, '0') === inputToken.replace(/\s/g, '')) return true;
          }
          return false;
        };

        if (verifyTOTP(token, secret) || (ADMIN_CONFIG.recoveryCode && token === ADMIN_CONFIG.recoveryCode)) {
          ADMIN_CONFIG.sessionActive = true;
          if (token === ADMIN_CONFIG.recoveryCode) ADMIN_CONFIG.recoveryCode = null;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, session: 'active' }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Código 2FA incorrecto' }));
        }
      } catch (e) {
        console.error('Error en verify-2fa:', e);
        res.writeHead(400); res.end();
      }
    });
    return;
  }

  // ── POST /api/update-admin (Cambiar usuario/pass desde el Editor) ──
  if (req.method === 'POST' && pathname === '/api/update-admin') {
    if (!isAuthorized()) {
      res.writeHead(403); res.end(); return;
    }
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { user, pass, recoveryEmail } = JSON.parse(body);
        if (user) ADMIN_CONFIG.user = user;
        if (pass) ADMIN_CONFIG.pass = pass;
        if (recoveryEmail) ADMIN_CONFIG.recoveryEmail = recoveryEmail;
        
        console.log(`  \x1b[33m🔐 [ADMIN] Credenciales y Email actualizados\x1b[0m`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400); res.end();
      }
    });
    return;
  }

  // ── POST /api/request-recovery (Generar código de emergencia) ──
  if (req.method === 'POST' && pathname === '/api/request-recovery') {
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
    ADMIN_CONFIG.recoveryCode = recoveryCode;
    
    const now = new Date().toLocaleTimeString('es-AR');
    console.log(`\n\x1b[41m\x1b[37m 📧 [RECUPERACIÓN] [${now}] \x1b[0m`);
    console.log(`\x1b[33m CÓDIGO GENERADO: ${recoveryCode}\x1b[0m`);

    // Intentar enviar el mail de verdad
    if (ADMIN_CONFIG.smtp.auth.pass !== 'TU_PASSWORD_DE_APP_AQUI') {
      const transporter = nodemailer.createTransport(ADMIN_CONFIG.smtp);
      const mailOptions = {
        from: `"Seguridad Pixis" <${ADMIN_CONFIG.smtp.auth.user}>`,
        to: ADMIN_CONFIG.recoveryEmail,
        subject: `⚠️ Código de Recuperación de Acceso - Pixis`,
        text: `Hola, tu código de acceso de emergencia es: ${recoveryCode}. Este código es de un solo uso.`,
        html: `
          <div style="font-family: sans-serif; background: #0a0a0f; color: #fff; padding: 40px; border-radius: 20px; text-align: center;">
            <h2 style="color: #f5c518;">⚠️ Acceso de Emergencia</h2>
            <p>Se ha solicitado un código para entrar al editor de Pixis.</p>
            <div style="font-size: 32px; font-weight: bold; background: #222; padding: 20px; border-radius: 10px; color: #ffd700; margin: 20px 0; letter-spacing: 5px;">
              ${recoveryCode}
            </div>
            <p style="color: #888; font-size: 12px;">Si no fuiste tú, cambia tu contraseña de inmediato.</p>
          </div>`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`\x1b[31m ❌ Error al enviar mail: ${error.message}\x1b[0m`);
        } else {
          console.log(`\x1b[32m ✅ Mail enviado a: ${ADMIN_CONFIG.recoveryEmail}\x1b[0m\n`);
        }
      });
    } else {
      console.log(`\x1b[31m ⚠️ Mail NO enviado: Falta configurar la "Contraseña de Aplicación".\x1b[0m\n`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Código generado' }));
    return;
  }

  // 🛡️ PROTECCIÓN DE ESCRITURA: Bloquear si no hay sesión activa
  const writeMethods = ['/api/save-all', '/api/save-json', '/api/upload-image'];
  if (writeMethods.includes(pathname) && !isAuthorized()) {
    console.error(`  \x1b[31m🛡️ BLOQUEO: Intento de escritura sin sesión activa en ${pathname}\x1b[0m`);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acceso denegado. Debes iniciar sesión con 2FA.' }));
    return;
  }

  // ── POST /api/save-all (guarda site+products+categories+ui de una vez) ──
  if (req.method === 'POST' && pathname === '/api/save-all') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const allowed = ['site', 'products', 'categories', 'ui'];
        const saved = [];

        // 🔢 Auto-bump cacheVersion en site.json con cada guardado
        // Esto garantiza que el navegador siempre cargue cart.js y state.js frescos.
        const newVersion = Date.now();
        if (payload.site) {
          payload.site.cacheVersion = newVersion;
        } else {
          // Si site no viene en el payload, lo cargamos y actualizamos solo la versión
          try {
            const siteFilePath = path.join(BASE, 'data', 'site.json');
            const siteData = JSON.parse(fs.readFileSync(siteFilePath, 'utf-8'));
            siteData.cacheVersion = newVersion;
            if (fs.existsSync(siteFilePath)) fs.copyFileSync(siteFilePath, siteFilePath + '.bak');
            fs.writeFileSync(siteFilePath, JSON.stringify(siteData, null, 2), 'utf-8');
            saved.push('data/site.json (version bump)');
          } catch(e) { /* ignorar si falla */ }
        }

        allowed.forEach(key => {
          if (payload[key] === undefined) return;
          const filePath = path.join(BASE, 'data', `${key}.json`);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          if (fs.existsSync(filePath)) fs.copyFileSync(filePath, filePath + '.bak');
          fs.writeFileSync(filePath, JSON.stringify(payload[key], null, 2), 'utf-8');
          saved.push(`data/${key}.json`);
        });

        const now = new Date().toLocaleTimeString('es-AR');
        console.log(`  \x1b[32m✅ [${now}] /api/save-all → ${saved.join(', ')} [v${newVersion}]\x1b[0m`);

        bumpVersionalizador();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, saved, cacheVersion: newVersion, timestamp: new Date().toISOString() }));
      } catch (e) {
        console.error(`  \x1b[31m❌ Error en /api/save-all: ${e.message}\x1b[0m`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /api/save-json ───────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/save-json') {
    const fileParam = (parsed.query.file || '').replace(/\\/g, '/');

    // Seguridad: solo archivos en data/
    if (!fileParam.startsWith('data/') || fileParam.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ruta no permitida' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const targetPath = path.join(BASE, ...fileParam.split('/'));

        // Asegurar que existe el directorio
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        // Backup del archivo anterior
        if (fs.existsSync(targetPath)) {
          fs.copyFileSync(targetPath, targetPath + '.bak');
        }

        // 🔢 Auto-bump cacheVersion: si se guarda cualquier JSON de datos,
        // actualizamos la versión en site.json para forzar recarga de scripts.
        const newVersion = Date.now();
        if (fileParam === 'data/site.json') {
          // Si es site.json mismo, le metemos la versión directamente
          data.cacheVersion = newVersion;
        } else {
          // Si es otro archivo (products, categories, ui), bumpeamos site.json aparte
          try {
            const siteFilePath = path.join(BASE, 'data', 'site.json');
            const siteData = JSON.parse(fs.readFileSync(siteFilePath, 'utf-8'));
            siteData.cacheVersion = newVersion;
            if (fs.existsSync(siteFilePath)) fs.copyFileSync(siteFilePath, siteFilePath + '.bak');
            fs.writeFileSync(siteFilePath, JSON.stringify(siteData, null, 2), 'utf-8');
          } catch(e) { /* ignorar si falla el bump */ }
        }

        // Guardar
        fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
        const size = fs.statSync(targetPath).size;

        const now = new Date().toLocaleTimeString('es-AR');
        console.log(`  \x1b[32m✅ [${now}] Guardado: ${fileParam} (${size} bytes) [v${newVersion}]\x1b[0m`);

        bumpVersionalizador();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: fileParam, size, cacheVersion: newVersion, timestamp: new Date().toISOString() }));

      } catch (e) {
        console.error(`  \x1b[31m❌ Error al guardar: ${e.message}\x1b[0m`);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /api/upload-image (guarda imágenes en img/) ──────────
  if (req.method === 'POST' && pathname === '/api/upload-image') {
    const filename = (parsed.query.filename || `upload-${Date.now()}.jpg`).replace(/\\/g, '/');
    const folder   = (parsed.query.folder || 'img/uploads').replace(/\\/g, '/');

    // Seguridad: solo carpeta img/
    if (!folder.startsWith('img') || folder.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Carpeta no permitida' }));
      return;
    }

    let chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const targetPath = path.join(BASE, ...folder.split('/'), filename);

        // Asegurar directorio
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        // Guardar
        fs.writeFileSync(targetPath, buffer);
        
        const relativePath = `${folder}/${filename}`;
        const now = new Date().toLocaleTimeString('es-AR');
        console.log(`  \x1b[35m📸 [${now}] Imagen subida: ${relativePath}\x1b[0m`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: relativePath }));

      } catch (e) {
        console.error(`  \x1b[31m❌ Error en upload: ${e.message}\x1b[0m`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /api/delete-image (elimina archivos físicos en img/) ──────────
  if (req.method === 'POST' && pathname === '/api/delete-image') {
    if (!isAuthorized()) {
      res.writeHead(403); res.end(); return;
    }
    
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { url: relativePath } = JSON.parse(body);
        if (!relativePath || !relativePath.startsWith('img/') || relativePath.includes('..')) {
          res.writeHead(400); res.end(JSON.stringify({ error: 'Ruta inválida' }));
          return;
        }

        const fullPath = path.join(BASE, ...relativePath.split('/'));
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          const now = new Date().toLocaleTimeString('es-AR');
          console.log(`  \x1b[31m🗑️ [${now}] Imagen eliminada: ${relativePath}\x1b[0m`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Archivo no encontrado' }));
        }
      } catch (e) {
        console.error(`  \x1b[31m❌ Error en delete: ${e.message}\x1b[0m`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── Servir archivos estáticos ───────────────────────────────
  let safePath = pathname === '/' ? '/index.html' : pathname;

  // Decodificar URL (maneja espacios en nombres de archivo)
  try { safePath = decodeURIComponent(safePath); } catch (e) {}

  // Prevenir path traversal
  const fullPath = path.join(BASE, safePath);
  if (!fullPath.startsWith(BASE)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 - No encontrado: ${safePath}`);
      } else {
        res.writeHead(500); res.end('Error interno');
      }
      return;
    }

    const ext  = path.extname(safePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\x1b[95m');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║        🟣 PIXIS LIVE EDITOR — Servidor Local         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\x1b[0m');
  console.log(`  \x1b[92m✅ Servidor en:\x1b[0m          http://localhost:${PORT}`);
  console.log(`  \x1b[93m🎨 Modo edición:\x1b[0m         http://localhost:${PORT}/index.html?edit=true`);
  console.log(`  \x1b[96m🌐 Modo producción:\x1b[0m      http://localhost:${PORT}/index.html`);
  console.log();
  console.log(`  \x1b[90mDirectorio: ${BASE}\x1b[0m`);
  console.log(`  \x1b[90mCtrl+C para detener\x1b[0m`);
  console.log();
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\x1b[31m❌ El puerto ${PORT} ya está en uso. Cerrá otro servidor primero.\x1b[0m`);
  } else {
    console.error(`\x1b[31m❌ Error: ${e.message}\x1b[0m`);
  }
  process.exit(1);
});

<?php
/**
 * og-image.php — Generador de imágenes OG 1200×630 para Facebook/WhatsApp
 * Centra la imagen del producto sobre un fondo oscuro con márgenes,
 * de forma que siempre salga 1200×630 sin recortar nada.
 *
 * Uso: og-image.php?src=img/productos/foto.jpg
 */

// ─── Seguridad: solo permitir rutas relativas al proyecto ────────────────────
$src = isset($_GET['src']) ? trim($_GET['src']) : '';

// Sanitizar: eliminar ../ y caracteres peligrosos
$src = preg_replace('/\.\./', '', $src);
$src = ltrim($src, '/\\');
$src = str_replace('\\', '/', $src);

if ($src === '') {
    http_response_code(400);
    exit('No se especificó imagen.');
}

// Ruta física en el servidor
$abs_path = __DIR__ . '/' . $src;

if (!file_exists($abs_path) || !is_file($abs_path)) {
    // Fallback a imagen genérica del sitio
    $abs_path = __DIR__ . '/img/TECH24.png';
    if (!file_exists($abs_path)) {
        http_response_code(404);
        exit('Imagen no encontrada.');
    }
}

// ─── Cache en disco ──────────────────────────────────────────────────────────
$cache_dir = __DIR__ . '/cache';
$cache_hash = md5($src . filemtime($abs_path));
$cache_file = $cache_dir . '/og_' . $cache_hash . '.jpg';

if (file_exists($cache_file)) {
    // Servir desde el archivo de cache estático (Cero delay para Facebook/bots)
    $cache_seconds = 86400 * 7; // Cachear por 7 días
    $last_modified  = filemtime($cache_file);
    $etag           = '"' . md5($cache_file . $last_modified) . '"';

    // ETag + Last-Modified — Facebook los usa para detectar si la imagen cambió
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=' . $cache_seconds);
    header('Expires: '       . gmdate('D, d M Y H:i:s', time() + $cache_seconds) . ' GMT');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $last_modified) . ' GMT');
    header('ETag: '          . $etag);
    readfile($cache_file);
    exit;
}

// ─── Verificar que GD esté disponible ────────────────────────────────────────
if (!function_exists('imagecreatetruecolor')) {
    // Sin GD: redirigir a la imagen original
    header('Location: /' . $src, true, 302);
    exit;
}

// ─── Cargar imagen fuente ─────────────────────────────────────────────────────
$ext = strtolower(pathinfo($abs_path, PATHINFO_EXTENSION));

$src_img = null;
switch ($ext) {
    case 'jpg': case 'jpeg':
        $src_img = @imagecreatefromjpeg($abs_path); break;
    case 'png':
        $src_img = @imagecreatefrompng($abs_path);  break;
    case 'webp':
        $src_img = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($abs_path) : null; break;
    case 'gif':
        $src_img = @imagecreatefromgif($abs_path);  break;
}

if (!$src_img) {
    // No se pudo cargar → redirigir a original
    header('Location: /' . $src, true, 302);
    exit;
}

// ─── Dimensiones del canvas OG (Facebook recomienda 1200×630) ─────────────────
$OG_W = 1200;
$OG_H = 630;

// ─── Crear canvas ─────────────────────────────────────────────────────────────
$canvas = imagecreatetruecolor($OG_W, $OG_H);

// Fondo: color oscuro corporativo #0d0d0d
$bg_color = imagecolorallocate($canvas, 13, 13, 13);
imagefill($canvas, 0, 0, $bg_color);

$sw = imagesx($src_img);
$sh = imagesy($src_img);

// ─── Detectar si es banner panorámico o imagen de producto ────────────────────
// Ratio del canvas: 1200/630 ≈ 1.905
// Si la imagen fuente es más ancha (ratio >= 1.6), es un banner panorámico:
//   → modo COVER: la imagen llena todo el canvas (recorte centrado, sin bordes negros)
// Si es producto (cuadrado o vertical): modo CONTAIN centrado con padding y borde
$img_ratio    = ($sh > 0) ? ($sw / $sh) : 1;
$canvas_ratio = $OG_W / $OG_H; // ~1.905
$is_banner    = ($img_ratio >= 1.6); // panorámica → banner

imagealphablending($canvas, true);
imagesavealpha($canvas, false);

if ($is_banner) {
    // ── MODO COVER: la imagen llena todo el canvas 1200×630 ──────────────────
    // Escalar para que ambos lados cubran el canvas (tomar el ratio mayor)
    $scale    = max($OG_W / $sw, $OG_H / $sh);
    $scaled_w = (int)round($sw * $scale);
    $scaled_h = (int)round($sh * $scale);

    // Posición fuente para recorte centrado
    $src_x = (int)round(($scaled_w - $OG_W) / 2 / $scale);
    $src_y = (int)round(($scaled_h - $OG_H) / 2 / $scale);
    $src_w = (int)round($OG_W / $scale);
    $src_h = (int)round($OG_H / $scale);

    imagecopyresampled(
        $canvas, $src_img,
        0, 0,          // destino: esquina superior-izquierda
        $src_x, $src_y,
        $OG_W, $OG_H,
        $src_w, $src_h
    );

    imagedestroy($src_img);
    // Sin borde para banners: la imagen ya llena todo
} else {
    // ── MODO CONTAIN: imagen de producto centrada con padding ─────────────────
    $padding = 60;
    $max_w   = $OG_W - ($padding * 2);
    $max_h   = $OG_H - ($padding * 2);

    $ratio = min($max_w / $sw, $max_h / $sh, 1.0);
    $new_w = (int)round($sw * $ratio);
    $new_h = (int)round($sh * $ratio);

    $dst_x = (int)round(($OG_W - $new_w) / 2);
    $dst_y = (int)round(($OG_H - $new_h) / 2);

    imagecopyresampled(
        $canvas, $src_img,
        $dst_x, $dst_y,
        0, 0,
        $new_w, $new_h,
        $sw, $sh
    );

    imagedestroy($src_img);

    // Borde sutil violeta Pixis alrededor del producto
    $border_color = imagecolorallocate($canvas, 176, 38, 255); // #b026ff
    imagerectangle($canvas, $dst_x - 1, $dst_y - 1, $dst_x + $new_w, $dst_y + $new_h, $border_color);
}

// Guardar en caché física del servidor
if (!file_exists($cache_dir)) {
    @mkdir($cache_dir, 0755, true);
}
$cache_written = false;
if (is_writable($cache_dir) || (!file_exists($cache_file) && is_writable(__DIR__))) {
    $cache_written = @imagejpeg($canvas, $cache_file, 92);
}

// ─── Caché de la imagen generada en navegador (7 días) ───────────────────────
$cache_seconds  = 86400 * 7;
$last_modified  = time();
$etag           = '"' . md5($cache_file . $last_modified) . '"';

// Capturar la imagen en buffer para enviarla
ob_start();
imagejpeg($canvas, null, 92);
$img_output = ob_get_clean();
imagedestroy($canvas);

// Enviar respuesta a Facebook/bot INMEDIATAMENTE y cerrar la conexión
header('Content-Type: image/jpeg');
header('Content-Length: ' . strlen($img_output));
header('Cache-Control: public, max-age=' . $cache_seconds);
header('Expires: '       . gmdate('D, d M Y H:i:s', time() + $cache_seconds) . ' GMT');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $last_modified) . ' GMT');
header('ETag: '          . $etag);
header('Connection: close');

echo $img_output;

// Cerrar la conexión HTTP — el bot ya recibió su imagen
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request(); // PHP-FPM: cierra conexión manteniendo el proceso vivo
} else {
    // Apache/mod_php: flush + ignorar desconexión del cliente
    @ob_end_flush();
    @flush();
    ignore_user_abort(true);
    set_time_limit(120);
}

// ─── AUTO-WARMUP SILENCIOSO ───────────────────────────────────────────────────
// El bot ya recibió su imagen. Ahora generamos en background el caché
// de TODOS los productos que aún no tienen imagen pre-generada.
// Esto asegura que la PRÓXIMA vez que Facebook visite cualquier producto,
// la imagen esté lista al instante — sin que el usuario haga nada.
//
// Solo corre si pudimos escribir el caché y hay archivos de datos disponibles.
if ($cache_written && file_exists($cache_dir) && is_writable($cache_dir)) {

    @set_time_limit(120);
    @ini_set('memory_limit', '256M');

    $products_file   = __DIR__ . '/data/products.json';
    $categories_file = __DIR__ . '/data/categories.json';
    $site_file       = __DIR__ . '/data/site.json';

    // Recolectar todas las rutas de imagen del sitio
    $all_srcs = [];

    // Productos
    if (file_exists($products_file)) {
        $raw = @file_get_contents($products_file);
        if ($raw) {
            if (substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);
            $products = @json_decode($raw, true);
            if (is_array($products)) {
                foreach ($products as $p) {
                    if (!is_array($p)) continue;
                    $img = '';
                    if (!empty($p['img'])) {
                        $img = trim($p['img']);
                    } elseif (!empty($p['gallery'])) {
                        $parts = explode(',', (string)$p['gallery']);
                        foreach ($parts as $part) {
                            $t = trim($part);
                            if ($t !== '') { $img = $t; break; }
                        }
                    }
                    if ($img !== '') $all_srcs[] = ltrim(str_replace('\\', '/', $img), '/');
                }
            }
        }
    }

    // Banners (carouselTop + carouselBottom)
    if (file_exists($site_file)) {
        $site = @json_decode(@file_get_contents($site_file), true);
        if (is_array($site)) {
            foreach (['carouselTop', 'carouselBottom'] as $carousel_key) {
                if (!isset($site[$carousel_key]) || !is_array($site[$carousel_key])) continue;
                foreach ($site[$carousel_key] as $slide) {
                    if (!empty($slide['imgPc'])) {
                        $all_srcs[] = ltrim(str_replace('\\', '/', trim($slide['imgPc'])), '/');
                    }
                }
            }
        }
    }

    // Eliminar duplicados
    $all_srcs = array_unique($all_srcs);

    // Generar caché solo para los que aún no existen
    foreach ($all_srcs as $bg_src) {
        $bg_abs = __DIR__ . '/' . $bg_src;
        if (!file_exists($bg_abs) || !is_file($bg_abs)) continue;

        $bg_hash  = md5($bg_src . @filemtime($bg_abs));
        $bg_cache = $cache_dir . '/og_' . $bg_hash . '.jpg';

        if (file_exists($bg_cache)) continue; // ya está en caché → saltar

        // Generar y guardar
        $bg_ext = strtolower(pathinfo($bg_abs, PATHINFO_EXTENSION));
        $bg_img = null;
        switch ($bg_ext) {
            case 'jpg': case 'jpeg': $bg_img = @imagecreatefromjpeg($bg_abs); break;
            case 'png':              $bg_img = @imagecreatefrompng($bg_abs);   break;
            case 'webp':             $bg_img = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($bg_abs) : null; break;
            case 'gif':              $bg_img = @imagecreatefromgif($bg_abs);   break;
        }
        if (!$bg_img) continue;

        $bg_canvas = imagecreatetruecolor($OG_W, $OG_H);
        $bg_bg     = imagecolorallocate($bg_canvas, 13, 13, 13);
        imagefill($bg_canvas, 0, 0, $bg_bg);

        $bw = imagesx($bg_img);
        $bh = imagesy($bg_img);
        $b_ratio = ($bh > 0) ? ($bw / $bh) : 1;
        $b_is_banner = ($b_ratio >= 1.6);

        imagealphablending($bg_canvas, true);
        imagesavealpha($bg_canvas, false);

        if ($b_is_banner) {
            $b_scale = max($OG_W / $bw, $OG_H / $bh);
            $b_src_x = (int)round(($bw - $OG_W / $b_scale) / 2);
            $b_src_y = (int)round(($bh - $OG_H / $b_scale) / 2);
            $b_src_w = (int)round($OG_W / $b_scale);
            $b_src_h = (int)round($OG_H / $b_scale);
            imagecopyresampled($bg_canvas, $bg_img, 0, 0, $b_src_x, $b_src_y, $OG_W, $OG_H, $b_src_w, $b_src_h);
        } else {
            $b_pad = 60;
            $b_ratio_fit = min(($OG_W - $b_pad*2) / $bw, ($OG_H - $b_pad*2) / $bh, 1.0);
            $b_nw = (int)round($bw * $b_ratio_fit);
            $b_nh = (int)round($bh * $b_ratio_fit);
            $b_dx = (int)round(($OG_W - $b_nw) / 2);
            $b_dy = (int)round(($OG_H - $b_nh) / 2);
            imagecopyresampled($bg_canvas, $bg_img, $b_dx, $b_dy, 0, 0, $b_nw, $b_nh, $bw, $bh);
            $b_border = imagecolorallocate($bg_canvas, 176, 38, 255);
            imagerectangle($bg_canvas, $b_dx - 1, $b_dy - 1, $b_dx + $b_nw, $b_dy + $b_nh, $b_border);
        }

        imagedestroy($bg_img);
        @imagejpeg($bg_canvas, $bg_cache, 92);
        imagedestroy($bg_canvas);
    }
}

exit;

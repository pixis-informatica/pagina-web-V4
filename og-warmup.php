<?php
/**
 * og-warmup.php — Pre-generador de caché de imágenes OG para Facebook
 *
 * Accede a este script UNA SOLA VEZ después de agregar o modificar productos.
 * Genera (o regenera) las imágenes OG 1200×630 de TODOS los productos, categorías
 * y banners, guardándolas en /cache/ para que Facebook las sirva al instante.
 *
 * ⚠️ PROTEGIDO CON CLAVE — Acceso solo mediante ?key=pixis2025
 *    Cambiá la clave si querés más seguridad.
 *
 * Uso: https://pixistech.store/og-warmup.php?key=pixis2025
 * Con fuerza (regenerar aunque ya existan): ?key=pixis2025&force=1
 */

// ─── Clave de acceso ──────────────────────────────────────────────────────────
define('WARMUP_KEY', 'pixis2025');

$input_key = isset($_GET['key']) ? $_GET['key'] : '';
if ($input_key !== WARMUP_KEY) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit("Acceso denegado. Usá: ?key=pixis2025\n");
}

$force_regen = isset($_GET['force']) && $_GET['force'] === '1';

// ─── Config ───────────────────────────────────────────────────────────────────
$cache_dir    = __DIR__ . '/cache';
$products_file  = __DIR__ . '/data/products.json';
$categories_file = __DIR__ . '/data/categories.json';
$site_file    = __DIR__ . '/data/site.json';
$OG_W = 1200;
$OG_H = 630;

// Crear directorio de caché si no existe
if (!file_exists($cache_dir)) {
    if (!@mkdir($cache_dir, 0755, true)) {
        header('Content-Type: text/plain; charset=utf-8');
        exit("❌ ERROR: No se pudo crear el directorio de caché: $cache_dir\n");
    }
}

// ─── Recolectar todas las rutas de imágenes a procesar ───────────────────────
$images_to_process = []; // ['src' => 'img/...', 'label' => 'Producto: nombre']

// 1. Productos
if (file_exists($products_file) && is_readable($products_file)) {
    $raw = @file_get_contents($products_file);
    if ($raw && substr($raw, 0, 3) === "\xEF\xBB\xBF") $raw = substr($raw, 3);
    $products = @json_decode($raw, true);
    if (is_array($products)) {
        foreach ($products as $p) {
            if (!is_array($p)) continue;
            $img_src = '';
            if (!empty($p['img'])) {
                $img_src = trim($p['img']);
            } elseif (!empty($p['gallery'])) {
                $parts = explode(',', (string)$p['gallery']);
                foreach ($parts as $part) {
                    $t = trim($part);
                    if ($t !== '') { $img_src = $t; break; }
                }
            }
            if ($img_src !== '') {
                $images_to_process[] = [
                    'src'   => $img_src,
                    'label' => 'Producto: ' . (isset($p['title']) ? $p['title'] : '(sin título)'),
                ];
            }
        }
    }
}

// 2. Categorías
if (file_exists($categories_file) && is_readable($categories_file)) {
    $cats = @json_decode(@file_get_contents($categories_file), true);
    if (is_array($cats)) {
        foreach ($cats as $cat) {
            if (!empty($cat['customIcon'])) {
                $images_to_process[] = [
                    'src'   => trim($cat['customIcon']),
                    'label' => 'Categoría: ' . (isset($cat['name']) ? $cat['name'] : '(sin nombre)'),
                ];
            }
        }
    }
}

// 3. Banners (carouselTop y carouselBottom)
if (file_exists($site_file) && is_readable($site_file)) {
    $site = @json_decode(@file_get_contents($site_file), true);
    if (is_array($site)) {
        $carousels = array_merge(
            isset($site['carouselTop']) && is_array($site['carouselTop']) ? $site['carouselTop'] : [],
            isset($site['carouselBottom']) && is_array($site['carouselBottom']) ? $site['carouselBottom'] : []
        );
        foreach ($carousels as $slide) {
            if (!empty($slide['imgPc'])) {
                $images_to_process[] = [
                    'src'   => trim($slide['imgPc']),
                    'label' => 'Banner: ' . (isset($slide['bannerId']) ? $slide['bannerId'] : '(sin ID)'),
                ];
            }
        }
    }
}

// ─── Eliminar duplicados por src ──────────────────────────────────────────────
$seen_srcs = [];
$unique_images = [];
foreach ($images_to_process as $item) {
    $normalized = ltrim(str_replace('\\', '/', $item['src']), '/');
    if (!isset($seen_srcs[$normalized])) {
        $seen_srcs[$normalized] = true;
        $item['src'] = $normalized;
        $unique_images[] = $item;
    }
}

// ─── Función de generación (igual a og-image.php) ────────────────────────────
function generate_og_image($src, $abs_path, $cache_file, $OG_W, $OG_H) {
    if (!function_exists('imagecreatetruecolor')) {
        return ['status' => 'error', 'msg' => 'GD no disponible'];
    }

    $ext = strtolower(pathinfo($abs_path, PATHINFO_EXTENSION));
    $src_img = null;
    switch ($ext) {
        case 'jpg': case 'jpeg': $src_img = @imagecreatefromjpeg($abs_path); break;
        case 'png':  $src_img = @imagecreatefrompng($abs_path);  break;
        case 'webp': $src_img = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($abs_path) : null; break;
        case 'gif':  $src_img = @imagecreatefromgif($abs_path);  break;
    }

    if (!$src_img) return ['status' => 'error', 'msg' => 'No se pudo cargar la imagen'];

    $canvas = imagecreatetruecolor($OG_W, $OG_H);
    $bg     = imagecolorallocate($canvas, 13, 13, 13);
    imagefill($canvas, 0, 0, $bg);

    $sw = imagesx($src_img);
    $sh = imagesy($src_img);
    $img_ratio = ($sh > 0) ? ($sw / $sh) : 1;
    $is_banner = ($img_ratio >= 1.6);

    imagealphablending($canvas, true);
    imagesavealpha($canvas, false);

    if ($is_banner) {
        $scale    = max($OG_W / $sw, $OG_H / $sh);
        $src_x = (int)round(($sw - $OG_W / $scale) / 2);
        $src_y = (int)round(($sh - $OG_H / $scale) / 2);
        $src_w = (int)round($OG_W / $scale);
        $src_h = (int)round($OG_H / $scale);
        imagecopyresampled($canvas, $src_img, 0, 0, $src_x, $src_y, $OG_W, $OG_H, $src_w, $src_h);
    } else {
        $padding = 60;
        $max_w = $OG_W - ($padding * 2);
        $max_h = $OG_H - ($padding * 2);
        $ratio = min($max_w / $sw, $max_h / $sh, 1.0);
        $new_w = (int)round($sw * $ratio);
        $new_h = (int)round($sh * $ratio);
        $dst_x = (int)round(($OG_W - $new_w) / 2);
        $dst_y = (int)round(($OG_H - $new_h) / 2);
        imagecopyresampled($canvas, $src_img, $dst_x, $dst_y, 0, 0, $new_w, $new_h, $sw, $sh);
        $border_color = imagecolorallocate($canvas, 176, 38, 255);
        imagerectangle($canvas, $dst_x - 1, $dst_y - 1, $dst_x + $new_w, $dst_y + $new_h, $border_color);
    }

    imagedestroy($src_img);
    $ok = @imagejpeg($canvas, $cache_file, 92);
    imagedestroy($canvas);

    return $ok
        ? ['status' => 'ok',    'msg' => 'Generado correctamente']
        : ['status' => 'error', 'msg' => 'No se pudo escribir el archivo de caché'];
}

// ─── Procesar imágenes y generar HTML de resultado ───────────────────────────
header('Content-Type: text/html; charset=utf-8');
$total    = count($unique_images);
$generated = 0;
$skipped   = 0;
$errors    = 0;
$results   = [];

@set_time_limit(300); // 5 minutos máximo
@ini_set('memory_limit', '256M');

foreach ($unique_images as $item) {
    $src      = $item['src'];
    $label    = $item['label'];
    $abs_path = __DIR__ . '/' . $src;

    if (!file_exists($abs_path) || !is_file($abs_path)) {
        $errors++;
        $results[] = ['status' => 'error', 'label' => $label, 'src' => $src, 'msg' => 'Archivo no encontrado en el servidor'];
        continue;
    }

    $mtime = @filemtime($abs_path);
    $cache_hash = md5($src . $mtime);
    $cache_file = $cache_dir . '/og_' . $cache_hash . '.jpg';

    if (!$force_regen && file_exists($cache_file)) {
        $skipped++;
        $results[] = ['status' => 'skip', 'label' => $label, 'src' => $src, 'msg' => 'Ya existe en caché'];
        continue;
    }

    $r = generate_og_image($src, $abs_path, $cache_file, $OG_W, $OG_H);
    $r['label'] = $label;
    $r['src']   = $src;
    $results[]  = $r;

    if ($r['status'] === 'ok')    $generated++;
    else                           $errors++;
}

?><!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>OG Warmup — Pixis Informática</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0d0d0d; color: #e0e0e0; padding: 2rem; }
  h1   { color: #b026ff; }
  .summary { background: #1a1a1a; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; display: flex; gap: 2rem; flex-wrap: wrap; }
  .summary span { font-size: 1.1rem; }
  .ok    { color: #4caf50; }
  .skip  { color: #888; }
  .error { color: #f44336; }
  table  { width: 100%; border-collapse: collapse; font-size: .875rem; }
  th     { background: #1a1a1a; padding: .5rem .75rem; text-align: left; color: #b026ff; }
  td     { padding: .45rem .75rem; border-bottom: 1px solid #222; }
  tr:hover td { background: #1a1a1a; }
  .badge { display: inline-block; padding: .15rem .5rem; border-radius: 4px; font-weight: bold; font-size: .75rem; }
  .badge-ok    { background: #1b5e20; color: #a5d6a7; }
  .badge-skip  { background: #333; color: #aaa; }
  .badge-error { background: #b71c1c; color: #ffcdd2; }
  code { font-size: .75rem; color: #aaa; word-break: break-all; }
  .tip { background: #1b2a1b; border-left: 4px solid #4caf50; padding: .75rem 1rem; border-radius: 4px; margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>🔥 OG Cache Warmup — Pixis Informática</h1>

<div class="summary">
  <span>📦 Total: <strong><?= $total ?></strong></span>
  <span class="ok">✅ Generados: <strong><?= $generated ?></strong></span>
  <span class="skip">⏭️ Ya existían: <strong><?= $skipped ?></strong></span>
  <span class="error">❌ Errores: <strong><?= $errors ?></strong></span>
</div>

<?php if ($errors === 0 && $generated >= 0): ?>
<div class="tip">
  ✅ <strong>Listo.</strong> Ahora podés ir al <a href="https://developers.facebook.com/tools/debug/" target="_blank" style="color:#b026ff">Facebook Debugger</a>
  y pegar las URLs de tus productos. Facebook recibirá las imágenes al instante desde el caché.
  <?php if ($force_regen): ?> (Modo forzado: se regeneraron todas las imágenes) <?php endif; ?>
</div>
<?php endif; ?>

<table>
  <thead>
    <tr>
      <th>Estado</th>
      <th>Descripción</th>
      <th>Archivo fuente</th>
      <th>Detalle</th>
    </tr>
  </thead>
  <tbody>
  <?php foreach ($results as $r): ?>
    <tr>
      <td>
        <?php if ($r['status'] === 'ok'):   ?><span class="badge badge-ok">GENERADO</span>
        <?php elseif ($r['status'] === 'skip'): ?><span class="badge badge-skip">EN CACHÉ</span>
        <?php else: ?>                          <span class="badge badge-error">ERROR</span>
        <?php endif; ?>
      </td>
      <td><?= htmlspecialchars($r['label']) ?></td>
      <td><code><?= htmlspecialchars($r['src']) ?></code></td>
      <td><?= htmlspecialchars($r['msg']) ?></td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>

<p style="margin-top:2rem;color:#555;font-size:.8rem;">
  Para regenerar todas (incluyendo las ya cacheadas), accedé a:
  <code><?= htmlspecialchars('https://pixistech.store/og-warmup.php?key=pixis2025&force=1') ?></code>
</p>
</body>
</html>

<?php
// Anti-cache headers first thing
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

$domain = 'https://pixistech.store';
if (isset($_SERVER['HTTP_HOST'])) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $domain = $protocol . $_SERVER['HTTP_HOST'];
}

// Redirect real users to the frontend immediately if not a bot
$user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
$is_bot = preg_match('/(WhatsApp|facebookexternalhit|Twitterbot|Discordbot|LinkedInBot|TelegramBot|Slackbot|Googlebot|bingbot|Facebot)/i', $user_agent);
$is_facebook = (stripos($user_agent, 'facebookexternalhit') !== false || stripos($user_agent, 'Facebot') !== false);

$query_params = !empty($_SERVER['QUERY_STRING']) ? '?' . $_SERVER['QUERY_STRING'] : '';
$redirect_url = rtrim($domain, '/') . '/index.html' . $query_params;

if (!$is_bot) {
    header('Location: ' . $redirect_url, true, 302);
    exit;
}

// Helper: normalize and build absolute URL
// Convierte backslashes, elimina barras dobles y codifica cada segmento
// del path (espacios, acentos, etc.) para que la URL sea válida en redes sociales.
function build_absolute_url($domain, $path) {
    if (empty($path)) return '';

    // 1. Normalizar separadores: backslash Windows → forward slash
    $path = str_replace('\\', '/', $path);

    // 2. Eliminar barra inicial si existe
    $path = ltrim($path, '/');

    // 3. Colapsar barras dobles (ej: img//productos//)
    $path = preg_replace('#/+#', '/', $path);

    // 4. Codificar CADA segmento individualmente (preserva las barras /)
    //    rawurlencode() convierte espacios en %20, acentos, paréntesis, etc.
    //    NO se usa urlencode() porque este convierte espacios en + (inválido en rutas)
    $segments = explode('/', $path);
    $encoded  = array_map('rawurlencode', $segments);
    $path     = implode('/', $encoded);

    return rtrim($domain, '/') . '/' . $path;
}

// Helper: genera URL de og-image.php para imágenes de producto.
// og-image.php centra la imagen en un canvas 1200×630 sin recortar nada.
// Solo se usa para imágenes de producto (no banners ni fallback).
function build_og_image_url($domain, $raw_path) {
    if (empty($raw_path)) return '';

    // Normalizar separadores
    $raw_path = str_replace('\\', '/', $raw_path);
    $raw_path = ltrim($raw_path, '/');
    $raw_path = preg_replace('#/+#', '/', $raw_path);

    // Construir URL al generador con la ruta como parámetro src
    return rtrim($domain, '/') . '/og-image.php?src=' . rawurlencode($raw_path);
}

// Helper: format price
function format_price($price_val) {
    if (is_numeric($price_val)) {
        return '$' . number_format((float)$price_val, 2, ',', '.');
    }
    return $price_val;
}

// Helper: clean description
function clean_description($desc) {
    if (empty($desc)) return '';
    $desc = strip_tags($desc);
    $desc = str_replace(array("\r", "\n"), ' ', $desc);
    $desc = preg_replace('/\s+/', ' ', $desc);
    $desc = trim($desc);
    if (mb_strlen($desc) > 160) {
        $desc = mb_substr($desc, 0, 157) . '...';
    }
    return $desc;
}

// Helper: slugify
function get_slug($text) {
    $unwanted_array = array(
        'Š'=>'S', 'š'=>'s', 'Ž'=>'Z', 'ž'=>'z', 'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A', 'Å'=>'A', 'Æ'=>'A', 'Ç'=>'C',
        'È'=>'E', 'É'=>'E', 'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I', 'Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O',
        'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U', 'Ú'=>'U', 'Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss', 'à'=>'a', 'á'=>'a',
        'â'=>'a', 'ã'=>'a', 'ä'=>'a', 'å'=>'a', 'æ'=>'a', 'ç'=>'c', 'è'=>'e', 'é'=>'e', 'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i',
        'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o', 'ô'=>'o', 'õ'=>'o', 'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u',
        'û'=>'u', 'ý'=>'y', 'þ'=>'b', 'ÿ'=>'y'
    );
    $text = strtr($text, $unwanted_array);
    $text = mb_strtolower($text, 'UTF-8');
    $text = preg_replace('/[^a-z0-9\s-]/', '', $text);
    $text = preg_replace('/[\s-]+/', '-', $text);
    return trim($text, '-');
}

// Default/fallback values
$fallback_title = "Pixis Informática | Especialistas en Computación";
$fallback_description = "Tienda de computación online en Santiago del Estero. Venta de accesorios gamer, hardware de alto rendimiento y servicio técnico especializado.";
$fallback_image = build_absolute_url($domain, 'img/TECH24.png');

$og_title = null;
$og_description = null;
$og_image = null;

// ============================================================
// Scenario 1: Product  (?producto=VALOR)
// Supports: ID exacto, slug guardado, o slug generado del título
// ============================================================
if (isset($_GET['producto'])) {

    // Normalizar el valor recibido:
    // urldecode() cubre casos donde Apache pasa %2D en vez de - etc.
    $producto_query = trim(urldecode($_GET['producto']));
    $found_product  = null;

    if ($producto_query !== '') {

        // Generar también el slug del query por si el usuario comparte por título
        $producto_query_slug = get_slug($producto_query);

        // Aumentar memoria para parsear el archivo de 245 KB en hosting compartido
        @ini_set('memory_limit', '256M');

        $products_file = __DIR__ . '/data/products.json';

        if (file_exists($products_file) && is_readable($products_file)) {

            $raw_json = @file_get_contents($products_file);

            if ($raw_json !== false && $raw_json !== '') {

                // Strip BOM UTF-8 (EF BB BF) por si el archivo en el servidor lo tiene
                if (substr($raw_json, 0, 3) === "\xEF\xBB\xBF") {
                    $raw_json = substr($raw_json, 3);
                }

                // Decodificar: true = array asociativo
                // JSON_BIGINT_AS_STRING evita pérdida de precisión en IDs numéricos largos
                $products_data = json_decode($raw_json, true, 512, JSON_BIGINT_AS_STRING);

                // Aceptar tanto array plano como objeto (convertir objeto a array)
                if (is_object($products_data)) {
                    $products_data = (array) $products_data;
                }

                if (is_array($products_data) && json_last_error() === JSON_ERROR_NONE) {

                    foreach ($products_data as $p) {

                        // Saltar entradas que no sean arrays válidos
                        if (!is_array($p)) continue;

                        $p_id         = isset($p['id'])    ? trim((string)$p['id'])    : '';
                        $p_slug       = isset($p['slug'])  ? trim((string)$p['slug'])  : '';
                        $p_title_slug = isset($p['title']) ? get_slug($p['title'])      : '';

                        // COINCIDENCIA TRIPLE — insensible a mayúsculas/minúsculas
                        $match_id         = ($p_id   !== '' && strcasecmp($p_id,   $producto_query)      === 0);
                        $match_slug       = ($p_slug !== '' && strcasecmp($p_slug, $producto_query)      === 0);
                        $match_title_slug = ($p_title_slug !== '' && (
                            strcasecmp($p_title_slug, $producto_query)      === 0 ||
                            strcasecmp($p_title_slug, $producto_query_slug) === 0
                        ));

                        if ($match_id || $match_slug || $match_title_slug) {
                            $found_product = $p;
                            break;
                        }
                    }
                }
            }
        }
    }

    if ($found_product) {

        $p_title = isset($found_product['title']) ? trim($found_product['title']) : '';

        // --- Extracción de precio con cascada robusta ---
        // priceNum puede venir como String "8500" o Number 8500
        $price_val = null;

        if (isset($found_product['price'])
            && is_numeric($found_product['price'])
            && (float)$found_product['price'] > 0) {
            $price_val = (float)$found_product['price'];

        } elseif (isset($found_product['priceNum'])
            && $found_product['priceNum'] !== ''
            && $found_product['priceNum'] !== null
            && is_numeric($found_product['priceNum'])
            && (float)$found_product['priceNum'] > 0) {
            $price_val = (float)$found_product['priceNum'];
        }

        if ($price_val !== null) {
            $formatted_price = format_price($price_val);
        } elseif (!empty($found_product['priceVisible'])) {
            $formatted_price = trim((string)$found_product['priceVisible']);
        } else {
            $formatted_price = '';
        }

        // og:title
        if ($formatted_price !== '') {
            $og_title = $p_title . ' — ' . $formatted_price . ' | Pixis Informática';
        } else {
            $og_title = $p_title . ' | Pixis Informática';
        }

        // og:description
        $og_description = (!empty($found_product['desc']))
            ? clean_description($found_product['desc'])
            : '';
        if ($og_description === '') {
            $og_description = 'Comprá ' . $p_title . ' al mejor precio en Pixis Informática. Hardware de alto rendimiento en Santiago del Estero.';
        }

        // og:image
        $p_image = '';
        if (!empty($found_product['img'])) {
            $p_image = (string)$found_product['img'];
        } elseif (!empty($found_product['gallery'])) {
            // Si no hay img pero hay gallery, extraemos la primera imagen de la galería
            $gallery_parts = explode(',', (string)$found_product['gallery']);
            foreach ($gallery_parts as $part) {
                $trimmed_part = trim($part);
                if ($trimmed_part !== '') {
                    $p_image = $trimmed_part;
                    break;
                }
            }
        }

        if ($p_image !== '') {
            if ($is_facebook) {
                // Facebook: canvas 1200×630 sin recortar
                $og_image = build_og_image_url($domain, $p_image);
            } else {
                // WhatsApp y otros bots: imagen original directa
                $og_image = build_absolute_url($domain, $p_image);
            }
        }
    }
}

// Scenario 2: Category
if (!$og_title && isset($_GET['categoria'])) {
    $categoria_query = trim($_GET['categoria']);
    $found_category = null;

    if ($categoria_query !== '') {
        $categories_file = __DIR__ . '/data/categories.json';
        if (file_exists($categories_file)) {
            $categories_data = json_decode(file_get_contents($categories_file), true);
            if (is_array($categories_data)) {
                foreach ($categories_data as $cat) {
                    $cat_id = isset($cat['id']) ? trim($cat['id']) : '';
                    $cat_name_slug = isset($cat['name']) ? get_slug($cat['name']) : '';

                    if (($cat_id !== '' && strcasecmp($cat_id, $categoria_query) === 0) || 
                        ($cat_name_slug !== '' && strcasecmp($cat_name_slug, $categoria_query) === 0)) {
                        $found_category = $cat;
                        break;
                    }
                }
            }
        }
    }

    if ($found_category) {
        $cat_name = isset($found_category['name']) ? trim($found_category['name']) : '';
        $og_title = $cat_name . " - Pixis Informática";
        $og_description = "Explorá nuestra categoría de " . $cat_name . " en Pixis Informática. Encontrá los mejores precios y hardware de alto rendimiento.";
        
        if (!empty($found_category['customIcon'])) {
            if ($is_facebook) {
                $og_image = build_og_image_url($domain, $found_category['customIcon']);
            } else {
                $og_image = build_absolute_url($domain, $found_category['customIcon']);
            }
        }
    }
}

// Scenario 3: Banner
if (!$og_title && isset($_GET['banner'])) {
    $banner_query = trim($_GET['banner']);
    $found_banner_info = null;
    $found_banner_img = '';
    $banner_key = null;

    if ($banner_query !== '') {
        $site_file = __DIR__ . '/data/site.json';
        if (file_exists($site_file)) {
            $site_data = json_decode(file_get_contents($site_file), true);
            if (is_array($site_data)) {
                if (isset($site_data['banners']) && is_array($site_data['banners'])) {
                    foreach ($site_data['banners'] as $b_id => $b_info) {
                        $b_title_slug = isset($b_info['t']) ? get_slug($b_info['t']) : '';
                        if (strcasecmp($b_id, $banner_query) === 0 || 
                            get_slug($b_id) === get_slug($banner_query) || 
                            strcasecmp($b_title_slug, $banner_query) === 0) {
                            $found_banner_info = $b_info;
                            $banner_key = $b_id;
                            break;
                        }
                    }
                }
                
                $carousels = array_merge(
                    isset($site_data['carouselTop']) && is_array($site_data['carouselTop']) ? $site_data['carouselTop'] : array(),
                    isset($site_data['carouselBottom']) && is_array($site_data['carouselBottom']) ? $site_data['carouselBottom'] : array()
                );
                foreach ($carousels as $slide) {
                    if (isset($slide['bannerId']) && (strcasecmp($slide['bannerId'], $banner_query) === 0 || ($banner_key !== null && strcasecmp($slide['bannerId'], $banner_key) === 0))) {
                        if (!empty($slide['imgPc'])) {
                            $found_banner_img = $slide['imgPc'];
                            break;
                        }
                    }
                }
            }
        }
    }

    if ($found_banner_info) {
        $banner_title = isset($found_banner_info['t']) ? trim($found_banner_info['t']) : '';
        $og_title = "🔥 ¡Equipate Ya! " . $banner_title . " en Pixis Informática";
        $og_description = "¡No dejes pasar esta oportunidad! Descubrí los mejores productos en " . $banner_title . " con envíos a todo el país y el mejor precio local.";
        
        if ($found_banner_img !== '') {
            if ($is_facebook) {
                // Facebook: canvas 1200×630 sin recortar
                $og_image = build_og_image_url($domain, $found_banner_img);
            } else {
                // WhatsApp y otros: imagen original directa
                $og_image = build_absolute_url($domain, $found_banner_img);
            }
        }
    }
}

// Fallback logic
if (!$og_title) {
    $og_title = $fallback_title;
}
if (!$og_description) {
    $og_description = $fallback_description;
}
if (!$og_image) {
    $og_image = $fallback_image;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($og_title); ?></title>
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Pixis Informática">
    <meta property="og:locale" content="es_AR">
    <meta property="og:title" content="<?php echo htmlspecialchars($og_title); ?>">
    <meta property="og:description" content="<?php echo htmlspecialchars($og_description); ?>">
    <meta property="og:image" content="<?php echo htmlspecialchars($og_image); ?>">
    <?php if ($is_facebook): ?>
    <!-- Dimensiones fijas 1200×630 para que Facebook no recorte la imagen -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <?php endif; ?>
    <meta property="og:url" content="<?php echo htmlspecialchars($redirect_url); ?>">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo htmlspecialchars($og_title); ?>">
    <meta name="twitter:description" content="<?php echo htmlspecialchars($og_description); ?>">
    <meta name="twitter:image" content="<?php echo htmlspecialchars($og_image); ?>">
    <meta name="description" content="<?php echo htmlspecialchars($og_description); ?>">
    <noscript>
        <meta http-equiv="refresh" content="0;url=<?php echo htmlspecialchars($redirect_url); ?>">
    </noscript>
</head>
<body>
    <script>
        window.location.replace(<?php echo json_encode($redirect_url); ?>);
    </script>
</body>
</html>

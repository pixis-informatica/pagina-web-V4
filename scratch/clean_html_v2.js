const fs = require('fs');
const path = require('path');

const htmlPath = path.join(process.cwd(), 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Buscamos todas las secciones de productos.
// Como las cards tienen divs internos, vamos a buscar el bloque completo 
// que empieza en <div class="productos"> y termina ANTES del siguiente <h3 o de una sección de cierre mayor.
// O mejor: buscar todos los <div class="card"> que estén dentro de un contenedor de productos y borrarlos.

// 1. Identificar los bloques de productos
const productosRegex = /<div\s+class="productos"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="separador-categoria"|<\/div>|<h3|<footer)/gi;

// Sin embargo, para ser 100% seguros, vamos a usar un enfoque de "borrar todas las cards" 
// que estén dentro de secciones de categorías.

let count = 0;
// Este regex busca el contenedor de productos y captura TODO hasta el cierre del div principal de la categoría.
// En tu HTML, la estructura es:
// <div class="productos"> ... </div> (donde el </div> final suele estar solo en una línea antes de un <h3 o un <div class="separador")

const lines = html.split('\n');
let newLines = [];
let insideProductos = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (line.includes('<div class="productos">') || line.includes('<div class="productos Gabinetes">')) {
        newLines.push(line);
        newLines.push('            <!-- Contenido dinámico cargado desde products.json -->');
        insideProductos = true;
        count++;
        continue;
    }
    
    if (insideProductos) {
        // Si encontramos el cierre del div de productos (que suele ser un </div> solo o con espacios)
        // Pero cuidado de no confundir con cierres de cards.
        // En tu index.html, los cierres de .productos suelen estar seguidos de un h3 o separador.
        if (line.trim() === '</div>' && ( (lines[i+1] && (lines[i+1].includes('<h3') || lines[i+1].includes('<div class="separador-categoria"'))) || i === lines.length - 1)) {
            newLines.push(line);
            insideProductos = false;
        }
        // Si no es el cierre, ignoramos la línea (la borramos)
        continue;
    }
    
    newLines.push(line);
}

fs.writeFileSync(htmlPath, newLines.join('\n'));
console.log(`Se han limpiado ${count} secciones de productos con éxito.`);

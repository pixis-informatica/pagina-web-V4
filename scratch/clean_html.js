const fs = require('fs');
const path = require('path');

const htmlPath = path.join(process.cwd(), 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Regex para encontrar el interior de los divs con clase "productos"
// Buscamos <div class="productos"> ... </div>
// Usamos un lookbehind y lookahead o simplemente capturamos el grupo.
// Nota: Algunos divs pueden tener clases adicionales o estar anidados.
// El patrón general en este proyecto es <div class="productos">...</div>

const productosRegex = /(<div\s+class="productos"[^>]*>)([\s\S]*?)(<\/div>)/gi;

let count = 0;
const newHtml = html.replace(productosRegex, (match, openTag, content, closeTag) => {
    // Si el contenido ya está limpio o solo tiene comentarios, lo dejamos.
    if (content.trim().startsWith('<!--')) return match;
    
    count++;
    return `${openTag}\n            <!-- Contenido dinámico cargado desde products.json -->\n        ${closeTag}`;
});

fs.writeFileSync(htmlPath, newHtml);
console.log(`Se han limpiado ${count} secciones de productos en index.html`);

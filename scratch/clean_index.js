const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('Original size:', html.length, 'bytes');

// Expresión regular para encontrar bloques de <div class="card ..."> ... </div>
// Buscamos específicamente las cards que están dentro de contenedores de productos.
// Como las cards terminan con </div> y están seguidas de otras cards o el fin del contenedor.

// Estrategia: Buscar todos los <div class="card ..."> y sus contenidos hasta el cierre correspondiente.
// Dado que las cards no tienen divs anidados complejos en su estructura básica, 
// podemos usar una búsqueda de etiquetas.

// Regex mejorada: busca <div class="card [lo que sea]" ... > hasta el </div> que cierra la card.
// Usamos [\s\S]*? para ser no-codiciosos y detenernos en el cierre más cercano que preceda a otra card o al fin del contenedor.
const cardRegexUniversal = /<div class="card[^"]*"[\s\S]*?<\/div>\s*(?=<div class="card|<\/div>)/g;

let newHtml = html.replace(cardRegexUniversal, '');

console.log('New size:', newHtml.length, 'bytes');
console.log('Difference:', html.length - newHtml.length, 'bytes removed');

fs.writeFileSync(indexPath, newHtml);
console.log('index.html cleaned successfully.');

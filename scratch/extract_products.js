const fs = require('fs');
const path = require('path');

const htmlPath = path.join(process.cwd(), 'index.html');
const productsPath = path.join(process.cwd(), 'data', 'products.json');

if (!fs.existsSync(htmlPath)) {
    console.error('No se encontró index.html');
    process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');

// Regex para capturar bloques de cards de forma robusta
const cardRegex = /<div\s+class="card[^"]*"([\s\S]*?)>([\s\S]*?)<\/div>/gi;
const attrRegex = /data-([^=]+)="([^"]*)"/gi;

let extracted = [];
let match;

while ((match = cardRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const attrsRaw = match[1];
    const content = match[2];

    let prod = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
        let key = attrMatch[1];
        let val = attrMatch[2];
        
        // Mapeo de nombres de atributos a campos de productos.json
        if (key === 'pixis-id' || key === 'id') prod.id = val;
        else if (key === 'title') prod.title = val;
        else if (key === 'price') prod.priceVisible = val;
        else if (key === 'img') prod.img = val;
        else if (key === 'desc') prod.desc = val;
        else if (key === 'category') prod.category = val;
        else if (key === 'subcategoria') prod.subcategoria = val;
        else if (key === 'gallery') prod.gallery = val;
        else if (key === 'banners') {
            try { prod.banners = JSON.parse(val.replace(/&quot;/g, '"')); } catch(e) { prod.banners = []; }
        }
        else if (key === 'cash-price') prod.priceLocal = parseInt(val.replace(/[$. ]/g, ''));
    }

    // Si faltan datos en los atributos, buscarlos en el contenido
    if (!prod.title) {
        const titleMatch = content.match(/<h3>(.*?)<\/h3>/);
        if (titleMatch) prod.title = titleMatch[1].trim();
    }
    if (!prod.img) {
        const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) prod.img = imgMatch[1];
    }
    if (!prod.priceVisible) {
        const priceMatch = content.match(/<span[^>]+class="precio"[^>]*>(.*?)<\/span>/);
        if (priceMatch) prod.priceVisible = priceMatch[1].trim();
    }

    // Buscar precios en el botón "Agregar al carrito"
    const btnMatch = content.match(/data-price="([^"]+)"/);
    if (btnMatch) prod.price = parseInt(btnMatch[1]);
    
    const btnLocalMatch = content.match(/data-price-local="([^"]+)"/);
    if (btnLocalMatch) prod.priceLocal = parseInt(btnLocalMatch[1]);

    // Stock
    prod.inStock = !fullTag.includes('sin-stock');

    // Generar ID si no tiene
    if (!prod.id && prod.title) {
        prod.id = 'prod-' + prod.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + Math.floor(Math.random()*1000);
    }

    if (prod.title) {
        extracted.push(prod);
    }
}

const result = {
    count: extracted.length,
    all: extracted
};

fs.writeFileSync(path.join(process.cwd(), 'scratch', 'extracted_products.json'), JSON.stringify(extracted, null, 2));
console.log(`Extracción completada: ${extracted.length} productos guardados en scratch/extracted_products.json`);

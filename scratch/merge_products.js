const fs = require('fs');
const path = require('path');

const productsPath = path.join(process.cwd(), 'data', 'products.json');
const extractedPath = path.join(process.cwd(), 'scratch', 'extracted_products.json');

const current = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

// Combinar ambos (sin eliminar duplicados como pidió el usuario)
const merged = [...current, ...extracted];

fs.writeFileSync(productsPath, JSON.stringify(merged, null, 2));
console.log(`Merge completado. Total de productos en data/products.json: ${merged.length}`);

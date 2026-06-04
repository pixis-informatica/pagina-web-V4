const fs = require('fs');

const products = JSON.parse(fs.readFileSync('d:\\server robusto\\server completo1\\server\\data\\products.json', 'utf8'));
const state = JSON.parse(fs.readFileSync('d:\\server robusto\\server completo1\\server\\data\\site.json', 'utf8'));
const categories = state.state ? state.state.categories : (state.site ? state.site.categories : []);

console.log("Categorías en site.json:");
categories.forEach(c => console.log(`- ID: "${c.id}", Name: "${c.name}"`));

const prodCats = new Set();
products.forEach(p => {
    if (p.category) prodCats.add(p.category.trim());
    if (p.category2) prodCats.add(p.category2.trim());
    if (p.category3) prodCats.add(p.category3.trim());
});

console.log("\nCategorías usadas en products.json:");
[...prodCats].sort().forEach(c => console.log(`- "${c}"`));

const fs = require('fs');
let content = fs.readFileSync('./leetcode-numbers.js', 'utf8');

const slug = 'check-divisibility-by-digit-sum-and-product';

const idx = content.indexOf(slug);
if (idx === -1) {
  console.log('Entry not found in file, need to add it.');
  process.exit(1);
}

// Check what's right before the quote of the slug
const before = content.slice(idx - 2, idx);
console.log('Characters before slug:', JSON.stringify(before));

if (before === ',"') {
  console.log('Comma already present - entry is correctly formatted!');
} else {
  // Fix: insert a comma before the quote
  const bad = content.slice(idx - 1, idx + slug.length + 10);
  console.log('Bad section found:', JSON.stringify(bad));
  
  // Replace the bad insertion (no comma before) with the correct one
  // The char before " is likely a digit (end of previous value)
  const fixedContent = content.slice(0, idx - 1) + ',"' + slug + '"' + content.slice(idx + slug.length + 1);
  fs.writeFileSync('./leetcode-numbers.js', fixedContent, 'utf8');
  console.log('Fixed! Added missing comma before entry.');
}

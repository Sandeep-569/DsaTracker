const fs = require('fs');
let content = fs.readFileSync('./leetcode-numbers.js', 'utf8');

const slug = 'check-divisibility-by-digit-sum-and-product';
const num = 3622;

if (content.includes(slug)) {
  console.log('Already exists in map!');
  process.exit(0);
}

// Insert the new entry before the closing "};" of the map
const newEntry = '"' + slug + '":' + num + ',';
const lastBrace = content.lastIndexOf('};');

if (lastBrace === -1) {
  console.error('Could not find closing }; in file');
  process.exit(1);
}

content = content.slice(0, lastBrace) + newEntry + content.slice(lastBrace);
fs.writeFileSync('./leetcode-numbers.js', content, 'utf8');
console.log('Inserted "' + slug + '":' + num + ' into LEETCODE_NUM_MAP');

const fs = require('fs');

let dataTxt = fs.readFileSync('data.js', 'utf8');

const prefix = 'const RAW_DATA = ';
const firstBrace = dataTxt.indexOf('{');
let depth = 0;
let endIdx = -1;

for (let i = firstBrace; i < dataTxt.length; i++) {
  if (dataTxt[i] === '{') depth++;
  else if (dataTxt[i] === '}') {
    depth--;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
}

if (firstBrace !== -1 && endIdx !== -1) {
  const jsonStr = dataTxt.substring(firstBrace, endIdx + 1);
  const suffixStr = dataTxt.substring(endIdx + 1);
  const data = JSON.parse(jsonStr);

  if (data['Google']) {
    const newItem = ["Maximum Product Difference Between Two Pairs", "Easy", "https://leetcode.com/problems/maximum-product-difference-between-two-pairs", "L+S"];
    
    const exists = data['Google'].some(p => p[2].includes('maximum-product-difference-between-two-pairs'));
    if (!exists) {
      data['Google'].push(newItem);
      data['Google'].sort((a, b) => {
        const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        if (order[a[1]] !== order[b[1]]) return order[a[1]] - order[b[1]];
        return a[0].localeCompare(b[0]);
      });
      fs.writeFileSync('data.js', prefix + JSON.stringify(data) + suffixStr);
      console.log('Successfully added "Maximum Product Difference Between Two Pairs" to Google in data.js!');
    } else {
      console.log('Already exists in data.js!');
    }
  } else {
    console.error('Google key not found in data.js');
  }
} else {
  console.error('Brace matching failed');
}

// 2. Update leetcode-numbers.js
let numTxt = fs.readFileSync('leetcode-numbers.js', 'utf8');
if (!numTxt.includes('maximum-product-difference-between-two-pairs')) {
  numTxt = numTxt.replace('{', '{\n  "maximum-product-difference-between-two-pairs": 1913,');
  fs.writeFileSync('leetcode-numbers.js', numTxt);
  console.log('Successfully added 1913 to leetcode-numbers.js!');
} else {
  console.log('1913 already in leetcode-numbers.js!');
}

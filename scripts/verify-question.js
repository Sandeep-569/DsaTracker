const fs = require('fs');
const content = fs.readFileSync('./data.js', 'utf8');
// data.js uses const RAW_DATA = {...}; - use Function to eval in its own scope
const fn = new Function(content + '; return RAW_DATA;');
const RAW_DATA = fn();
['tcs', 'Infosys'].forEach(c => {
  const found = RAW_DATA[c].find(q => q[0] === 'Check Divisibility by Digit Sum and Product');
  console.log(c + ': ' + JSON.stringify(found));
});

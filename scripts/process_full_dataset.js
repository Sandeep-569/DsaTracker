const fs = require('fs');
const path = require('path');

const sourceFilePath = path.join(__dirname, 'company-problems-combined.html');
const targetDataPath = path.join(__dirname, 'data.js');

try {
  console.log(`Reading source file: ${sourceFilePath}...`);
  const fileContent = fs.readFileSync(sourceFilePath, 'utf8');
  console.log(`File read successfully! Size: ${fileContent.length} bytes (${(fileContent.length / 1024 / 1024).toFixed(2)} MB)`);

  const tagStart = '<script type="application/json" id="raw-data">';
  const tagEnd = '</script>';

  const startIdx = fileContent.indexOf(tagStart);
  if (startIdx === -1) {
    console.error('Could not find raw-data script tag');
    process.exit(1);
  }

  const endIdx = fileContent.indexOf(tagEnd, startIdx);
  if (endIdx === -1) {
    console.error('Could not find ending script tag');
    process.exit(1);
  }

  const jsonStr = fileContent.substring(startIdx + tagStart.length, endIdx).trim();
  console.log(`Extracted raw JSON string. Length: ${jsonStr.length} characters.`);

  const parsedData = JSON.parse(jsonStr);
  const companyNames = Object.keys(parsedData);
  
  let totalPairs = 0;
  const uniqueProblems = new Set();

  for (const [comp, problems] of Object.entries(parsedData)) {
    totalPairs += problems.length;
    problems.forEach(p => uniqueProblems.add(p[0]));
  }

  console.log(`========================================`);
  console.log(`SUCCESS! Dataset statistics:`);
  console.log(`Total Companies: ${companyNames.length}`);
  console.log(`Total Company-Problem Pairs: ${totalPairs}`);
  console.log(`Unique Problems: ${uniqueProblems.size}`);
  console.log(`========================================`);

  const jsContent = `const RAW_DATA=${JSON.stringify(parsedData)},LEETCODE_DATA={};for(const[c,p]of Object.entries(RAW_DATA))LEETCODE_DATA[c]=p.map(x=>({title:x[0],diff:x[1],url:x[2],src:x[3],tags:[]}));`;

  fs.writeFileSync(targetDataPath, jsContent, 'utf8');
  console.log(`Successfully updated ${targetDataPath}! (${(jsContent.length / 1024 / 1024).toFixed(2)} MB)`);

} catch (err) {
  console.error('Error processing full dataset:', err);
}

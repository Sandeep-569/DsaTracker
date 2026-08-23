/**
 * Script to add a question to specific companies in data.js
 * Usage: node scripts/add-question.js
 */

const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data.js');
const content = fs.readFileSync(dataFilePath, 'utf8');

// The new question to add: [Title, Difficulty, URL, Type]
const NEW_QUESTION = [
  "Check Divisibility by Digit Sum and Product",
  "Easy",
  "https://leetcode.com/problems/check-divisibility-by-digit-sum-and-product",
  "L+S"
];

// Companies to add the question to
const TARGET_COMPANIES = ['tcs', 'Infosys'];

// Parse the RAW_DATA object
eval(content); // loads RAW_DATA into scope

let modified = false;

TARGET_COMPANIES.forEach(company => {
  const list = RAW_DATA[company];
  if (!list) {
    console.log(`⚠️  Company "${company}" not found in data.js`);
    return;
  }

  // Check if already exists
  if (list.find(q => q[0] === NEW_QUESTION[0])) {
    console.log(`ℹ️  "${NEW_QUESTION[0]}" already exists in ${company}`);
    return;
  }

  // Find the correct alphabetical insertion index among Easy questions
  let insertIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (q[1] === 'Easy') {
      if (NEW_QUESTION[0] < q[0]) {
        insertIndex = i;
        break;
      }
    } else if (q[1] === 'Medium' || q[1] === 'Hard') {
      // We've passed all Easy questions, insert before Medium/Hard if not placed yet
      if (insertIndex === -1) {
        insertIndex = i;
      }
      break;
    }
  }

  // If no insertion point found (e.g., all Easy and ours comes last), push to end of Easy
  if (insertIndex === -1) insertIndex = list.length;

  list.splice(insertIndex, 0, NEW_QUESTION);
  console.log(`✅  Added "${NEW_QUESTION[0]}" to ${company} at index ${insertIndex}`);
  modified = true;
});

if (!modified) {
  console.log('No changes made.');
  process.exit(0);
}

// Serialize back to data.js format
const newContent = 'const RAW_DATA = ' + JSON.stringify(RAW_DATA) + ';';
fs.writeFileSync(dataFilePath, newContent, 'utf8');
console.log('\n✅  data.js updated successfully!');

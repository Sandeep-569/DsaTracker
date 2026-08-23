const fs = require('fs');
let content = fs.readFileSync('./data.js', 'utf8');

const QUESTION_TITLE = "Check Divisibility by Digit Sum and Product";
const QUESTION_DIFF = "Easy";
const QUESTION_URL = "https://leetcode.com/problems/check-divisibility-by-digit-sum-and-product";
const QUESTION_TYPE = "L+S";

const newEntry = `["${QUESTION_TITLE}", "${QUESTION_DIFF}", "${QUESTION_URL}", "${QUESTION_TYPE}"]`;

// Companies to add the question to, with their anchor (a question that comes right AFTER alphabetically)
const targets = [
  {
    company: 'tcs',
    // In tcs, next Easy question alphabetically after "Check Divisibility..." is "Check If a Word Occurs..."
    anchorBefore: '"Check If a Word Occurs As a Prefix of Any Word in a Sentence"'
  },
  {
    company: 'Infosys',
    // In Infosys, next Easy question alphabetically after "Check Divisibility..." is "Climbing Stairs"
    anchorBefore: '"Climbing Stairs"'
  }
];

let changesMade = 0;

for (const target of targets) {
  if (content.includes(`"${QUESTION_TITLE}"`)) {
    // If the title already exists anywhere, it might already be in this company
    // Do a more specific check
  }

  // Find the company's section and the anchor question within it
  // The company key looks like: "tcs": [[ or "Infosys": [[
  const companyKeyPattern = `"${target.company}": [[`;
  const companyIdx = content.indexOf(companyKeyPattern);
  
  if (companyIdx === -1) {
    console.log(`Company "${target.company}" not found!`);
    continue;
  }

  // Find the anchor question AFTER the company key position
  const anchorIdx = content.indexOf(target.anchorBefore, companyIdx);
  
  if (anchorIdx === -1) {
    console.log(`Anchor question ${target.anchorBefore} not found for ${target.company}!`);
    continue;
  }

  // Find the start of the array entry containing the anchor (go back to find the "[")
  let entryStart = anchorIdx;
  while (entryStart > 0 && content[entryStart] !== '[') {
    entryStart--;
  }

  // Check if our question already exists between companyIdx and anchorIdx
  const section = content.slice(companyIdx, anchorIdx);
  if (section.includes(QUESTION_TITLE)) {
    console.log(`Question already exists in ${target.company}, skipping.`);
    continue;
  }

  // Insert our new entry before the anchor entry
  const insertion = newEntry + ', ';
  content = content.slice(0, entryStart) + insertion + content.slice(entryStart);
  console.log(`Added to ${target.company}!`);
  changesMade++;
}

if (changesMade > 0) {
  fs.writeFileSync('./data.js', content, 'utf8');
  console.log(`\nDone! ${changesMade} insertion(s) made. File saved.`);
} else {
  console.log('\nNo changes needed.');
}

const fs = require('fs');

global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } }
  }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: global.localStorage
};
global.globalThis = global.window;

// Execute data.js in this environment
const dataCode = fs.readFileSync('./data.js', 'utf8');
eval(dataCode);

// Execute leetcode-numbers.js
const numCode = fs.readFileSync('./leetcode-numbers.js', 'utf8');
eval(numCode);

// Execute app.js in global scope
const vm = require('vm');
const context = vm.createContext({
  ...global,
  window: global.window,
  document: global.document,
  localStorage: global.localStorage,
  console: console,
  LEETCODE_DATA: global.window.LEETCODE_DATA,
  RAW_DATA: global.window.RAW_DATA,
  LEETCODE_NUM_MAP: global.window.LEETCODE_NUM_MAP
});

const appCode = fs.readFileSync('./app.js', 'utf8');
vm.runInContext(appCode, context);
vm.runInContext('initData()', context);

const companyList = context.companyList;
console.log('Total companies loaded:', companyList.length);

const tcsCompany = companyList.find(c => c.name.toLowerCase() === 'tcs');
console.log('TCS:', tcsCompany ? { name: tcsCompany.name, total: tcsCompany.total, e: tcsCompany.e } : 'NOT FOUND');
if (tcsCompany) {
  const prob = tcsCompany.problems.find(p => p.title === 'Check Divisibility by Digit Sum and Product');
  console.log('TCS question found in problems:', prob);
}

const infCompany = companyList.find(c => c.name.toLowerCase() === 'infosys');
console.log('Infosys:', infCompany ? { name: infCompany.name, total: infCompany.total, e: infCompany.e } : 'NOT FOUND');
if (infCompany) {
  const prob = infCompany.problems.find(p => p.title === 'Check Divisibility by Digit Sum and Product');
  console.log('Infosys question found in problems:', prob);
}

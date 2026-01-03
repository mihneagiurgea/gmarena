/**
 * Test loader - loads data.js for testing
 */
const fs = require('fs');
const path = require('path');

function loadData() {
  const dataFile = path.join(__dirname, '..', 'data.js');
  const code = fs.readFileSync(dataFile, 'utf8');

  // Wrap in a function that returns the exports
  const wrappedCode = `
    ${code}
    return { UNIT_DATA, CARD_DATA, DECK_DATA };
  `;

  const fn = new Function(wrappedCode);
  return fn();
}

module.exports = { loadData };

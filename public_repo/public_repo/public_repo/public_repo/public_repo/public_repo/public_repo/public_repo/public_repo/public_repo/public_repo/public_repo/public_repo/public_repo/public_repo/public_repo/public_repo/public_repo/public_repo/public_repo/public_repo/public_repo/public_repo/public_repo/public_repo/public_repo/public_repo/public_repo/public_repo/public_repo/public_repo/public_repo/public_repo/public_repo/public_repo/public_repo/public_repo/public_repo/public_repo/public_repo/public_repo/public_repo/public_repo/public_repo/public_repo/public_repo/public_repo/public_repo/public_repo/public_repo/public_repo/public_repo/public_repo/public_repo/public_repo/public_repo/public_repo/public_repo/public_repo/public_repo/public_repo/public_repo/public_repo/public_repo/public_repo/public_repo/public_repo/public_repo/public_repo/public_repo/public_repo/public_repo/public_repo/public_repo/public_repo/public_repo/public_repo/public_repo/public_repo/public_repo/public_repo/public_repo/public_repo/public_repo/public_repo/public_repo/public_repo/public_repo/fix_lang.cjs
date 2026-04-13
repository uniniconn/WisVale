const fs = require('fs');
const path = 'src/contexts/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

// Delete lines 1056 to 1480 (0-indexed: 1055 to 1479)
lines.splice(1055, 1480 - 1056 + 1);

// Delete lines 327 to 739 (0-indexed: 326 to 738)
lines.splice(326, 739 - 327 + 1);

fs.writeFileSync(path, lines.join('\n'));
console.log('Done');

const fs = require('fs');
const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf-8');

const zhMatch = content.match(/const zh: Record<string, string> = {([\s\S]*?)};\n\nconst en: Record<string, string> = {/);
const enMatch = content.match(/const en: Record<string, string> = {([\s\S]*?)};\n\nexport interface LanguageContextType/);

function findDups(str) {
  const keys = [];
  const dups = [];
  const regex = /'([^']+)':/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    if (keys.includes(match[1])) {
      dups.push(match[1]);
    } else {
      keys.push(match[1]);
    }
  }
  return dups;
}

console.log("ZH Dups:", findDups(zhMatch ? zhMatch[1] : ''));
console.log("EN Dups:", findDups(enMatch ? enMatch[1] : ''));

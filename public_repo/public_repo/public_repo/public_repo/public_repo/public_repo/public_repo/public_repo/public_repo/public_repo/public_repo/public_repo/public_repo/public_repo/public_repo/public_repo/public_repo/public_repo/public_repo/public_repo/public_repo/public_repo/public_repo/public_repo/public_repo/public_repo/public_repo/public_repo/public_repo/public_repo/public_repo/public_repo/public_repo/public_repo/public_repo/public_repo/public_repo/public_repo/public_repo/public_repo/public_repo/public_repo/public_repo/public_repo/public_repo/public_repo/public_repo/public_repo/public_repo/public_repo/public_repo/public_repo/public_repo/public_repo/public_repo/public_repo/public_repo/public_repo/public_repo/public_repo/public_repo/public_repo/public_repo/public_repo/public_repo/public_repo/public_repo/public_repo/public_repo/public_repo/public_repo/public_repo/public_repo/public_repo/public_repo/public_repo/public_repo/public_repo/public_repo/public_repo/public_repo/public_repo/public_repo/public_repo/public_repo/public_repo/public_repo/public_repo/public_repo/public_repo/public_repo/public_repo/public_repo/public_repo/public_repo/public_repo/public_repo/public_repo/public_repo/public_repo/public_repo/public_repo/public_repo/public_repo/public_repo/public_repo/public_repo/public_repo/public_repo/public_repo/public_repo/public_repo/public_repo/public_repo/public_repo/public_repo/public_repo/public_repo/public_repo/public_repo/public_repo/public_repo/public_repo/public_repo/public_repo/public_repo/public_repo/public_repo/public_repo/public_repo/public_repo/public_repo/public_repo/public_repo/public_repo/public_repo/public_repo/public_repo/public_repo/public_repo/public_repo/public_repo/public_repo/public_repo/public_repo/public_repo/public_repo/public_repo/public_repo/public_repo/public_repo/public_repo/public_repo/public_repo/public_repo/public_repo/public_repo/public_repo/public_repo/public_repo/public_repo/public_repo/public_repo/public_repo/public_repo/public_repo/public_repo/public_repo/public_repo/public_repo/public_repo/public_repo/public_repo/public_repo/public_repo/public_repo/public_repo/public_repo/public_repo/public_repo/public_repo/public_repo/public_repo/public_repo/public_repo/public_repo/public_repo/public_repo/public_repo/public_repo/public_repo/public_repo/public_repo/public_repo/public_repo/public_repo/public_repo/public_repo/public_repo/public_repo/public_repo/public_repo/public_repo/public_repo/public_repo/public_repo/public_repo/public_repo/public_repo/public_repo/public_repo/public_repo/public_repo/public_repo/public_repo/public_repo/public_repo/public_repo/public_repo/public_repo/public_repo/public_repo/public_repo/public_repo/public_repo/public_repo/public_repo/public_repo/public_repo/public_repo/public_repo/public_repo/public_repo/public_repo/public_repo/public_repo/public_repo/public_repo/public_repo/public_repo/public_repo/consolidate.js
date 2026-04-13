const fs = require('fs');
const content = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf8');

const translationsMatch = content.match(/const translations: Record<Language, Record<string, string>> = (\{[\s\S]*?\});/);
if (!translationsMatch) {
  console.error('Could not find translations object');
  process.exit(1);
}

// This is a bit risky but we can try to parse it
// Or better, use regex to extract keys and values for each language

const extractTranslations = (lang) => {
  const langRegex = new RegExp(`${lang}: \\{([\\s\\S]*?)\\n  \\},`, 'g');
  let match;
  const result = {};
  while ((match = langRegex.exec(content)) !== null) {
    const block = match[1];
    const entryRegex = /'([a-zA-Z0-9._-]+)':\s*'([\s\S]*?)',/g;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(block)) !== null) {
      result[entryMatch[1]] = entryMatch[2].replace(/\\'/g, "'");
    }
  }
  return result;
};

const zh = extractTranslations('zh');
const en = extractTranslations('en');

const formatObj = (obj) => {
  const keys = Object.keys(obj).sort();
  let str = '{\n';
  keys.forEach(key => {
    str += `      '${key}': '${obj[key].replace(/'/g, "\\'")}',\n`;
  });
  str += '    }';
  return str;
};

console.log('const translations: Record<Language, Record<string, string>> = {');
console.log('  zh: ' + formatObj(zh) + ',');
console.log('  en: ' + formatObj(en));
console.log('};');

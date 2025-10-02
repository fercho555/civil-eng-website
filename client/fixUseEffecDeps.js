const fs = require('fs');
const path = require('path');

const directoryPath = './src'; // Change this to your source folder

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to find useEffect with no or incomplete dependency arrays
  const useEffectRegex = /useEffect\(\s*\(([^\)]*)\)\s*,\s*\[([^\]]*)\]\s*\)/g;
  let match;
  let updated = false;

  while ((match = useEffectRegex.exec(content)) !== null) {
    const effectContent = match[1];
    const dependencies = match[2].split(',').map(dep => dep.trim());

    if (effectContent.includes('props.timeEnds') && !dependencies.includes('props.timeEnds')) {
      dependencies.push('props.timeEnds');
      const newDeps = dependencies.join(', ');
      const newUseEffect = `useEffect((${effectContent}), [${newDeps}])`;
      content = content.replace(match[0], newUseEffect);
      updated = true;
      console.log(`Updated useEffect dependency in ${filePath}`);
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  });
}

walkDir(directoryPath);
console.log('Dependency check and fix complete.');

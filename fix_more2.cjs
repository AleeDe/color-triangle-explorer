const fs = require('fs');
let text = fs.readFileSync('src/components/TriangleColorInterpolation.tsx', 'utf8');

text = text.replace(/style=\{\{ aspectRatio:[^\}]+\}\}/, 'style={{ touchAction: "none", aspectRatio: \\ / \\, minHeight: 300, maxHeight: 500 }}');

fs.writeFileSync('src/components/TriangleColorInterpolation.tsx', text);
console.log('done');
